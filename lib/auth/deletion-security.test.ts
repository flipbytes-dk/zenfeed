/**
 * Test suite for DeletionSecurityService
 * Tests comprehensive security measures and audit logging
 */

import { DeletionSecurityService } from './deletion-security';

describe('DeletionSecurityService', () => {
  let securityService: DeletionSecurityService;
  const testEmail = 'test@example.com';
  const testIP = '192.168.1.100';
  const testUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

  beforeEach(() => {
    securityService = DeletionSecurityService.getInstance();
    securityService.clearAllData();
  });

  describe('performSecurityCheck', () => {
    it('should allow deletion for normal user', async () => {
      const result = await securityService.performSecurityCheck({
        email: testEmail,
        ip: testIP,
        userAgent: testUserAgent,
        password: 'validPassword123',
        accountAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });

      expect(result.allowed).toBe(true);
      expect(result.riskLevel).toBe('low');
      expect(result.additionalVerificationRequired).toBe(false);
    });

    it('should block after too many attempts', async () => {
      // Make 3 failed attempts
      for (let i = 0; i < 3; i++) {
        await securityService.recordDeletionAttempt({
          email: testEmail,
          ip: testIP,
          userAgent: testUserAgent,
          success: false,
          reason: 'test',
          riskLevel: 'low',
          securityFlags: []
        });
      }

      const result = await securityService.performSecurityCheck({
        email: testEmail,
        ip: testIP,
        userAgent: testUserAgent,
        password: 'validPassword123',
        accountAge: 30 * 24 * 60 * 60 * 1000
      });

      expect(result.allowed).toBe(false);
      expect(result.riskLevel).toBe('high');
      expect(result.reason).toContain('Too many deletion attempts');
    });

    it('should flag suspicious user agents', async () => {
      const result = await securityService.performSecurityCheck({
        email: testEmail,
        ip: testIP,
        userAgent: 'HeadlessChrome/Bot',
        password: 'validPassword123',
        accountAge: 30 * 24 * 60 * 60 * 1000
      });

      expect(result.allowed).toBe(true);
      expect(result.riskLevel).toBe('medium');
      expect(result.reason).toContain('suspicious_user_agent');
    });

    it('should flag new accounts', async () => {
      const result = await securityService.performSecurityCheck({
        email: testEmail,
        ip: testIP,
        userAgent: testUserAgent,
        password: 'validPassword123',
        accountAge: 12 * 60 * 60 * 1000 // 12 hours
      });

      expect(result.allowed).toBe(true);
      expect(result.riskLevel).toBe('medium');
      expect(result.reason).toContain('new_account');
    });

    it('should block after too many deletions from same IP', async () => {
      // Simulate 5 deletions from same IP
      for (let i = 0; i < 5; i++) {
        await securityService.recordDeletionAttempt({
          email: `test${i}@example.com`,
          ip: testIP,
          userAgent: testUserAgent,
          success: true,
          reason: 'test',
          riskLevel: 'low',
          securityFlags: []
        });
      }

      const result = await securityService.performSecurityCheck({
        email: testEmail,
        ip: testIP,
        userAgent: testUserAgent,
        password: 'validPassword123',
        accountAge: 30 * 24 * 60 * 60 * 1000
      });

      expect(result.allowed).toBe(false);
      expect(result.riskLevel).toBe('high');
      expect(result.reason).toContain('Too many deletions from this IP');
    });

    it('should detect rapid requests', async () => {
      // Make 3 rapid attempts
      for (let i = 0; i < 3; i++) {
        await securityService.recordDeletionAttempt({
          email: testEmail,
          ip: testIP,
          userAgent: testUserAgent,
          success: false,
          reason: 'test',
          riskLevel: 'low',
          securityFlags: []
        });
      }

      const result = await securityService.performSecurityCheck({
        email: testEmail,
        ip: testIP,
        userAgent: testUserAgent,
        password: 'validPassword123',
        accountAge: 30 * 24 * 60 * 60 * 1000
      });

      expect(result.allowed).toBe(false);
      expect(result.riskLevel).toBe('high');
      expect(result.reason).toContain('rapid_requests');
    });
  });

  describe('recordDeletionAttempt', () => {
    it('should record deletion attempt with audit log', async () => {
      await securityService.recordDeletionAttempt({
        email: testEmail,
        ip: testIP,
        userAgent: testUserAgent,
        success: true,
        reason: 'test deletion',
        riskLevel: 'low',
        securityFlags: ['test_flag']
      });

      const auditLog = securityService.getAuditLog(testEmail);
      expect(auditLog.length).toBeGreaterThan(0);
      expect(auditLog[0].eventType).toBe('deletion_success');
      expect(auditLog[0].email).toBe(testEmail);
      expect(auditLog[0].ip).toBe(testIP);
      expect(auditLog[0].riskLevel).toBe('low');
      expect(auditLog[0].securityFlags).toContain('test_flag');
    });

    it('should mark user as suspicious for high-risk failed attempts', async () => {
      await securityService.recordDeletionAttempt({
        email: testEmail,
        ip: testIP,
        userAgent: testUserAgent,
        success: false,
        reason: 'suspicious activity',
        riskLevel: 'high',
        securityFlags: ['suspicious_behavior']
      });

      // Next security check should flag the user as suspicious
      const result = await securityService.performSecurityCheck({
        email: testEmail,
        ip: testIP,
        userAgent: testUserAgent,
        password: 'validPassword123',
        accountAge: 30 * 24 * 60 * 60 * 1000
      });

      expect(result.riskLevel).toBe('high');
      expect(result.reason).toContain('suspicious_user');
    });
  });

  describe('sendSecurityNotifications', () => {
    it('should send security notifications and log them', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await securityService.sendSecurityNotifications({
        email: testEmail,
        eventType: 'deletion_success',
        details: {
          timestamp: new Date().toISOString(),
          riskLevel: 'low'
        }
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY NOTIFICATION] DELETION_SUCCESS'),
        expect.objectContaining({
          email: testEmail,
          timestamp: expect.any(String),
          details: expect.objectContaining({
            timestamp: expect.any(String),
            riskLevel: 'low'
          })
        })
      );

      const auditLog = securityService.getAuditLog(testEmail);
      expect(auditLog.length).toBeGreaterThan(0);
      expect(auditLog[0].eventType).toBe('admin_notification');
      expect(auditLog[0].details.notificationType).toBe('deletion_success');

      consoleSpy.mockRestore();
    });
  });

  describe('audit logging', () => {
    it('should maintain comprehensive audit trail', async () => {
      // Perform security check
      await securityService.performSecurityCheck({
        email: testEmail,
        ip: testIP,
        userAgent: testUserAgent,
        password: 'validPassword123',
        accountAge: 30 * 24 * 60 * 60 * 1000
      });

      // Record deletion attempt
      await securityService.recordDeletionAttempt({
        email: testEmail,
        ip: testIP,
        userAgent: testUserAgent,
        success: true,
        reason: 'successful deletion',
        riskLevel: 'low',
        securityFlags: []
      });

      // Send notification
      await securityService.sendSecurityNotifications({
        email: testEmail,
        eventType: 'deletion_success',
        details: { test: 'data' }
      });

      // Check audit log
      const auditLog = securityService.getAuditLog(testEmail);
      expect(auditLog.length).toBe(3); // security_block, deletion_success, admin_notification

      // Verify audit log entries
      const eventTypes = auditLog.map(entry => entry.eventType);
      expect(eventTypes).toContain('security_block');
      expect(eventTypes).toContain('deletion_success');
      expect(eventTypes).toContain('admin_notification');

      // Verify audit log structure
      auditLog.forEach(entry => {
        expect(entry.id).toBeDefined();
        expect(entry.timestamp).toBeInstanceOf(Date);
        expect(entry.email).toBe(testEmail);
        expect(entry.ip).toBeDefined();
        expect(entry.userAgent).toBeDefined();
        expect(entry.riskLevel).toMatch(/^(low|medium|high)$/);
        expect(Array.isArray(entry.securityFlags)).toBe(true);
      });
    });
  });

  describe('admin functions', () => {
    it('should provide all audit logs for admin access', async () => {
      const testEmail1 = 'test1@example.com';
      const testEmail2 = 'test2@example.com';

      // Create audit entries for different users
      await securityService.recordDeletionAttempt({
        email: testEmail1,
        ip: testIP,
        userAgent: testUserAgent,
        success: true,
        reason: 'test',
        riskLevel: 'low',
        securityFlags: []
      });

      await securityService.recordDeletionAttempt({
        email: testEmail2,
        ip: testIP,
        userAgent: testUserAgent,
        success: false,
        reason: 'test',
        riskLevel: 'high',
        securityFlags: []
      });

      const allLogs = securityService.getAllAuditLogs();
      expect(allLogs.length).toBeGreaterThanOrEqual(2);
      
      const emails = allLogs.map(log => log.email);
      expect(emails).toContain(testEmail1);
      expect(emails).toContain(testEmail2);
    });
  });

  describe('clearAllData', () => {
    it('should clear all security data', async () => {
      // Add some data
      await securityService.recordDeletionAttempt({
        email: testEmail,
        ip: testIP,
        userAgent: testUserAgent,
        success: true,
        reason: 'test',
        riskLevel: 'low',
        securityFlags: []
      });

      await securityService.sendSecurityNotifications({
        email: testEmail,
        eventType: 'deletion_success',
        details: {}
      });

      // Verify data exists
      expect(securityService.getAuditLog(testEmail).length).toBeGreaterThan(0);

      // Clear all data
      securityService.clearAllData();

      // Verify data is cleared
      expect(securityService.getAuditLog(testEmail).length).toBe(0);
      expect(securityService.getAllAuditLogs().length).toBe(0);
    });
  });
}); 