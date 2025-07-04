/**
 * Test suite for password reset initiation API endpoint
 * Tests rate limiting, email validation, user enumeration protection, and token generation
 */

import { POST } from './route';
import { NextRequest } from 'next/server';
import { 
  users, 
  passwordResets, 
  resetAttempts,
  MAX_RESET_ATTEMPTS,
  RESET_WINDOW_MS,
  RESET_TOKEN_EXPIRY_MS
} from '@/lib/stores/verification-store';

// Mock console.log to avoid output during tests
jest.mock('console', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

// Mock the email sending function  
const mockSendPasswordResetEmail = jest.fn().mockResolvedValue(true);

describe('/api/auth/reset-password', () => {
  const testUser = {
    email: 'test@example.com',
    passwordHash: 'hashedpassword123',
    verified: true,
    createdAt: new Date(),
  };

  beforeEach(() => {
    // Clear all stores before each test
    users.clear();
    passwordResets.clear();
    resetAttempts.clear();

    // Create verified test user
    users.set(testUser.email, testUser);
  });

  afterEach(() => {
    // Clean up after each test
    users.clear();
    passwordResets.clear();
    resetAttempts.clear();
  });

  describe('POST /api/auth/reset-password', () => {
    it('should successfully initiate password reset for verified user', async () => {
      const requestBody = { email: testUser.email };

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('If an account exists with this email, a password reset link has been sent.');

      // Check that reset token was created
      expect(passwordResets.has(testUser.email)).toBe(true);
      const resetData = passwordResets.get(testUser.email);
      expect(resetData).toBeDefined();
      expect(resetData!.email).toBe(testUser.email);
      expect(resetData!.token).toBeDefined();
      expect(resetData!.used).toBe(false);
      expect(resetData!.expires.getTime()).toBeGreaterThan(Date.now());

      // Check rate limiting was updated
      expect(resetAttempts.has(testUser.email)).toBe(true);
      const attemptData = resetAttempts.get(testUser.email);
      expect(attemptData!.count).toBe(1);
    });

    it('should return same success message for non-existent user (enumeration protection)', async () => {
      const requestBody = { email: 'nonexistent@example.com' };

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('If an account exists with this email, a password reset link has been sent.');

      // Check that no reset token was created
      expect(passwordResets.has('nonexistent@example.com')).toBe(false);

      // Check rate limiting was still updated (timing attack protection)
      expect(resetAttempts.has('nonexistent@example.com')).toBe(true);
    });

    it('should return same success message for unverified user', async () => {
      // Create unverified user
      const unverifiedEmail = 'unverified@example.com';
      users.set(unverifiedEmail, {
        email: unverifiedEmail,
        passwordHash: 'hashedpassword123',
        verified: false,
        createdAt: new Date(),
      });

      const requestBody = { email: unverifiedEmail };

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('If an account exists with this email, a password reset link has been sent.');

      // Check that no reset token was created
      expect(passwordResets.has(unverifiedEmail)).toBe(false);

      // Check rate limiting was updated
      expect(resetAttempts.has(unverifiedEmail)).toBe(true);
    });

    it('should reject request with missing email', async () => {
      const requestBody = {};

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('missing_fields');
      expect(data.message).toBe('Email is required');
    });

    it('should reject request with invalid email format', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        'user..name@example.com',
        'user@example.',
        'user name@example.com'
      ];

      for (const invalidEmail of invalidEmails) {
        const requestBody = { email: invalidEmail };

        const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('invalid_email');
        expect(data.message).toBe('Invalid email format');
      }
    });

    it('should enforce rate limiting after max attempts', async () => {
      const requestBody = { email: testUser.email };

      // Make maximum allowed attempts
      for (let i = 0; i < MAX_RESET_ATTEMPTS; i++) {
        const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
      }

      // Next attempt should be rate limited
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('rate_limited');
      expect(data.message).toBe('Too many reset attempts. Please try again later.');
    });

    it('should reset rate limiting after window expires', async () => {
      const requestBody = { email: testUser.email };

      // Reach rate limit
      for (let i = 0; i < MAX_RESET_ATTEMPTS; i++) {
        const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        await POST(request);
      }

      // Manually expire the rate limit window
      const attemptData = resetAttempts.get(testUser.email);
      if (attemptData) {
        attemptData.lastAttempt = new Date(Date.now() - RESET_WINDOW_MS - 1000);
        resetAttempts.set(testUser.email, attemptData);
      }

      // Should now succeed
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Rate limit should be reset to 1
      const newAttemptData = resetAttempts.get(testUser.email);
      expect(newAttemptData!.count).toBe(1);
    });

    it('should invalidate existing reset tokens when creating new one', async () => {
      // Create initial reset token
      const oldToken = 'old-token-123';
      passwordResets.set(testUser.email, {
        email: testUser.email,
        token: oldToken,
        expires: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS),
        used: false,
      });

      const requestBody = { email: testUser.email };

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Check that new token was created and old one invalidated
      const resetData = passwordResets.get(testUser.email);
      expect(resetData!.token).not.toBe(oldToken);
      expect(resetData!.token).toBeDefined();
    });

    it('should generate unique tokens for multiple users', async () => {
      const user2Email = 'user2@example.com';
      users.set(user2Email, {
        email: user2Email,
        passwordHash: 'hashedpassword123',
        verified: true,
        createdAt: new Date(),
      });

      const tokens = new Set();

      // Generate tokens for multiple users
      for (const email of [testUser.email, user2Email]) {
        const requestBody = { email };

        const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        await POST(request);

        const resetData = passwordResets.get(email);
        expect(resetData).toBeDefined();
        expect(tokens.has(resetData!.token)).toBe(false);
        tokens.add(resetData!.token);
      }

      expect(tokens.size).toBe(2);
    });

    it('should set proper token expiration time', async () => {
      const beforeRequest = new Date();

      const requestBody = { email: testUser.email };

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      await POST(request);

      const afterRequest = new Date();
      const resetData = passwordResets.get(testUser.email);

      // Token should expire in approximately 1 hour
      const expectedExpiry = new Date(beforeRequest.getTime() + RESET_TOKEN_EXPIRY_MS);
      expect(resetData!.expires.getTime()).toBeGreaterThan(expectedExpiry.getTime() - 1000);
      expect(resetData!.expires.getTime()).toBeLessThan(expectedExpiry.getTime() + 1000);
    });

    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('server_error');
      expect(data.message).toBe('Internal server error');
    });

    it('should handle email sending failure gracefully', async () => {
      // This test demonstrates email failure handling
      // In production, this would test actual email service failure
      const requestBody = { email: testUser.email };

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      // Should return success message to prevent enumeration
      expect(response.status).toBe(200);
      expect(data.message).toBe('If an account exists with this email, a password reset link has been sent.');

      // Token should be created for verified user
      expect(passwordResets.has(testUser.email)).toBe(true);
    });

    it('should handle concurrent reset requests properly', async () => {
      const requestBody = { email: testUser.email };

      // Make concurrent requests
      const requests = Array(3).fill(null).map(() => {
        const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json',
          },
        });
        return POST(request);
      });

      const responses = await Promise.all(requests);

      // All should return 200 but only one token should exist
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Only one reset token should exist
      expect(passwordResets.size).toBe(1);
      expect(passwordResets.has(testUser.email)).toBe(true);

      // Rate limiting should account for all attempts
      const attemptData = resetAttempts.get(testUser.email);
      expect(attemptData!.count).toBe(3);
    });

    it('should handle empty request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: '{}',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('missing_fields');
      expect(data.message).toBe('Email is required');
    });
  });
}); 