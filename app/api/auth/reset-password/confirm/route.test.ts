/**
 * Test suite for password reset confirmation API endpoint
 * Tests token validation, password updates, security checks, and cleanup
 */

import { POST } from './route';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { 
  users, 
  passwordResets,
  RESET_TOKEN_EXPIRY_MS
} from '@/lib/stores/verification-store';

describe('/api/auth/reset-password/confirm', () => {
  const testUser = {
    email: 'test@example.com',
    passwordHash: 'hashedpassword123',
    verified: true,
    createdAt: new Date(),
  };

  const validToken = 'valid-reset-token-123';
  const newPassword = 'newpassword123';

  beforeEach(() => {
    // Clear all stores before each test
    users.clear();
    passwordResets.clear();

    // Create verified test user
    users.set(testUser.email, testUser);

    // Create valid reset token
    passwordResets.set(testUser.email, {
      email: testUser.email,
      token: validToken,
      expires: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS),
      used: false,
    });
  });

  afterEach(() => {
    // Clean up after each test
    users.clear();
    passwordResets.clear();
  });

  describe('POST /api/auth/reset-password/confirm', () => {
    it('should successfully reset password with valid token', async () => {
      const requestBody = {
        email: testUser.email,
        token: validToken,
        password: newPassword,
      };

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password/confirm', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Password successfully updated! You can now sign in with your new password.');

      // Check that password was updated
      const updatedUser = users.get(testUser.email);
      expect(updatedUser).toBeDefined();
      expect(updatedUser!.passwordHash).not.toBe(testUser.passwordHash);
      
      // Verify new password can be validated
      const isValidPassword = await bcrypt.compare(newPassword, updatedUser!.passwordHash);
      expect(isValidPassword).toBe(true);

      // Check that reset token was removed
      expect(passwordResets.has(testUser.email)).toBe(false);
    });

    it('should reject request with missing fields', async () => {
      const testCases = [
        { email: testUser.email, token: validToken }, // missing password
        { email: testUser.email, password: newPassword }, // missing token
        { token: validToken, password: newPassword }, // missing email
        {}, // missing all fields
      ];

      for (const requestBody of testCases) {
        const request = new NextRequest('http://localhost:3000/api/auth/reset-password/confirm', {
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
        expect(data.message).toBe('Email, token, and password are required');
      }
    });

    it('should reject password shorter than 8 characters', async () => {
      const shortPasswords = ['1', '12', '123', '1234', '12345', '123456', '1234567'];

      for (const shortPassword of shortPasswords) {
        const requestBody = {
          email: testUser.email,
          token: validToken,
          password: shortPassword,
        };

        const request = new NextRequest('http://localhost:3000/api/auth/reset-password/confirm', {
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
      }
    });

    it('should accept password with exactly 8 characters', async () => {
      const requestBody = {
        email: testUser.email,
        token: validToken,
        password: '12345678',
      };

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password/confirm', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should reject request for non-existent user', async () => {
      const requestBody = {
        email: 'nonexistent@example.com',
        token: validToken,
        password: newPassword,
      };

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password/confirm', {
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
      expect(data.message).toBe('User not found');
    });

    it('should reject request with invalid token', async () => {
      const requestBody = {
        email: testUser.email,
        token: 'invalid-token',
        password: newPassword,
      };

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password/confirm', {
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
      expect(data.message).toBe('Invalid or expired reset token');
    });

    it('should reject request when no reset token exists', async () => {
      // Remove reset token
      passwordResets.delete(testUser.email);

      const requestBody = {
        email: testUser.email,
        token: validToken,
        password: newPassword,
      };

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password/confirm', {
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
      expect(data.message).toBe('Invalid or expired reset token');
    });

    it('should reject request with already used token', async () => {
      // Mark token as used
      const resetData = passwordResets.get(testUser.email);
      if (resetData) {
        resetData.used = true;
        passwordResets.set(testUser.email, resetData);
      }

      const requestBody = {
        email: testUser.email,
        token: validToken,
        password: newPassword,
      };

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password/confirm', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('token_used');
      expect(data.message).toBe('Reset token has already been used');
    });

    it('should reject request with expired token', async () => {
      // Set token to expired
      const resetData = passwordResets.get(testUser.email);
      if (resetData) {
        resetData.expires = new Date(Date.now() - 1000); // 1 second ago
        passwordResets.set(testUser.email, resetData);
      }

      const requestBody = {
        email: testUser.email,
        token: validToken,
        password: newPassword,
      };

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password/confirm', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('token_expired');
      expect(data.message).toBe('Reset token has expired');

      // Check that expired token was cleaned up
      expect(passwordResets.has(testUser.email)).toBe(false);
    });

    it('should properly hash new password with bcrypt', async () => {
      const requestBody = {
        email: testUser.email,
        token: validToken,
        password: newPassword,
      };

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password/confirm', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      await POST(request);

      const updatedUser = users.get(testUser.email);
      
      // Check that password is properly hashed
      expect(updatedUser!.passwordHash).not.toBe(newPassword);
      expect(updatedUser!.passwordHash.startsWith('$2a$') || updatedUser!.passwordHash.startsWith('$2b$')).toBe(true);
      
      // Check that hash can be verified
      const isValidPassword = await bcrypt.compare(newPassword, updatedUser!.passwordHash);
      expect(isValidPassword).toBe(true);
      
      // Check that old password no longer works
      const oldPasswordValid = await bcrypt.compare('originalPassword', updatedUser!.passwordHash);
      expect(oldPasswordValid).toBe(false);
    });

    it('should use proper bcrypt salt rounds', async () => {
      const requestBody = {
        email: testUser.email,
        token: validToken,
        password: newPassword,
      };

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password/confirm', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      await POST(request);

      const updatedUser = users.get(testUser.email);
      
      // Check that salt rounds are 12 (bcrypt format: $2a$12$ or $2b$12$...)
      expect(updatedUser!.passwordHash).toMatch(/^\$2[ab]\$12\$/);
    });

    it('should handle different password formats', async () => {
      const passwords = [
        'simplepass123',
        'Complex!Password@123',
        'password-with-dashes',
        'password_with_underscores',
        'password with spaces',
        'PasswordWithNumbers123',
        'パスワード123', // Japanese characters
      ];

      for (const password of passwords) {
        // Reset stores for each test
        users.clear();
        passwordResets.clear();
        
        users.set(testUser.email, testUser);
        passwordResets.set(testUser.email, {
          email: testUser.email,
          token: validToken,
          expires: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS),
          used: false,
        });

        const requestBody = {
          email: testUser.email,
          token: validToken,
          password: password,
        };

        const request = new NextRequest('http://localhost:3000/api/auth/reset-password/confirm', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await POST(request);
        expect(response.status).toBe(200);

        // Verify password was set correctly
        const updatedUser = users.get(testUser.email);
        const isValidPassword = await bcrypt.compare(password, updatedUser!.passwordHash);
        expect(isValidPassword).toBe(true);
      }
    });

    it('should preserve other user data while updating password', async () => {
      const requestBody = {
        email: testUser.email,
        token: validToken,
        password: newPassword,
      };

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password/confirm', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      await POST(request);

      const updatedUser = users.get(testUser.email);
      
      // Check that all other fields are preserved
      expect(updatedUser!.email).toBe(testUser.email);
      expect(updatedUser!.verified).toBe(testUser.verified);
      expect(updatedUser!.createdAt).toEqual(testUser.createdAt);
      
      // Only password should be changed
      expect(updatedUser!.passwordHash).not.toBe(testUser.passwordHash);
    });

    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password/confirm', {
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

    it('should handle token timing edge cases', async () => {
      // Set token to expire very soon
      const resetData = passwordResets.get(testUser.email);
      if (resetData) {
        resetData.expires = new Date(Date.now() + 100); // 100ms from now
        passwordResets.set(testUser.email, resetData);
      }

      const requestBody = {
        email: testUser.email,
        token: validToken,
        password: newPassword,
      };

      // Wait just until after expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password/confirm', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('token_expired');
    });

    it('should handle concurrent password reset attempts', async () => {
      const requestBody = {
        email: testUser.email,
        token: validToken,
        password: newPassword,
      };

      // Make concurrent requests
      const requests = Array(3).fill(null).map(() => {
        const request = new NextRequest('http://localhost:3000/api/auth/reset-password/confirm', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json',
          },
        });
        return POST(request);
      });

      const responses = await Promise.all(requests);

      // At least one should succeed
      const successCount = responses.filter(response => response.status === 200).length;
      expect(successCount).toBeGreaterThanOrEqual(1);

      // Token should be cleaned up
      expect(passwordResets.has(testUser.email)).toBe(false);
    });

    it('should handle bcrypt hashing errors gracefully', async () => {
      // Mock bcrypt to throw an error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _originalHash = bcrypt.hash;
      jest.spyOn(bcrypt, 'hash').mockImplementation(() => {
        throw new Error('Hashing failed');
      });

      const requestBody = {
        email: testUser.email,
        token: validToken,
        password: newPassword,
      };

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password/confirm', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('server_error');
      expect(data.message).toBe('Internal server error');

      // Restore original implementation
      jest.restoreAllMocks();
    });

    it('should handle empty string values properly', async () => {
      const testCases = [
        { email: '', token: validToken, password: newPassword },
        { email: testUser.email, token: '', password: newPassword },
        { email: testUser.email, token: validToken, password: '' },
      ];

      for (const requestBody of testCases) {
        const request = new NextRequest('http://localhost:3000/api/auth/reset-password/confirm', {
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
        expect(data.message).toBe('Email, token, and password are required');
      }
    });
  });
}); 