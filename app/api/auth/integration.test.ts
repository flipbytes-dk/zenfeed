/**
 * Integration tests for complete authentication flows
 * Tests end-to-end scenarios across multiple API endpoints
 */

import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { 
  users, 
  sessions, 
  pendingVerifications, 
  passwordResets, 
  onboardingPreferences,
  resendAttempts,
  resetAttempts
} from '@/lib/stores/verification-store';

// Import all API route handlers
import { POST as RegisterPOST } from './register/route';
import { POST as VerifyEmailPOST } from './verify-email/route';
import { POST as LoginPOST } from './login/route';
import { POST as LogoutPOST } from './logout/route';
import { POST as ResetPasswordPOST } from './reset-password/route';
import { POST as ConfirmResetPOST } from './reset-password/confirm/route';
import { POST as OnboardingPOST, GET as OnboardingGET } from './onboarding/route';
import { POST as DeleteAccountPOST } from './delete-account/route';
import { POST as ResendVerificationPOST } from './resend-verification/route';

// Mock console to avoid output during tests
jest.mock('console', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

// Mock authentication utils
jest.mock('@/lib/auth/utils', () => ({
  getAuthenticatedUser: jest.fn(),
}));

import { getAuthenticatedUser } from '@/lib/auth/utils';
const mockGetAuthenticatedUser = getAuthenticatedUser as jest.MockedFunction<typeof getAuthenticatedUser>;

describe('Authentication Integration Tests', () => {
  const testEmail = 'integration@test.com';
  const testPassword = 'TestPassword123!';
  const testName = 'Integration Test User';

  // Helper function to create a request
  const createRequest = (url: string, method: string, body?: any, headers?: Record<string, string>) => {
    const requestHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ...headers
    };

    return new NextRequest(url, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: requestHeaders,
    });
  };

  // Helper function to extract session cookie
  const extractSessionCookie = (response: Response): string | null => {
    const setCookie = response.headers.get('set-cookie');
    if (!setCookie) return null;
    
    const sessionMatch = setCookie.match(/session=([^;]+)/);
    return sessionMatch ? sessionMatch[1] : null;
  };

  beforeEach(() => {
    // Clear all stores before each test
    users.clear();
    sessions.clear();
    pendingVerifications.clear();
    passwordResets.clear();
    onboardingPreferences.clear();
    resendAttempts.clear();
    resetAttempts.clear();
    mockGetAuthenticatedUser.mockReset();
  });

  describe('Complete Registration Flow', () => {
    it('should complete full registration flow: register → verify email → login', async () => {
      // Step 1: Register user
      const registerRequest = createRequest('http://localhost:3000/api/auth/register', 'POST', {
        email: testEmail,
        password: testPassword,
        name: testName
      });

      const registerResponse = await RegisterPOST(registerRequest);
      const registerData = await registerResponse.json();

      expect(registerResponse.status).toBe(201);
      expect(registerData.message).toBe('User registered successfully');
      expect(users.has(testEmail)).toBe(true);
      expect(pendingVerifications.size).toBe(1);

      // Step 2: Verify email
      const verificationToken = Array.from(pendingVerifications.values())[0].token;
      const verifyRequest = createRequest('http://localhost:3000/api/auth/verify-email', 'POST', {
        email: testEmail,
        token: verificationToken
      });

      const verifyResponse = await VerifyEmailPOST(verifyRequest);
      const verifyData = await verifyResponse.json();

      expect(verifyResponse.status).toBe(200);
      expect(verifyData.message).toBe('Email verified successfully');
      expect(users.get(testEmail)?.verified).toBe(true);
      expect(pendingVerifications.size).toBe(0);

      // Step 3: Login
      const loginRequest = createRequest('http://localhost:3000/api/auth/login', 'POST', {
        email: testEmail,
        password: testPassword
      });

      const loginResponse = await LoginPOST(loginRequest);
      const loginData = await loginResponse.json();

      expect(loginResponse.status).toBe(200);
      expect(loginData.message).toBe('Login successful');
      expect(loginData.user.email).toBe(testEmail);
      expect(loginData.user.name).toBe(testName);
      expect(sessions.size).toBe(1);

      // Verify session cookie is set
      const sessionCookie = extractSessionCookie(loginResponse);
      expect(sessionCookie).toBeTruthy();
    });

    it('should handle registration with email verification failure', async () => {
      // Step 1: Register user
      const registerRequest = createRequest('http://localhost:3000/api/auth/register', 'POST', {
        email: testEmail,
        password: testPassword,
        name: testName
      });

      const registerResponse = await RegisterPOST(registerRequest);
      expect(registerResponse.status).toBe(201);

      // Step 2: Try to login before verification
      const loginRequest = createRequest('http://localhost:3000/api/auth/login', 'POST', {
        email: testEmail,
        password: testPassword
      });

      const loginResponse = await LoginPOST(loginRequest);
      const loginData = await loginResponse.json();

      expect(loginResponse.status).toBe(401);
      expect(loginData.error).toBe('email_not_verified');
      expect(sessions.size).toBe(0);
    });

    it('should handle resend verification in registration flow', async () => {
      // Step 1: Register user
      const registerRequest = createRequest('http://localhost:3000/api/auth/register', 'POST', {
        email: testEmail,
        password: testPassword,
        name: testName
      });

      await RegisterPOST(registerRequest);

      // Step 2: Resend verification
      const resendRequest = createRequest('http://localhost:3000/api/auth/resend-verification', 'POST', {
        email: testEmail
      });

      const resendResponse = await ResendVerificationPOST(resendRequest);
      const resendData = await resendResponse.json();

      expect(resendResponse.status).toBe(200);
      expect(resendData.message).toBe('Verification email sent');
      expect(pendingVerifications.size).toBe(1);

      // Step 3: Verify with new token
      const verificationToken = Array.from(pendingVerifications.values())[0].token;
      const verifyRequest = createRequest('http://localhost:3000/api/auth/verify-email', 'POST', {
        email: testEmail,
        token: verificationToken
      });

      const verifyResponse = await VerifyEmailPOST(verifyRequest);
      expect(verifyResponse.status).toBe(200);
      expect(users.get(testEmail)?.verified).toBe(true);
    });
  });

  describe('Complete Password Reset Flow', () => {
    beforeEach(async () => {
      // Create and verify a user for password reset tests
      const hashedPassword = await bcrypt.hash(testPassword, 12);
      users.set(testEmail, {
        email: testEmail,
        passwordHash: hashedPassword,
        name: testName,
        verified: true,
        createdAt: new Date(),
        onboardingCompleted: false
      });
    });

    it('should complete full password reset flow: request → confirm → login', async () => {
      const newPassword = 'NewPassword123!';

      // Step 1: Request password reset
      const resetRequest = createRequest('http://localhost:3000/api/auth/reset-password', 'POST', {
        email: testEmail
      });

      const resetResponse = await ResetPasswordPOST(resetRequest);
      const resetData = await resetResponse.json();

      expect(resetResponse.status).toBe(200);
      expect(resetData.message).toBe('Password reset email sent');
      expect(passwordResets.size).toBe(1);

      // Step 2: Confirm password reset
      const resetToken = Array.from(passwordResets.values())[0].token;
      const confirmRequest = createRequest('http://localhost:3000/api/auth/reset-password/confirm', 'POST', {
        email: testEmail,
        token: resetToken,
        password: newPassword
      });

      const confirmResponse = await ConfirmResetPOST(confirmRequest);
      const confirmData = await confirmResponse.json();

      expect(confirmResponse.status).toBe(200);
      expect(confirmData.message).toBe('Password reset successful');
      expect(passwordResets.size).toBe(0);

      // Step 3: Login with new password
      const loginRequest = createRequest('http://localhost:3000/api/auth/login', 'POST', {
        email: testEmail,
        password: newPassword
      });

      const loginResponse = await LoginPOST(loginRequest);
      const loginData = await loginResponse.json();

      expect(loginResponse.status).toBe(200);
      expect(loginData.message).toBe('Login successful');
      expect(sessions.size).toBe(1);

      // Step 4: Verify old password no longer works
      const oldPasswordRequest = createRequest('http://localhost:3000/api/auth/login', 'POST', {
        email: testEmail,
        password: testPassword
      });

      const oldPasswordResponse = await LoginPOST(oldPasswordRequest);
      expect(oldPasswordResponse.status).toBe(401);
    });

    it('should handle expired reset token', async () => {
      // Step 1: Request password reset
      const resetRequest = createRequest('http://localhost:3000/api/auth/reset-password', 'POST', {
        email: testEmail
      });

      await ResetPasswordPOST(resetRequest);

      // Step 2: Manually expire the token
      const resetEntry = Array.from(passwordResets.values())[0];
      resetEntry.expiresAt = new Date(Date.now() - 1000); // Expired 1 second ago

      // Step 3: Try to confirm with expired token
      const confirmRequest = createRequest('http://localhost:3000/api/auth/reset-password/confirm', 'POST', {
        email: testEmail,
        token: resetEntry.token,
        password: 'NewPassword123!'
      });

      const confirmResponse = await ConfirmResetPOST(confirmRequest);
      const confirmData = await confirmResponse.json();

      expect(confirmResponse.status).toBe(400);
      expect(confirmData.error).toBe('invalid_token');
    });
  });

  describe('Complete Onboarding Flow', () => {
    beforeEach(async () => {
      // Create verified user and session
      const hashedPassword = await bcrypt.hash(testPassword, 12);
      users.set(testEmail, {
        email: testEmail,
        passwordHash: hashedPassword,
        name: testName,
        verified: true,
        createdAt: new Date(),
        onboardingCompleted: false
      });

      const sessionId = 'session_' + Date.now();
      sessions.set(sessionId, {
        userId: testEmail,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0 Test'
      });

      mockGetAuthenticatedUser.mockResolvedValue({
        email: testEmail,
        name: testName,
        verified: true,
        onboardingCompleted: false,
        sessionId
      });
    });

    it('should complete onboarding flow: login → get preferences → set preferences', async () => {
      // Step 1: Get current onboarding status
      const getRequest = createRequest('http://localhost:3000/api/auth/onboarding', 'GET');
      const getResponse = await OnboardingGET(getRequest);
      const getData = await getResponse.json();

      expect(getResponse.status).toBe(200);
      expect(getData.onboardingCompleted).toBe(false);
      expect(getData.preferences).toBeNull();

      // Step 2: Set onboarding preferences
      const preferences = {
        interests: ['technology', 'science', 'health'],
        sessionDuration: 30,
        dailyTimeLimit: 120,
        maxSessionsPerDay: 3
      };

      const setRequest = createRequest('http://localhost:3000/api/auth/onboarding', 'POST', preferences);
      const setResponse = await OnboardingPOST(setRequest);
      const setData = await setResponse.json();

      expect(setResponse.status).toBe(200);
      expect(setData.message).toBe('Onboarding completed successfully');
      expect(users.get(testEmail)?.onboardingCompleted).toBe(true);
      expect(onboardingPreferences.has(testEmail)).toBe(true);

      // Step 3: Verify preferences were saved
      const verifyRequest = createRequest('http://localhost:3000/api/auth/onboarding', 'GET');
      const verifyResponse = await OnboardingGET(verifyRequest);
      const verifyData = await verifyResponse.json();

      expect(verifyResponse.status).toBe(200);
      expect(verifyData.onboardingCompleted).toBe(true);
      expect(verifyData.preferences).toEqual(expect.objectContaining(preferences));
    });

    it('should handle onboarding with invalid preferences', async () => {
      const invalidPreferences = {
        interests: ['invalid_interest'],
        sessionDuration: 5, // Too short
        dailyTimeLimit: 10, // Too short
        maxSessionsPerDay: 15 // Too many
      };

      const setRequest = createRequest('http://localhost:3000/api/auth/onboarding', 'POST', invalidPreferences);
      const setResponse = await OnboardingPOST(setRequest);
      const setData = await setResponse.json();

      expect(setResponse.status).toBe(400);
      expect(setData.error).toBe('validation_error');
      expect(users.get(testEmail)?.onboardingCompleted).toBe(false);
    });
  });

  describe('Complete Account Deletion Flow', () => {
    beforeEach(async () => {
      // Create verified user with onboarding completed
      const hashedPassword = await bcrypt.hash(testPassword, 12);
      users.set(testEmail, {
        email: testEmail,
        passwordHash: hashedPassword,
        name: testName,
        verified: true,
        createdAt: new Date(),
        onboardingCompleted: true
      });

      const sessionId = 'session_' + Date.now();
      sessions.set(sessionId, {
        userId: testEmail,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0 Test'
      });

      onboardingPreferences.set(testEmail, {
        interests: ['technology', 'science'],
        sessionDuration: 30,
        dailyTimeLimit: 120,
        maxSessionsPerDay: 3
      });

      mockGetAuthenticatedUser.mockResolvedValue({
        email: testEmail,
        name: testName,
        verified: true,
        onboardingCompleted: true,
        sessionId
      });
    });

    it('should complete account deletion flow: verify identity → delete account → verify deletion', async () => {
      // Step 1: Delete account
      const deleteRequest = createRequest('http://localhost:3000/api/auth/delete-account', 'POST', {
        password: testPassword
      }, {
        'x-forwarded-for': '192.168.1.1'
      });

      const deleteResponse = await DeleteAccountPOST(deleteRequest);
      const deleteData = await deleteResponse.json();

      expect(deleteResponse.status).toBe(200);
      expect(deleteData.message).toBe('Account deleted successfully');
      expect(deleteData.deletionId).toBeDefined();

      // Step 2: Verify user data is removed
      expect(users.has(testEmail)).toBe(false);
      expect(sessions.size).toBe(0);
      expect(onboardingPreferences.has(testEmail)).toBe(false);

      // Step 3: Verify session cookie is cleared
      const setCookie = deleteResponse.headers.get('set-cookie');
      expect(setCookie).toContain('session=;');
      expect(setCookie).toContain('Max-Age=0');

      // Step 4: Verify cannot login after deletion
      const loginRequest = createRequest('http://localhost:3000/api/auth/login', 'POST', {
        email: testEmail,
        password: testPassword
      });

      const loginResponse = await LoginPOST(loginRequest);
      expect(loginResponse.status).toBe(401);
    });

    it('should handle deletion with wrong password', async () => {
      const deleteRequest = createRequest('http://localhost:3000/api/auth/delete-account', 'POST', {
        password: 'WrongPassword123!'
      });

      const deleteResponse = await DeleteAccountPOST(deleteRequest);
      const deleteData = await deleteResponse.json();

      expect(deleteResponse.status).toBe(401);
      expect(deleteData.error).toBe('invalid_password');

      // Verify user data is NOT removed
      expect(users.has(testEmail)).toBe(true);
      expect(sessions.size).toBe(1);
      expect(onboardingPreferences.has(testEmail)).toBe(true);
    });
  });

  describe('Session Management Integration', () => {
    beforeEach(async () => {
      // Create verified user
      const hashedPassword = await bcrypt.hash(testPassword, 12);
      users.set(testEmail, {
        email: testEmail,
        passwordHash: hashedPassword,
        name: testName,
        verified: true,
        createdAt: new Date(),
        onboardingCompleted: true
      });
    });

    it('should handle login → logout → login cycle', async () => {
      // Step 1: Login
      const loginRequest = createRequest('http://localhost:3000/api/auth/login', 'POST', {
        email: testEmail,
        password: testPassword
      });

      const loginResponse = await LoginPOST(loginRequest);
      const loginData = await loginResponse.json();
      const sessionCookie = extractSessionCookie(loginResponse);

      expect(loginResponse.status).toBe(200);
      expect(sessions.size).toBe(1);
      expect(sessionCookie).toBeTruthy();

      // Step 2: Logout
      const logoutRequest = createRequest('http://localhost:3000/api/auth/logout', 'POST', {}, {
        'Cookie': `session=${sessionCookie}`
      });

      const logoutResponse = await LogoutPOST(logoutRequest);
      const logoutData = await logoutResponse.json();

      expect(logoutResponse.status).toBe(200);
      expect(logoutData.message).toBe('Logged out successfully');
      expect(sessions.size).toBe(0);

      // Step 3: Login again
      const secondLoginRequest = createRequest('http://localhost:3000/api/auth/login', 'POST', {
        email: testEmail,
        password: testPassword
      });

      const secondLoginResponse = await LoginPOST(secondLoginRequest);
      const secondLoginData = await secondLoginResponse.json();

      expect(secondLoginResponse.status).toBe(200);
      expect(secondLoginData.message).toBe('Login successful');
      expect(sessions.size).toBe(1);
    });

    it('should handle multiple concurrent sessions', async () => {
      // Create multiple login sessions
      const loginRequests = Array(3).fill(null).map(() => 
        createRequest('http://localhost:3000/api/auth/login', 'POST', {
          email: testEmail,
          password: testPassword
        })
      );

      const loginResponses = await Promise.all(
        loginRequests.map(request => LoginPOST(request))
      );

      // All logins should succeed
      loginResponses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should have 3 active sessions
      expect(sessions.size).toBe(3);

      // Extract session cookies
      const sessionCookies = loginResponses.map(response => extractSessionCookie(response));
      expect(sessionCookies.filter(Boolean)).toHaveLength(3);

      // Logout from one session
      const logoutRequest = createRequest('http://localhost:3000/api/auth/logout', 'POST', {}, {
        'Cookie': `session=${sessionCookies[0]}`
      });

      const logoutResponse = await LogoutPOST(logoutRequest);
      expect(logoutResponse.status).toBe(200);
      expect(sessions.size).toBe(2);
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should handle network interruption during registration', async () => {
      // Start registration but don't complete verification
      const registerRequest = createRequest('http://localhost:3000/api/auth/register', 'POST', {
        email: testEmail,
        password: testPassword,
        name: testName
      });

      const registerResponse = await RegisterPOST(registerRequest);
      expect(registerResponse.status).toBe(201);

      // Simulate network issue - try to register again
      const duplicateRequest = createRequest('http://localhost:3000/api/auth/register', 'POST', {
        email: testEmail,
        password: testPassword,
        name: testName
      });

      const duplicateResponse = await RegisterPOST(duplicateRequest);
      const duplicateData = await duplicateResponse.json();

      expect(duplicateResponse.status).toBe(400);
      expect(duplicateData.error).toBe('user_exists');
    });

    it('should handle race conditions in concurrent operations', async () => {
      // Create verified user
      const hashedPassword = await bcrypt.hash(testPassword, 12);
      users.set(testEmail, {
        email: testEmail,
        passwordHash: hashedPassword,
        name: testName,
        verified: true,
        createdAt: new Date(),
        onboardingCompleted: false
      });

      // Create session
      const sessionId = 'session_' + Date.now();
      sessions.set(sessionId, {
        userId: testEmail,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0 Test'
      });

      mockGetAuthenticatedUser.mockResolvedValue({
        email: testEmail,
        name: testName,
        verified: true,
        onboardingCompleted: false,
        sessionId
      });

      // Simulate concurrent password reset and onboarding
      const resetRequest = createRequest('http://localhost:3000/api/auth/reset-password', 'POST', {
        email: testEmail
      });

      const onboardingRequest = createRequest('http://localhost:3000/api/auth/onboarding', 'POST', {
        interests: ['technology', 'science'],
        sessionDuration: 30,
        dailyTimeLimit: 120,
        maxSessionsPerDay: 3
      });

      const [resetResponse, onboardingResponse] = await Promise.all([
        ResetPasswordPOST(resetRequest),
        OnboardingPOST(onboardingRequest)
      ]);

      // Both should succeed independently
      expect(resetResponse.status).toBe(200);
      expect(onboardingResponse.status).toBe(200);
    });
  });

  describe('Data Consistency Across Flows', () => {
    it('should maintain data consistency across complete user lifecycle', async () => {
      // Step 1: Registration
      const registerRequest = createRequest('http://localhost:3000/api/auth/register', 'POST', {
        email: testEmail,
        password: testPassword,
        name: testName
      });

      await RegisterPOST(registerRequest);
      expect(users.has(testEmail)).toBe(true);
      expect(users.get(testEmail)?.verified).toBe(false);

      // Step 2: Email verification
      const verificationToken = Array.from(pendingVerifications.values())[0].token;
      const verifyRequest = createRequest('http://localhost:3000/api/auth/verify-email', 'POST', {
        email: testEmail,
        token: verificationToken
      });

      await VerifyEmailPOST(verifyRequest);
      expect(users.get(testEmail)?.verified).toBe(true);

      // Step 3: Login
      const loginRequest = createRequest('http://localhost:3000/api/auth/login', 'POST', {
        email: testEmail,
        password: testPassword
      });

      await LoginPOST(loginRequest);
      expect(sessions.size).toBe(1);

      // Step 4: Onboarding
      const sessionId = Array.from(sessions.keys())[0];
      mockGetAuthenticatedUser.mockResolvedValue({
        email: testEmail,
        name: testName,
        verified: true,
        onboardingCompleted: false,
        sessionId
      });

      const onboardingRequest = createRequest('http://localhost:3000/api/auth/onboarding', 'POST', {
        interests: ['technology', 'science'],
        sessionDuration: 30,
        dailyTimeLimit: 120,
        maxSessionsPerDay: 3
      });

      await OnboardingPOST(onboardingRequest);
      expect(users.get(testEmail)?.onboardingCompleted).toBe(true);
      expect(onboardingPreferences.has(testEmail)).toBe(true);

      // Step 5: Account deletion
      mockGetAuthenticatedUser.mockResolvedValue({
        email: testEmail,
        name: testName,
        verified: true,
        onboardingCompleted: true,
        sessionId
      });

      const deleteRequest = createRequest('http://localhost:3000/api/auth/delete-account', 'POST', {
        password: testPassword
      });

      await DeleteAccountPOST(deleteRequest);

      // Verify complete cleanup
      expect(users.has(testEmail)).toBe(false);
      expect(sessions.size).toBe(0);
      expect(onboardingPreferences.has(testEmail)).toBe(false);
      expect(pendingVerifications.size).toBe(0);
    });

    it('should handle partial state cleanup on failed operations', async () => {
      // Create user with partial state
      const hashedPassword = await bcrypt.hash(testPassword, 12);
      users.set(testEmail, {
        email: testEmail,
        passwordHash: hashedPassword,
        name: testName,
        verified: false, // Not verified
        createdAt: new Date(),
        onboardingCompleted: false
      });

      // Create pending verification
      pendingVerifications.set(testEmail, {
        token: 'test-token',
        email: testEmail,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      // Try to login without verification
      const loginRequest = createRequest('http://localhost:3000/api/auth/login', 'POST', {
        email: testEmail,
        password: testPassword
      });

      const loginResponse = await LoginPOST(loginRequest);
      expect(loginResponse.status).toBe(401);

      // Verify state is unchanged
      expect(users.has(testEmail)).toBe(true);
      expect(users.get(testEmail)?.verified).toBe(false);
      expect(pendingVerifications.has(testEmail)).toBe(true);
      expect(sessions.size).toBe(0);
    });
  });
}); 