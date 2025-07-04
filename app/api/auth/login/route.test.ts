/**
 * Test suite for user login API endpoint
 * Tests authentication flow, session management, and error handling
 */

import { POST } from './route';
import { NextRequest } from 'next/server';
import { users, sessions, pendingVerifications } from '@/lib/stores/verification-store';
import bcrypt from 'bcryptjs';

// Mock console.log to avoid output during tests
jest.mock('console', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

describe('/api/auth/login', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'password123',
    passwordHash: ''
  };

  beforeAll(async () => {
    // Pre-hash password for consistent testing
    testUser.passwordHash = await bcrypt.hash(testUser.password, 12);
  });

  beforeEach(() => {
    // Clear all stores before each test
    users.clear();
    sessions.clear();
    pendingVerifications.clear();

    // Create verified test user
    users.set(testUser.email, {
      email: testUser.email,
      passwordHash: testUser.passwordHash,
      verified: true,
      createdAt: new Date(),
    });
  });

  afterEach(() => {
    // Clean up after each test
    users.clear();
    sessions.clear();
    pendingVerifications.clear();
  });

  describe('POST /api/auth/login', () => {
    it('should successfully login with valid credentials', async () => {
      const requestBody = {
        email: testUser.email,
        password: testUser.password
      };

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Login successful');
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(testUser.email);
      expect(data.user.verified).toBe(true);

      // Check session was created
      expect(sessions.size).toBe(1);
      const sessionEntries = Array.from(sessions.entries());
      const [sessionToken, sessionData] = sessionEntries[0];
      expect(sessionData.email).toBe(testUser.email);
      expect(sessionData.userId).toBe(testUser.email);

      // Check session cookie was set
      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toContain('session=');
      expect(setCookieHeader).toContain('HttpOnly');
      expect(setCookieHeader).toContain('Path=/');
      expect(setCookieHeader).toContain('SameSite=lax');
    });

    it('should reject login with missing email', async () => {
      const requestBody = {
        password: testUser.password
      };

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
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
      expect(data.message).toBe('Email and password are required');
      expect(sessions.size).toBe(0);
    });

    it('should reject login with missing password', async () => {
      const requestBody = {
        email: testUser.email
      };

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
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
      expect(data.message).toBe('Email and password are required');
      expect(sessions.size).toBe(0);
    });

    it('should reject login with invalid email format', async () => {
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
        const requestBody = {
          email: invalidEmail,
          password: testUser.password
        };

        const request = new NextRequest('http://localhost:3000/api/auth/login', {
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
        expect(sessions.size).toBe(0);
      }
    });

    it('should reject login for non-existent user', async () => {
      const requestBody = {
        email: 'nonexistent@example.com',
        password: testUser.password
      };

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('user_not_found');
      expect(data.message).toBe('No account found with this email address');
      expect(sessions.size).toBe(0);
    });

    it('should reject login for unverified user', async () => {
      // Create unverified user
      users.set('unverified@example.com', {
        email: 'unverified@example.com',
        passwordHash: testUser.passwordHash,
        verified: false,
        createdAt: new Date(),
      });

      const requestBody = {
        email: 'unverified@example.com',
        password: testUser.password
      };

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('email_not_verified');
      expect(data.message).toBe('Please verify your email address before logging in');
      expect(sessions.size).toBe(0);
    });

    it('should reject login with invalid password', async () => {
      const requestBody = {
        email: testUser.email,
        password: 'wrongpassword'
      };

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('invalid_credentials');
      expect(data.message).toBe('Invalid email or password');
      expect(sessions.size).toBe(0);
    });

    it('should generate unique session tokens for multiple logins', async () => {
      const requestBody = {
        email: testUser.email,
        password: testUser.password
      };

      const sessionTokens = new Set();

      // Login multiple times
      for (let i = 0; i < 3; i++) {
        const request = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await POST(request);
        expect(response.status).toBe(200);

        // Extract session token from cookie
        const setCookieHeader = response.headers.get('set-cookie');
        const sessionMatch = setCookieHeader?.match(/session=([^;]+)/);
        const sessionToken = sessionMatch?.[1];

        expect(sessionToken).toBeDefined();
        expect(sessionTokens.has(sessionToken)).toBe(false);
        sessionTokens.add(sessionToken);
      }

      expect(sessionTokens.size).toBe(3);
      expect(sessions.size).toBe(3);
    });

    it('should set proper session expiration time', async () => {
      const beforeLogin = new Date();

      const requestBody = {
        email: testUser.email,
        password: testUser.password
      };

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const afterLogin = new Date();

      expect(response.status).toBe(200);

      const sessionEntries = Array.from(sessions.entries());
      const [sessionToken, sessionData] = sessionEntries[0];

      // Should expire in approximately 24 hours
      const expectedExpiry = new Date(beforeLogin.getTime() + (24 * 60 * 60 * 1000));
      expect(sessionData.expires.getTime()).toBeGreaterThan(expectedExpiry.getTime() - 1000);
      expect(sessionData.expires.getTime()).toBeLessThan(expectedExpiry.getTime() + 1000);
    });

    it('should return proper user data on successful login', async () => {
      const requestBody = {
        email: testUser.email,
        password: testUser.password
      };

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toEqual({
        email: testUser.email,
        verified: true,
        createdAt: expect.any(String) // Date gets serialized to string
      });

      // Should not return sensitive data
      expect(data.user.passwordHash).toBeUndefined();
    });

    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
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
      expect(sessions.size).toBe(0);
    });

    it('should handle empty request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
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
      expect(data.message).toBe('Email and password are required');
      expect(sessions.size).toBe(0);
    });

    it('should set secure cookie in production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      
      // Mock the environment variable
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true,
      });

      const requestBody = {
        email: testUser.email,
        password: testUser.password
      };

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toContain('Secure');

      // Restore original environment
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
        configurable: true,
      });
    });
  });
}); 