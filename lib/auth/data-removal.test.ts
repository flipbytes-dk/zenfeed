/**
 * Test suite for DataRemovalService
 * This tests the comprehensive data removal functionality
 */

import { DataRemovalService } from './data-removal';
import { 
  users, 
  sessions, 
  pendingVerifications, 
  passwordResets, 
  resendAttempts, 
  resetAttempts 
} from '@/lib/stores/verification-store';

describe('DataRemovalService', () => {
  let dataRemovalService: DataRemovalService;
  const testEmail = 'test@example.com';
  const testUserId = 'test-user-123';

  beforeEach(() => {
    // Clear all stores before each test
    users.clear();
    sessions.clear();
    pendingVerifications.clear();
    passwordResets.clear();
    resendAttempts.clear();
    resetAttempts.clear();
    
    // Get fresh instance of the service
    dataRemovalService = DataRemovalService.getInstance();
    dataRemovalService.clearRemovalHistory();
  });

  afterEach(() => {
    // Clean up after each test
    users.clear();
    sessions.clear();
    pendingVerifications.clear();
    passwordResets.clear();
    resendAttempts.clear();
    resetAttempts.clear();
  });

  describe('removeAllUserData', () => {
    it('should successfully remove all user data', async () => {
      // Setup test data
      setupTestUserData();

      // Perform data removal
      const result = await dataRemovalService.removeAllUserData({
        userId: testUserId,
        email: testEmail,
        initiatedBy: 'test_user',
        ip: '127.0.0.1',
        userAgent: 'test-agent'
      });

      // Verify result
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.removedData.userProfile).toBe(true);
      expect(result.removedData.sessions).toBe(2);
      expect(result.removedData.verifications).toBe(true);
      expect(result.removedData.passwordResets).toBe(true);
      expect(result.removedData.rateLimitData).toBe(true);

      // Verify data is actually removed from stores
      expect(users.has(testEmail)).toBe(false);
      expect(Array.from(sessions.values()).filter(s => s.email === testEmail)).toHaveLength(0);
      expect(pendingVerifications.has(testEmail)).toBe(false);
      expect(passwordResets.has(testEmail)).toBe(false);
      expect(resendAttempts.has(testEmail)).toBe(false);
      expect(resetAttempts.has(testEmail)).toBe(false);
    });

    it('should handle partial data removal gracefully', async () => {
      // Setup only some test data
      users.set(testEmail, {
        email: testEmail,
        passwordHash: 'hash123',
        verified: true,
        createdAt: new Date()
      });

      // Perform data removal
      const result = await dataRemovalService.removeAllUserData({
        userId: testUserId,
        email: testEmail,
        initiatedBy: 'test_user'
      });

      // Verify result
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.removedData.userProfile).toBe(true);
      expect(result.removedData.sessions).toBe(0);
      expect(result.removedData.verifications).toBe(false);
      expect(result.removedData.passwordResets).toBe(false);
      expect(result.removedData.rateLimitData).toBe(false);
    });

    it('should handle non-existent user gracefully', async () => {
      // Perform data removal for non-existent user
      const result = await dataRemovalService.removeAllUserData({
        userId: 'nonexistent',
        email: 'nonexistent@example.com',
        initiatedBy: 'test_user'
      });

      // Verify result
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.removedData.userProfile).toBe(false);
      expect(result.removedData.sessions).toBe(0);
    });

    it('should perform dry run without actual removal', async () => {
      // Setup test data
      setupTestUserData();

      // Perform dry run
      const result = await dataRemovalService.removeAllUserData({
        userId: testUserId,
        email: testEmail,
        initiatedBy: 'test_user',
        dryRun: true
      });

      // Verify result
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.removedData.userProfile).toBe(true);
      expect(result.removedData.sessions).toBe(2);

      // Verify data is NOT actually removed from stores
      expect(users.has(testEmail)).toBe(true);
      expect(Array.from(sessions.values()).filter(s => s.email === testEmail)).toHaveLength(2);
      expect(pendingVerifications.has(testEmail)).toBe(true);
      expect(passwordResets.has(testEmail)).toBe(true);
    });

    it('should include audit log information', async () => {
      const result = await dataRemovalService.removeAllUserData({
        userId: testUserId,
        email: testEmail,
        initiatedBy: 'test_user',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      });

      expect(result.auditLog.userId).toBe(testUserId);
      expect(result.auditLog.email).toBe(testEmail);
      expect(result.auditLog.initiatedBy).toBe('test_user');
      expect(result.auditLog.ip).toBe('192.168.1.1');
      expect(result.auditLog.userAgent).toBe('Mozilla/5.0');
      expect(result.auditLog.timestamp).toBeDefined();
    });

    it('should handle backup skipping', async () => {
      setupTestUserData();

      const result = await dataRemovalService.removeAllUserData({
        userId: testUserId,
        email: testEmail,
        initiatedBy: 'test_user',
        skipBackups: true
      });

      expect(result.success).toBe(true);
      expect(result.removedData.backups).toBe(false);
    });
  });

  describe('getRemovalHistory', () => {
    it('should track removal history', async () => {
      setupTestUserData();

      // Perform removal
      const result = await dataRemovalService.removeAllUserData({
        userId: testUserId,
        email: testEmail,
        initiatedBy: 'test_user'
      });

      // Check history
      const history = dataRemovalService.getRemovalHistory(testEmail);
      expect(history).toHaveLength(1);
      expect(history[0].auditLog.email).toBe(testEmail);
      expect(history[0].success).toBe(true);
    });

    it('should return empty history for non-existent user', () => {
      const history = dataRemovalService.getRemovalHistory('nonexistent@example.com');
      expect(history).toHaveLength(0);
    });
  });

  describe('clearRemovalHistory', () => {
    it('should clear all removal history', async () => {
      setupTestUserData();

      // Perform removal
      await dataRemovalService.removeAllUserData({
        userId: testUserId,
        email: testEmail,
        initiatedBy: 'test_user'
      });

      // Verify history exists
      let history = dataRemovalService.getRemovalHistory(testEmail);
      expect(history).toHaveLength(1);

      // Clear history
      dataRemovalService.clearRemovalHistory();

      // Verify history is cleared
      history = dataRemovalService.getRemovalHistory(testEmail);
      expect(history).toHaveLength(0);
    });
  });

  // Helper function to setup test data
  function setupTestUserData() {
    // Add user
    users.set(testEmail, {
      email: testEmail,
      passwordHash: 'hash123',
      verified: true,
      createdAt: new Date()
    });

    // Add sessions
    sessions.set('session1', {
      userId: testUserId,
      email: testEmail,
      expires: new Date(Date.now() + 86400000), // 24 hours
      createdAt: new Date()
    });

    sessions.set('session2', {
      userId: testUserId,
      email: testEmail,
      expires: new Date(Date.now() + 86400000), // 24 hours
      createdAt: new Date()
    });

    // Add another user's session (should not be removed)
    sessions.set('other-session', {
      userId: 'other-user',
      email: 'other@example.com',
      expires: new Date(Date.now() + 86400000),
      createdAt: new Date()
    });

    // Add verification
    pendingVerifications.set(testEmail, {
      email: testEmail,
      token: 'verification-token',
      expires: new Date(Date.now() + 86400000),
      verified: false
    });

    // Add password reset
    passwordResets.set(testEmail, {
      email: testEmail,
      token: 'reset-token',
      expires: new Date(Date.now() + 86400000),
      used: false
    });

    // Add rate limit data
    resendAttempts.set(testEmail, {
      count: 2,
      lastAttempt: new Date()
    });

    resetAttempts.set(testEmail, {
      count: 1,
      lastAttempt: new Date()
    });
  }
}); 