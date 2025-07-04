/**
 * Test suite for resend verification API endpoint
 * Tests rate limiting, email sending, and error handling
 */

import { POST } from './route';
import { NextRequest } from 'next/server';
import { 
  pendingVerifications, 
  resendAttempts, 
  TOKEN_EXPIRY_MS, 
  MAX_RESEND_ATTEMPTS, 
  RESEND_WINDOW_MS 
} from '@/lib/stores/verification-store';
import crypto from 'crypto';

// Mock console.log to avoid output during tests
jest.mock('console', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

describe('/api/auth/resend-verification', () => {
  beforeEach(() => {
    // Clear all stores before each test
    pendingVerifications.clear();
    resendAttempts.clear();
  });

  afterEach(() => {
    // Clean up after each test
    pendingVerifications.clear();
    resendAttempts.clear();
  });

  describe('POST /api/auth/resend-verification', () => {
    it('should successfully resend verification email', async () => {
      const email = 'test@example.com';
      const requestBody = { email };

      const request = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Verification email sent successfully');

      // Verify verification was created
      expect(pendingVerifications.has(email)).toBe(true);
      const verification = pendingVerifications.get(email);
      expect(verification?.email).toBe(email);
      expect(verification?.token).toBeDefined();
      expect(verification?.expires).toBeDefined();
      expect(verification?.verified).toBe(false);

      // Verify rate limiting counter was incremented
      expect(resendAttempts.has(email)).toBe(true);
      const attempts = resendAttempts.get(email);
      expect(attempts?.count).toBe(1);
      expect(attempts?.lastAttempt).toBeDefined();
    });

    it('should reject resend with missing email', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('missing_email');
      expect(data.message).toBe('Email is required');
    });

    it('should reject resend with empty email', async () => {
      const requestBody = { email: '' };

      const request = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('missing_email');
      expect(data.message).toBe('Email is required');
    });

    it('should reject resend with invalid email format', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        'user..name@example.com',
        'user@example.',
        'user name@example.com'
      ];

      for (const email of invalidEmails) {
        const requestBody = { email };

        const request = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
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

    it('should enforce rate limiting', async () => {
      const email = 'test@example.com';
      const requestBody = { email };

      // Make maximum allowed attempts
      for (let i = 0; i < MAX_RESEND_ATTEMPTS; i++) {
        const request = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
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
      const request = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
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
      expect(data.message).toBe('Too many resend attempts. Please try again later.');
    });

    it('should reset rate limiting after window expires', async () => {
      const email = 'test@example.com';
      const requestBody = { email };

      // Set up rate limiting with expired timestamp
      const expiredTime = new Date(Date.now() - RESEND_WINDOW_MS - 1000);
      resendAttempts.set(email, {
        count: MAX_RESEND_ATTEMPTS,
        lastAttempt: expiredTime
      });

      const request = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Verification email sent successfully');

      // Rate limiting should be reset
      const attempts = resendAttempts.get(email);
      expect(attempts?.count).toBe(1);
    });

    it('should reject resend for already verified email', async () => {
      const email = 'test@example.com';
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + TOKEN_EXPIRY_MS);

      // Setup already verified request
      pendingVerifications.set(email, {
        email,
        token,
        expires,
        verified: true
      });

      const requestBody = { email };

      const request = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
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
      expect(data.message).toBe('Email is already verified');
    });

    it('should replace existing unverified verification', async () => {
      const email = 'test@example.com';
      const oldToken = crypto.randomBytes(32).toString('hex');
      const oldExpires = new Date(Date.now() + TOKEN_EXPIRY_MS);

      // Setup existing unverified request
      pendingVerifications.set(email, {
        email,
        token: oldToken,
        expires: oldExpires,
        verified: false
      });

      // Add small delay to ensure new expiration time is later
      await new Promise(resolve => setTimeout(resolve, 10));

      const requestBody = { email };

      const request = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Verification email sent successfully');

      // Verify new token was generated
      const verification = pendingVerifications.get(email);
      expect(verification?.token).toBeDefined();
      expect(verification?.token).not.toBe(oldToken);
      expect(verification?.expires.getTime()).toBeGreaterThan(oldExpires.getTime());
    });

    it('should generate unique tokens for each resend', async () => {
      const email = 'test@example.com';
      const requestBody = { email };
      const tokens = new Set();

      // Make multiple resend requests
      for (let i = 0; i < MAX_RESEND_ATTEMPTS; i++) {
        const request = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await POST(request);
        expect(response.status).toBe(200);

        const verification = pendingVerifications.get(email);
        expect(verification?.token).toBeDefined();
        expect(tokens.has(verification?.token)).toBe(false);
        tokens.add(verification?.token);
      }

      expect(tokens.size).toBe(MAX_RESEND_ATTEMPTS);
    });

    it('should set proper expiration time for new tokens', async () => {
      const email = 'test@example.com';
      const beforeRequest = new Date();
      
      const requestBody = { email };

      const request = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const afterRequest = new Date();
      
      expect(response.status).toBe(200);

      const verification = pendingVerifications.get(email);
      expect(verification?.expires).toBeDefined();
      
      // Should expire in approximately 24 hours
      const expectedExpiry = new Date(beforeRequest.getTime() + TOKEN_EXPIRY_MS);
      const actualExpiry = verification?.expires;
      
      expect(actualExpiry!.getTime()).toBeGreaterThan(expectedExpiry.getTime() - 1000);
      expect(actualExpiry!.getTime()).toBeLessThan(expectedExpiry.getTime() + 1000);
    });

    it('should handle rate limiting per email address', async () => {
      const email1 = 'test1@example.com';
      const email2 = 'test2@example.com';

      // Max out attempts for email1
      for (let i = 0; i < MAX_RESEND_ATTEMPTS; i++) {
        const request = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
          method: 'POST',
          body: JSON.stringify({ email: email1 }),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
      }

      // email1 should be rate limited
      const request1 = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: email1 }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response1 = await POST(request1);
      expect(response1.status).toBe(429);

      // email2 should still work
      const request2 = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: email2 }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response2 = await POST(request2);
      expect(response2.status).toBe(200);
    });

    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
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
      const request = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
        method: 'POST',
        body: '{}',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('missing_email');
      expect(data.message).toBe('Email is required');
    });

    it('should increment attempt counter correctly', async () => {
      const email = 'test@example.com';
      const requestBody = { email };

      // Make multiple requests and verify counter increments
      for (let i = 1; i <= MAX_RESEND_ATTEMPTS; i++) {
        const request = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await POST(request);
        expect(response.status).toBe(200);

        const attempts = resendAttempts.get(email);
        expect(attempts?.count).toBe(i);
      }
    });

    it('should handle various valid email formats', async () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user@subdomain.example.com',
        'user123@example123.com',
        'user_name@example.com',
        'user-name@example.com'
      ];

      for (const email of validEmails) {
        pendingVerifications.clear();
        resendAttempts.clear();

        const requestBody = { email };

        const request = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
        expect(pendingVerifications.has(email)).toBe(true);
      }
    });

    it('should preserve rate limiting state across requests', async () => {
      const email = 'test@example.com';
      const requestBody = { email };

      // Make first request
      const request1 = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response1 = await POST(request1);
      expect(response1.status).toBe(200);

      // Verify counter is 1
      expect(resendAttempts.get(email)?.count).toBe(1);

      // Make second request
      const request2 = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response2 = await POST(request2);
      expect(response2.status).toBe(200);

      // Verify counter is now 2
      expect(resendAttempts.get(email)?.count).toBe(2);
    });
  });
}); 