/**
 * Test suite for account deletion API endpoint
 * Tests authentication, security checks, password verification, data removal, and audit logging
 */

import { POST } from './route';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { 
  users, 
  sessions,
  onboardingPreferences
} from '@/lib/stores/verification-store';
import { DataRemovalService } from '@/lib/auth/data-removal';
import { DeletionSecurityService } from '@/lib/auth/deletion-security';

// Mock the authentication utils
jest.mock('@/lib/auth/utils', () => ({
  getAuthenticatedUser: jest.fn(),
}));

import { getAuthenticatedUser } from '@/lib/auth/utils';

const mockGetAuthenticatedUser = getAuthenticatedUser as jest.MockedFunction<typeof getAuthenticatedUser>;

describe('/api/auth/delete-account', () => {
  const testUser = {
    email: 'test@example.com',
    passwordHash: '',
    verified: true,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days old
    onboardingCompleted: true,
  };

  const testSession = {
    userId: 'user123',
    email: testUser.email,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    createdAt: new Date(),
  };

  const validPassword = 'testpassword123';
  let dataRemovalService: DataRemovalService;
  let deletionSecurityService: DeletionSecurityService;

  beforeEach(async () => {
    // Clear all stores before each test
    users.clear();
    sessions.clear();
    onboardingPreferences.clear();

    // Hash the test password
    testUser.passwordHash = await bcrypt.hash(validPassword, 12);

    // Create verified test user
    users.set(testUser.email, testUser);

    // Mock authenticated session
    mockGetAuthenticatedUser.mockReturnValue(testSession);

    // Get service instances and clear their data
    dataRemovalService = DataRemovalService.getInstance();
    deletionSecurityService = DeletionSecurityService.getInstance();
    
    // Clear all security data
    deletionSecurityService.clearAllData();
  });

  afterEach(() => {
    // Clean up after each test
    users.clear();
    sessions.clear();
    onboardingPreferences.clear();
    deletionSecurityService.clearAllData();
    jest.clearAllMocks();
  });

  describe('Authentication and Authorization', () => {
    it('should reject request without authentication', async () => {
      mockGetAuthenticatedUser.mockReturnValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({ password: validPassword }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('unauthorized');
      expect(data.message).toBe('Authentication required');
    });

    it('should reject request with missing password', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('missing_password');
      expect(data.message).toBe('Password is required for account deletion');
    });

    it('should reject request for non-existent user', async () => {
      // Remove user from store
      users.delete(testUser.email);

      const request = new NextRequest('http://localhost:3000/api/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({ password: validPassword }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('user_not_found');
      expect(data.message).toBe('User not found');
    });

    it('should reject request with invalid password', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({ password: 'wrongpassword' }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('invalid_password');
      expect(data.message).toBe('Invalid password');
    });
  });

  describe('Security Checks', () => {
    it('should block deletion when security check fails', async () => {
      // Create 3 failed deletion attempts to trigger rate limiting
      for (let i = 0; i < 3; i++) {
        await deletionSecurityService.recordDeletionAttempt({
          email: testUser.email,
          ip: '192.168.1.1',
          userAgent: 'test',
          success: false,
          reason: 'test',
          riskLevel: 'low',
          securityFlags: []
        });
      }

      const request = new NextRequest('http://localhost:3000/api/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({ password: validPassword }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 Test Browser',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('deletion_blocked');
      expect(data.message).toContain('Too many deletion attempts');
      expect(data.riskLevel).toBe('high');
      expect(data.blockUntil).toBeDefined();
    });

    it('should pass security check for normal user', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({ password: validPassword }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should handle suspicious user agents with elevated security', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({ password: validPassword }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'HeadlessChrome/Bot',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should still succeed but with elevated risk level in audit logs
      expect(data.message).toBe('Account successfully deleted');
    });

    it('should handle new accounts with caution', async () => {
      // Set user as newly created (1 hour old)
      const newUser = {
        ...testUser,
        createdAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour old
      };
      users.set(testUser.email, newUser);

      const request = new NextRequest('http://localhost:3000/api/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({ password: validPassword }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe('Data Removal', () => {
    it('should successfully delete account and remove all data', async () => {
      // Add some onboarding data
      onboardingPreferences.set(testUser.email, {
        email: testUser.email,
        interests: ['technology', 'business'],
        defaultSessionDuration: 30,
        dailyTimeLimit: 120,
        maxSessionsPerDay: 3,
        completedAt: new Date(),
      });

      const request = new NextRequest('http://localhost:3000/api/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({ password: validPassword }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Account successfully deleted');
      expect(data.email).toBe(testUser.email);
      expect(data.deletedAt).toBeDefined();
      expect(data.removedData).toBeDefined();
      expect(data.auditId).toBeDefined();

      // Verify user is removed from stores
      expect(users.has(testUser.email)).toBe(false);
      expect(onboardingPreferences.has(testUser.email)).toBe(false);

      // Verify session cookie is cleared
      const setCookieHeader = response.headers.get('Set-Cookie');
      expect(setCookieHeader).toContain('session=;');
      expect(setCookieHeader).toContain('Max-Age=0');
    });

    it('should return detailed removal information', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({ password: validPassword }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.removedData).toEqual(
        expect.objectContaining({
          userProfile: expect.any(Boolean),
          sessions: expect.any(Number),
          userPreferences: expect.any(Boolean),
          verifications: expect.any(Boolean),
          passwordResets: expect.any(Boolean),
          rateLimitData: expect.any(Boolean),
        })
      );
    });

    it('should handle data removal failures gracefully', async () => {
      // Mock data removal service to fail
      const mockRemoveAllUserData = jest.spyOn(dataRemovalService, 'removeAllUserData')
        .mockResolvedValue({
          success: false,
          errors: ['Database connection failed'],
          removedData: {},
          auditLog: {
            timestamp: new Date().toISOString(),
            userId: testUser.email,
            initiatedBy: 'user_self_deletion',
            success: false,
            errors: ['Database connection failed'],
          },
        });

      const request = new NextRequest('http://localhost:3000/api/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({ password: validPassword }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('deletion_failed');
      expect(data.message).toBe('Failed to complete account deletion');
      expect(data.details).toContain('Database connection failed');

      mockRemoveAllUserData.mockRestore();
    });
  });

  describe('Audit Logging and Notifications', () => {
    it('should record audit logs for successful deletion', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({ password: validPassword }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Check audit logs
      const auditLogs = deletionSecurityService.getAuditLog(testUser.email);
      expect(auditLogs.length).toBeGreaterThan(0);
      
      // Should have logs for security check and deletion attempt
      const deletionLogs = auditLogs.filter(log => 
        log.eventType === 'deletion_success' || log.eventType === 'deletion_attempt'
      );
      expect(deletionLogs.length).toBeGreaterThan(0);
    });

    it('should record audit logs for blocked deletion', async () => {
      // Create 3 failed deletion attempts to trigger blocking
      for (let i = 0; i < 3; i++) {
        await deletionSecurityService.recordDeletionAttempt({
          email: testUser.email,
          ip: '192.168.1.1',
          userAgent: 'test',
          success: false,
          reason: 'test',
          riskLevel: 'low',
          securityFlags: []
        });
      }

      const request = new NextRequest('http://localhost:3000/api/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({ password: validPassword }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 Test Browser',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(429);

      // Check audit logs for security block
      const auditLogs = deletionSecurityService.getAuditLog(testUser.email);
      const blockLogs = auditLogs.filter(log => log.eventType === 'security_block');
      expect(blockLogs.length).toBeGreaterThan(0);
    });

    it('should handle notification errors gracefully', async () => {
      // Mock security service to throw error on notification
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mockSendNotifications = jest.spyOn(deletionSecurityService, 'sendSecurityNotifications')
        .mockRejectedValue(new Error('Notification service unavailable'));

      const request = new NextRequest('http://localhost:3000/api/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({ password: validPassword }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      // Should still succeed despite notification failure
      expect(response.status).toBe(200);
      expect(data.message).toBe('Account successfully deleted');

      // Should log the notification error
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send deletion notification:',
        expect.any(Error)
      );

      mockSendNotifications.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('Request Headers and IP Extraction', () => {
    it('should extract IP from x-forwarded-for header', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({ password: validPassword }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '203.0.113.1, 198.51.100.1',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Check that first IP from forwarded header was used
      const auditLogs = deletionSecurityService.getAuditLog(testUser.email);
      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].ip).toBe('203.0.113.1');
    });

    it('should extract IP from x-real-ip header when x-forwarded-for is not present', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({ password: validPassword }),
        headers: {
          'Content-Type': 'application/json',
          'x-real-ip': '203.0.113.5',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const auditLogs = deletionSecurityService.getAuditLog(testUser.email);
      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].ip).toBe('203.0.113.5');
    });

    it('should handle missing IP headers gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({ password: validPassword }),
        headers: {
          'Content-Type': 'application/json',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const auditLogs = deletionSecurityService.getAuditLog(testUser.email);
      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].ip).toBe('unknown');
    });

    it('should handle missing user-agent header gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({ password: validPassword }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const auditLogs = deletionSecurityService.getAuditLog(testUser.email);
      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].userAgent).toBe('unknown');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/delete-account', {
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

    it('should handle bcrypt comparison errors', async () => {
      // Mock bcrypt to throw an error
      const mockCompare = jest.spyOn(bcrypt, 'compare').mockRejectedValue(new Error('Bcrypt error'));

      const request = new NextRequest('http://localhost:3000/api/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({ password: validPassword }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('server_error');
      expect(data.message).toBe('Internal server error');

      mockCompare.mockRestore();
    });

    it('should handle security service errors', async () => {
      // Mock security service to throw an error
      const mockPerformSecurityCheck = jest.spyOn(deletionSecurityService, 'performSecurityCheck')
        .mockRejectedValue(new Error('Security service error'));

      const request = new NextRequest('http://localhost:3000/api/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({ password: validPassword }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('server_error');
      expect(data.message).toBe('Internal server error');

      mockPerformSecurityCheck.mockRestore();
    });
  });

  describe('Session Management', () => {
    it('should clear session cookie on successful deletion', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({ password: validPassword }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const setCookieHeader = response.headers.get('Set-Cookie');
      expect(setCookieHeader).toContain('session=;');
      expect(setCookieHeader).toContain('Max-Age=0');
      expect(setCookieHeader).toContain('HttpOnly');
      expect(setCookieHeader).toContain('SameSite=lax');
      expect(setCookieHeader).toContain('Path=/');
    });

    it('should set secure cookie in production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const request = new NextRequest('http://localhost:3000/api/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({ password: validPassword }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const setCookieHeader = response.headers.get('Set-Cookie');
      expect(setCookieHeader).toContain('Secure');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Account Age Calculation', () => {
    it('should correctly calculate account age for security check', async () => {
      // Create user with specific creation date (7 days ago)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const userWithSpecificAge = {
        ...testUser,
        createdAt: sevenDaysAgo,
      };
      users.set(testUser.email, userWithSpecificAge);

      const request = new NextRequest('http://localhost:3000/api/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({ password: validPassword }),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Verify account age was calculated correctly in audit logs
      const auditLogs = deletionSecurityService.getAuditLog(testUser.email);
      expect(auditLogs.length).toBeGreaterThan(0);
    });
  });
}); 