/**
 * Test suite for user registration API endpoint
 * Tests user creation, validation, email sending, and error handling
 */

import { POST } from './route';
import { NextRequest } from 'next/server';
import { users, pendingVerifications } from '@/lib/stores/verification-store';

// Mock console.log to avoid output during tests
jest.mock('console', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

describe('/api/auth/register', () => {
  beforeEach(() => {
    // Clear all stores before each test
    users.clear();
    pendingVerifications.clear();
  });

  afterEach(() => {
    // Clean up after each test
    users.clear();
    pendingVerifications.clear();
  });

  describe('POST /api/auth/register', () => {
    it('should successfully register a new user', async () => {
      const requestBody = {
        email: 'test@example.com',
        password: 'password123'
      };

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toBe('Registration successful! Please check your email to verify your account.');
      expect(data.email).toBe('test@example.com');

      // Verify user was created in store
      expect(users.has('test@example.com')).toBe(true);
      const user = users.get('test@example.com');
      expect(user?.email).toBe('test@example.com');
      expect(user?.verified).toBe(false);
      expect(user?.passwordHash).toBeDefined();

      // Verify verification token was created
      expect(pendingVerifications.has('test@example.com')).toBe(true);
      const verification = pendingVerifications.get('test@example.com');
      expect(verification?.email).toBe('test@example.com');
      expect(verification?.token).toBeDefined();
      expect(verification?.expires).toBeDefined();
      expect(verification?.verified).toBe(false);
    });

    it('should reject registration with missing email', async () => {
      const requestBody = {
        password: 'password123'
      };

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
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
    });

    it('should reject registration with missing password', async () => {
      const requestBody = {
        email: 'test@example.com'
      };

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
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
    });

    it('should reject registration with invalid email format', async () => {
      const requestBody = {
        email: 'invalid-email',
        password: 'password123'
      };

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
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

    it('should reject registration with weak password', async () => {
      const requestBody = {
        email: 'test@example.com',
        password: 'weak'
      };

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('weak_password');
      expect(data.message).toBe('Password must be at least 8 characters long');
    });

    it('should reject registration with existing user', async () => {
      const email = 'existing@example.com';
      
      // Create existing user
      users.set(email, {
        email,
        passwordHash: 'existing-hash',
        verified: true,
        createdAt: new Date()
      });

      const requestBody = {
        email,
        password: 'password123'
      };

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('user_exists');
      expect(data.message).toBe('User already exists with this email');
    });

    it('should handle various email formats correctly', async () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user@subdomain.example.com',
        'user123@example123.com'
      ];

      for (const email of validEmails) {
        users.clear();
        pendingVerifications.clear();

        const requestBody = {
          email,
          password: 'password123'
        };

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await POST(request);
        expect(response.status).toBe(201);
        expect(users.has(email)).toBe(true);
      }
    });

    it('should reject various invalid email formats', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        'user..name@example.com',
        'user@example.',
        'user name@example.com',
        ''
      ];

      for (const email of invalidEmails) {
        const requestBody = {
          email,
          password: 'password123'
        };

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
        expect((await response.json()).error).toBe('invalid_email');
      }
    });

    it('should hash password securely', async () => {
      const requestBody = {
        email: 'test@example.com',
        password: 'password123'
      };

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const user = users.get('test@example.com');
      expect(user?.passwordHash).toBeDefined();
      expect(user?.passwordHash).not.toBe('password123');
      expect(user?.passwordHash.length).toBeGreaterThan(50); // bcrypt hash length
    });

    it('should generate unique verification tokens', async () => {
      const emails = ['test1@example.com', 'test2@example.com', 'test3@example.com'];
      const tokens = new Set();

      for (const email of emails) {
        const requestBody = {
          email,
          password: 'password123'
        };

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await POST(request);
        expect(response.status).toBe(201);

        const verification = pendingVerifications.get(email);
        expect(verification?.token).toBeDefined();
        expect(tokens.has(verification?.token)).toBe(false);
        tokens.add(verification?.token);
      }
    });

    it('should set proper expiration time for verification tokens', async () => {
      const beforeRequest = new Date();
      
      const requestBody = {
        email: 'test@example.com',
        password: 'password123'
      };

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const afterRequest = new Date();
      
      expect(response.status).toBe(201);

      const verification = pendingVerifications.get('test@example.com');
      expect(verification?.expires).toBeDefined();
      
      // Should expire in approximately 24 hours
      const expectedExpiry = new Date(beforeRequest.getTime() + (24 * 60 * 60 * 1000));
      const actualExpiry = verification?.expires;
      
      expect(actualExpiry!.getTime()).toBeGreaterThan(expectedExpiry.getTime() - 1000);
      expect(actualExpiry!.getTime()).toBeLessThan(expectedExpiry.getTime() + 1000);
    });

    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
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
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
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
    });
  });
}); 