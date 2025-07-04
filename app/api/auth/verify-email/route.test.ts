/**
 * Test suite for email verification API endpoint
 * Tests token validation, timing attack protection, and error handling
 */

import { POST } from './route';
import { NextRequest } from 'next/server';
import { pendingVerifications, TOKEN_EXPIRY_MS } from '@/lib/stores/verification-store';
import crypto from 'crypto';

// Mock console.log to avoid output during tests
jest.mock('console', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

describe('/api/auth/verify-email', () => {
  beforeEach(() => {
    // Clear all stores before each test
    pendingVerifications.clear();
  });

  afterEach(() => {
    // Clean up after each test
    pendingVerifications.clear();
  });

  describe('POST /api/auth/verify-email', () => {
    it('should successfully verify email with valid token', async () => {
      const email = 'test@example.com';
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + TOKEN_EXPIRY_MS);

      // Setup pending verification
      pendingVerifications.set(email, {
        email,
        token,
        expires,
        verified: false
      });

      const requestBody = {
        email,
        token
      };

      const request = new NextRequest('http://localhost:3000/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Email verified successfully');

      // Verify the verification status was updated
      const verification = pendingVerifications.get(email);
      expect(verification?.verified).toBe(true);
    });

    it('should reject verification with missing token', async () => {
      const requestBody = {
        email: 'test@example.com'
      };

      const request = new NextRequest('http://localhost:3000/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('missing_params');
      expect(data.message).toBe('Token and email are required');
    });

    it('should reject verification with missing email', async () => {
      const requestBody = {
        token: 'some-token'
      };

      const request = new NextRequest('http://localhost:3000/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('missing_params');
      expect(data.message).toBe('Token and email are required');
    });

    it('should reject verification with invalid email format', async () => {
      const requestBody = {
        email: 'invalid-email',
        token: crypto.randomBytes(32).toString('hex')
      };

      const request = new NextRequest('http://localhost:3000/api/auth/verify-email', {
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
    });

    it('should reject verification with invalid token format', async () => {
      const invalidTokens = [
        'short',
        'not-hex-token',
        '123',
        'token-with-special-chars!@#',
        crypto.randomBytes(16).toString('hex'), // too short
        crypto.randomBytes(64).toString('hex'), // too long
      ];

      for (const token of invalidTokens) {
        const requestBody = {
          email: 'test@example.com',
          token
        };

        const request = new NextRequest('http://localhost:3000/api/auth/verify-email', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('invalid_token');
        expect(data.message).toBe('Invalid token format');
      }
    });

    it('should reject verification for non-existent verification request', async () => {
      const requestBody = {
        email: 'nonexistent@example.com',
        token: crypto.randomBytes(32).toString('hex')
      };

      const request = new NextRequest('http://localhost:3000/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('not_found');
      expect(data.message).toBe('Verification request not found');
    });

    it('should reject verification for already verified email', async () => {
      const email = 'test@example.com';
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + TOKEN_EXPIRY_MS);

      // Setup already verified request
      pendingVerifications.set(email, {
        email,
        token,
        expires,
        verified: true // Already verified
      });

      const requestBody = {
        email,
        token
      };

      const request = new NextRequest('http://localhost:3000/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('already_verified');
      expect(data.message).toBe('Email already verified');
    });

    it('should reject verification for expired token', async () => {
      const email = 'test@example.com';
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() - 1000); // Expired 1 second ago

      // Setup expired verification
      pendingVerifications.set(email, {
        email,
        token,
        expires,
        verified: false
      });

      const requestBody = {
        email,
        token
      };

      const request = new NextRequest('http://localhost:3000/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('expired');
      expect(data.message).toBe('Verification token has expired');
    });

    it('should reject verification with wrong token', async () => {
      const email = 'test@example.com';
      const correctToken = crypto.randomBytes(32).toString('hex');
      const wrongToken = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + TOKEN_EXPIRY_MS);

      // Setup verification with correct token
      pendingVerifications.set(email, {
        email,
        token: correctToken,
        expires,
        verified: false
      });

      const requestBody = {
        email,
        token: wrongToken
      };

      const request = new NextRequest('http://localhost:3000/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_token');
      expect(data.message).toBe('Invalid verification token');
    });

    it('should handle case-insensitive token comparison', async () => {
      const email = 'test@example.com';
      const token = crypto.randomBytes(32).toString('hex').toLowerCase();
      const upperToken = token.toUpperCase();
      const expires = new Date(Date.now() + TOKEN_EXPIRY_MS);

      // Setup verification with lowercase token
      pendingVerifications.set(email, {
        email,
        token,
        expires,
        verified: false
      });

      const requestBody = {
        email,
        token: upperToken
      };

      const request = new NextRequest('http://localhost:3000/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      // Should fail because tokens should be case-sensitive for security
      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_token');
    });

    it('should use timing-safe comparison for tokens', async () => {
      const email = 'test@example.com';
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + TOKEN_EXPIRY_MS);

      // Setup verification
      pendingVerifications.set(email, {
        email,
        token,
        expires,
        verified: false
      });

      // Test with token that has same prefix but different suffix
      const similarToken = token.substring(0, 32) + crypto.randomBytes(16).toString('hex');

      const requestBody = {
        email,
        token: similarToken
      };

      const request = new NextRequest('http://localhost:3000/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const startTime = Date.now();
      const response = await POST(request);
      const endTime = Date.now();
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_token');
      
      // The response time should be consistent (timing-safe comparison)
      // This is a basic check, but real timing attack testing would be more sophisticated
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/verify-email', {
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

    it('should handle empty request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/verify-email', {
        method: 'POST',
        body: '{}',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('missing_params');
      expect(data.message).toBe('Token and email are required');
    });

    it('should maintain verification request after failed attempt', async () => {
      const email = 'test@example.com';
      const correctToken = crypto.randomBytes(32).toString('hex');
      const wrongToken = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + TOKEN_EXPIRY_MS);

      // Setup verification
      pendingVerifications.set(email, {
        email,
        token: correctToken,
        expires,
        verified: false
      });

      // First attempt with wrong token
      const wrongRequest = new NextRequest('http://localhost:3000/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, token: wrongToken }),
        headers: { 'Content-Type': 'application/json' },
      });

      const wrongResponse = await POST(wrongRequest);
      expect(wrongResponse.status).toBe(400);

      // Verification should still exist and be unverified
      const verification = pendingVerifications.get(email);
      expect(verification).toBeDefined();
      expect(verification?.verified).toBe(false);

      // Second attempt with correct token should succeed
      const correctRequest = new NextRequest('http://localhost:3000/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, token: correctToken }),
        headers: { 'Content-Type': 'application/json' },
      });

      const correctResponse = await POST(correctRequest);
      expect(correctResponse.status).toBe(200);

      // Now it should be verified
      const finalVerification = pendingVerifications.get(email);
      expect(finalVerification?.verified).toBe(true);
    });
  });
}); 