/**
 * Test suite for user logout API endpoint
 * Tests session cleanup, cookie clearing, and error handling
 */

import { POST, GET } from './route';
import { NextRequest } from 'next/server';
import { sessions } from '@/lib/stores/verification-store';

// Mock console.log to avoid output during tests
jest.mock('console', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

describe('/api/auth/logout', () => {
  const testSession = {
    token: 'test-session-token-123',
    userId: 'user123',
    email: 'test@example.com',
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  };

  beforeEach(() => {
    // Clear all stores before each test
    sessions.clear();
  });

  afterEach(() => {
    // Clean up after each test
    sessions.clear();
  });

  describe('POST /api/auth/logout', () => {
    it('should successfully logout with valid session', async () => {
      // Setup active session
      sessions.set(testSession.token, {
        userId: testSession.userId,
        email: testSession.email,
        expires: testSession.expires,
        createdAt: testSession.createdAt,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Cookie': `session=${testSession.token}`,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Logout successful');

      // Session should be removed from server store
      expect(sessions.has(testSession.token)).toBe(false);
      expect(sessions.size).toBe(0);

      // Cookie should be cleared
      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toContain('session=;');
      expect(setCookieHeader).toContain('Max-Age=0');
      expect(setCookieHeader).toContain('HttpOnly');
      expect(setCookieHeader).toContain('Path=/');
    });

    it('should successfully logout without session cookie', async () => {
      // No session in store, no cookie in request
      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Logout successful');

      // Cookie should still be cleared
      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toContain('session=;');
      expect(setCookieHeader).toContain('Max-Age=0');
    });

    it('should successfully logout with invalid session token', async () => {
      // Setup different session
      sessions.set('valid-token', {
        userId: testSession.userId,
        email: testSession.email,
        expires: testSession.expires,
        createdAt: testSession.createdAt,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Cookie': 'session=invalid-token-123',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Logout successful');

      // Valid session should remain (only the provided token is deleted)
      expect(sessions.has('valid-token')).toBe(true);
      expect(sessions.has('invalid-token-123')).toBe(false);

      // Cookie should still be cleared
      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toContain('session=;');
      expect(setCookieHeader).toContain('Max-Age=0');
    });

    it('should handle multiple session cleanup', async () => {
      // Setup multiple sessions for same user
      sessions.set('session1', {
        userId: testSession.userId,
        email: testSession.email,
        expires: testSession.expires,
        createdAt: testSession.createdAt,
      });
      sessions.set('session2', {
        userId: testSession.userId,
        email: testSession.email,
        expires: testSession.expires,
        createdAt: testSession.createdAt,
      });
      sessions.set('session3', {
        userId: 'different-user',
        email: 'other@example.com',
        expires: testSession.expires,
        createdAt: testSession.createdAt,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Cookie': 'session=session1',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Only the specific session should be removed
      expect(sessions.has('session1')).toBe(false);
      expect(sessions.has('session2')).toBe(true);
      expect(sessions.has('session3')).toBe(true);
      expect(sessions.size).toBe(2);
    });

    it('should clear session cookie with correct attributes', async () => {
      sessions.set(testSession.token, {
        userId: testSession.userId,
        email: testSession.email,
        expires: testSession.expires,
        createdAt: testSession.createdAt,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Cookie': `session=${testSession.token}`,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toContain('session=;');
      expect(setCookieHeader).toContain('HttpOnly');
      expect(setCookieHeader).toContain('SameSite=lax');
      expect(setCookieHeader).toContain('Path=/');
      expect(setCookieHeader).toContain('Max-Age=0');
    });

    it('should set secure cookie in production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      
      // Mock the environment variable
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true,
      });

      sessions.set(testSession.token, {
        userId: testSession.userId,
        email: testSession.email,
        expires: testSession.expires,
        createdAt: testSession.createdAt,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Cookie': `session=${testSession.token}`,
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

    it('should handle malformed cookie gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Cookie': 'malformed-cookie-data',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Logout successful');

      // Cookie should still be cleared
      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toContain('session=;');
    });

    it('should handle errors gracefully during session cleanup', async () => {
      // Mock sessions.delete to throw an error
      const originalDelete = sessions.delete;
      sessions.delete = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      sessions.set(testSession.token, {
        userId: testSession.userId,
        email: testSession.email,
        expires: testSession.expires,
        createdAt: testSession.createdAt,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Cookie': `session=${testSession.token}`,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('server_error');
      expect(data.message).toBe('Internal server error');

      // Restore original method
      sessions.delete = originalDelete;
    });

    it('should handle empty session cookie value', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Cookie': 'session=',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Logout successful');

      // Cookie should still be cleared
      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toContain('session=;');
    });
  });

  describe('GET /api/auth/logout', () => {
    it('should support GET method for logout links', async () => {
      sessions.set(testSession.token, {
        userId: testSession.userId,
        email: testSession.email,
        expires: testSession.expires,
        createdAt: testSession.createdAt,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'GET',
        headers: {
          'Cookie': `session=${testSession.token}`,
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Logout successful');

      // Session should be removed
      expect(sessions.has(testSession.token)).toBe(false);

      // Cookie should be cleared
      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toContain('session=;');
      expect(setCookieHeader).toContain('Max-Age=0');
    });

    it('should handle GET logout without session', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Logout successful');

      // Cookie should still be cleared
      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toContain('session=;');
    });
  });

  describe('Logout Integration', () => {
    it('should properly clean up session data for logout flow', async () => {
      // Simulate complete logout flow
      const sessionData = {
        userId: testSession.userId,
        email: testSession.email,
        expires: testSession.expires,
        createdAt: testSession.createdAt,
      };

      sessions.set(testSession.token, sessionData);

      // Verify session exists
      expect(sessions.get(testSession.token)).toEqual(sessionData);

      // Logout
      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Cookie': `session=${testSession.token}`,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Verify complete cleanup
      expect(sessions.get(testSession.token)).toBeUndefined();
      expect(sessions.size).toBe(0);

      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toMatch(/session=;\s*.*Max-Age=0/);
    });

    it('should maintain session isolation between users', async () => {
      // Setup sessions for multiple users
      sessions.set('user1-session', {
        userId: 'user1',
        email: 'user1@example.com',
        expires: testSession.expires,
        createdAt: testSession.createdAt,
      });

      sessions.set('user2-session', {
        userId: 'user2',
        email: 'user2@example.com',
        expires: testSession.expires,
        createdAt: testSession.createdAt,
      });

      // User 1 logs out
      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Cookie': 'session=user1-session',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Only user1's session should be removed
      expect(sessions.has('user1-session')).toBe(false);
      expect(sessions.has('user2-session')).toBe(true);
      expect(sessions.size).toBe(1);
    });
  });
}); 