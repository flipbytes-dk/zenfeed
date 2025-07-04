/**
 * Test suite for onboarding API endpoints
 * Tests user onboarding flow, preferences validation, and data storage
 */

import { POST, GET } from './route';
import { NextRequest } from 'next/server';
import { 
  users, 
  onboardingPreferences,
  sessions
} from '@/lib/stores/verification-store';

// Mock the authentication utils
jest.mock('@/lib/auth/utils', () => ({
  getAuthenticatedUser: jest.fn(),
}));

import { getAuthenticatedUser } from '@/lib/auth/utils';

const mockGetAuthenticatedUser = getAuthenticatedUser as jest.MockedFunction<typeof getAuthenticatedUser>;

describe('/api/auth/onboarding', () => {
  const testUser = {
    email: 'test@example.com',
    passwordHash: 'hashedpassword123',
    verified: true,
    createdAt: new Date(),
    onboardingCompleted: false,
  };

  const testSession = {
    userId: 'user123',
    email: testUser.email,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    createdAt: new Date(),
  };

  const validOnboardingData = {
    interests: ['technology', 'business', 'science', 'health-fitness'],
    defaultSessionDuration: 30,
    dailyTimeLimit: 120,
    maxSessionsPerDay: 3,
  };

  beforeEach(() => {
    // Clear all stores before each test
    users.clear();
    onboardingPreferences.clear();
    sessions.clear();

    // Create verified test user
    users.set(testUser.email, testUser);

    // Mock authenticated session
    mockGetAuthenticatedUser.mockReturnValue(testSession);
  });

  afterEach(() => {
    // Clean up after each test
    users.clear();
    onboardingPreferences.clear();
    sessions.clear();
    jest.clearAllMocks();
  });

  describe('POST /api/auth/onboarding', () => {
    it('should successfully complete onboarding with valid data', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify(validOnboardingData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Onboarding completed successfully!');
      expect(data.preferences).toEqual({
        interests: validOnboardingData.interests,
        defaultSessionDuration: validOnboardingData.defaultSessionDuration,
        dailyTimeLimit: validOnboardingData.dailyTimeLimit,
        maxSessionsPerDay: validOnboardingData.maxSessionsPerDay,
      });

      // Check that onboarding data was stored
      expect(onboardingPreferences.has(testUser.email)).toBe(true);
      const storedData = onboardingPreferences.get(testUser.email);
      expect(storedData!.interests).toEqual(validOnboardingData.interests);
      expect(storedData!.completedAt).toBeInstanceOf(Date);

      // Check that user was updated
      const updatedUser = users.get(testUser.email);
      expect(updatedUser!.onboardingCompleted).toBe(true);
    });

    it('should reject request without authentication', async () => {
      mockGetAuthenticatedUser.mockReturnValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify(validOnboardingData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('unauthorized');
      expect(data.message).toBe('Please log in to complete onboarding');
    });

    it('should reject request with invalid interests (not array)', async () => {
      const invalidData = {
        ...validOnboardingData,
        interests: 'not-an-array',
      };

      const request = new NextRequest('http://localhost:3000/api/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_interests');
      expect(data.message).toBe('Interests must be provided as an array');
    });

    it('should reject request with too few interests', async () => {
      const invalidData = {
        ...validOnboardingData,
        interests: ['technology', 'business'], // Only 2 interests
      };

      const request = new NextRequest('http://localhost:3000/api/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_interests_count');
      expect(data.message).toBe('Please select between 3 and 15 interests');
    });

    it('should reject request with too many interests', async () => {
      const invalidData = {
        ...validOnboardingData,
        interests: Array(16).fill('technology'), // 16 interests
      };

      const request = new NextRequest('http://localhost:3000/api/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_interests_count');
      expect(data.message).toBe('Please select between 3 and 15 interests');
    });

    it('should reject request with invalid interest categories', async () => {
      const invalidData = {
        ...validOnboardingData,
        interests: ['technology', 'business', 'invalid-category'],
      };

      const request = new NextRequest('http://localhost:3000/api/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_interest_values');
      expect(data.message).toBe('Invalid interests: invalid-category');
    });

    it('should reject request with session duration too short', async () => {
      const invalidData = {
        ...validOnboardingData,
        defaultSessionDuration: 10, // Less than 15 minutes
      };

      const request = new NextRequest('http://localhost:3000/api/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_session_duration');
      expect(data.message).toBe('Session duration must be between 15 and 240 minutes');
    });

    it('should reject request with session duration too long', async () => {
      const invalidData = {
        ...validOnboardingData,
        defaultSessionDuration: 300, // More than 240 minutes
      };

      const request = new NextRequest('http://localhost:3000/api/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_session_duration');
      expect(data.message).toBe('Session duration must be between 15 and 240 minutes');
    });

    it('should accept unlimited daily time limit (-1)', async () => {
      const validData = {
        ...validOnboardingData,
        dailyTimeLimit: -1,
      };

      const request = new NextRequest('http://localhost:3000/api/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify(validData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should reject request with invalid daily time limit', async () => {
      const invalidData = {
        ...validOnboardingData,
        dailyTimeLimit: 20, // Less than 30 minutes
      };

      const request = new NextRequest('http://localhost:3000/api/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_daily_limit');
      expect(data.message).toBe('Daily limit must be -1 (unlimited) or between 30 and 480 minutes');
    });

    it('should reject request with too many sessions per day', async () => {
      const invalidData = {
        ...validOnboardingData,
        maxSessionsPerDay: 15, // More than 10
      };

      const request = new NextRequest('http://localhost:3000/api/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_sessions_count');
      expect(data.message).toBe('Sessions per day must be between 1 and 10');
    });

    it('should reject request with too few sessions per day', async () => {
      const invalidData = {
        ...validOnboardingData,
        maxSessionsPerDay: 0, // Less than 1
      };

      const request = new NextRequest('http://localhost:3000/api/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_sessions_count');
      expect(data.message).toBe('Sessions per day must be between 1 and 10');
    });

    it('should reject request for non-existent user', async () => {
      // Remove user from store
      users.delete(testUser.email);

      const request = new NextRequest('http://localhost:3000/api/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify(validOnboardingData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('user_not_found');
      expect(data.message).toBe('User account not found');
    });

    it('should reject request for unverified user', async () => {
      // Set user as unverified
      users.set(testUser.email, {
        ...testUser,
        verified: false,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify(validOnboardingData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('user_not_verified');
      expect(data.message).toBe('Please verify your email before completing onboarding');
    });

    it('should remove duplicate interests', async () => {
      const dataWithDuplicates = {
        ...validOnboardingData,
        interests: ['technology', 'business', 'technology', 'science'], // 'technology' appears twice
      };

      const request = new NextRequest('http://localhost:3000/api/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify(dataWithDuplicates),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.preferences.interests).toEqual(['technology', 'business', 'science']);
      expect(data.preferences.interests.length).toBe(3);
    });

    it('should handle all valid interest categories', async () => {
      const allValidInterests = [
        'technology', 'business', 'science', 'health-fitness', 'education',
        'entertainment', 'sports', 'news-politics', 'arts-culture', 'travel',
        'food-cooking', 'lifestyle', 'gaming', 'finance', 'environment'
      ];

      const dataWithAllInterests = {
        ...validOnboardingData,
        interests: allValidInterests,
      };

      const request = new NextRequest('http://localhost:3000/api/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify(dataWithAllInterests),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should validate boundary values for session duration', async () => {
      const testCases = [
        { duration: 15, shouldPass: true },  // Minimum
        { duration: 240, shouldPass: true }, // Maximum
        { duration: 14, shouldPass: false }, // Below minimum
        { duration: 241, shouldPass: false }, // Above maximum
      ];

      for (const testCase of testCases) {
        const testData = {
          ...validOnboardingData,
          defaultSessionDuration: testCase.duration,
        };

        const request = new NextRequest('http://localhost:3000/api/auth/onboarding', {
          method: 'POST',
          body: JSON.stringify(testData),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await POST(request);
        
        if (testCase.shouldPass) {
          expect(response.status).toBe(200);
        } else {
          expect(response.status).toBe(400);
        }
      }
    });

    it('should validate boundary values for daily time limit', async () => {
      const testCases = [
        { limit: -1, shouldPass: true },   // Unlimited
        { limit: 30, shouldPass: true },   // Minimum
        { limit: 480, shouldPass: true },  // Maximum
        { limit: 29, shouldPass: false },  // Below minimum
        { limit: 481, shouldPass: false }, // Above maximum
        { limit: 0, shouldPass: false },   // Invalid
      ];

      for (const testCase of testCases) {
        const testData = {
          ...validOnboardingData,
          dailyTimeLimit: testCase.limit,
        };

        const request = new NextRequest('http://localhost:3000/api/auth/onboarding', {
          method: 'POST',
          body: JSON.stringify(testData),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await POST(request);
        
        if (testCase.shouldPass) {
          expect(response.status).toBe(200);
        } else {
          expect(response.status).toBe(400);
        }
      }
    });

    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/onboarding', {
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
      expect(data.message).toBe('Failed to complete onboarding. Please try again.');
    });

    it('should handle missing required fields', async () => {
      const testCases = [
        { ...validOnboardingData, interests: undefined },
        { ...validOnboardingData, defaultSessionDuration: undefined },
        { ...validOnboardingData, dailyTimeLimit: undefined },
        { ...validOnboardingData, maxSessionsPerDay: undefined },
      ];

      for (const testData of testCases) {
        const request = new NextRequest('http://localhost:3000/api/auth/onboarding', {
          method: 'POST',
          body: JSON.stringify(testData),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
      }
    });

    it('should handle non-numeric values for numeric fields', async () => {
      const testCases = [
        { ...validOnboardingData, defaultSessionDuration: 'not-a-number' },
        { ...validOnboardingData, dailyTimeLimit: 'not-a-number' },
        { ...validOnboardingData, maxSessionsPerDay: 'not-a-number' },
      ];

      for (const testData of testCases) {
        const request = new NextRequest('http://localhost:3000/api/auth/onboarding', {
          method: 'POST',
          body: JSON.stringify(testData),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
      }
    });
  });

  describe('GET /api/auth/onboarding', () => {
    it('should return onboarding status when completed', async () => {
      // Set up completed onboarding
      const completedData = {
        email: testUser.email,
        interests: ['technology', 'business', 'science'],
        defaultSessionDuration: 30,
        dailyTimeLimit: 120,
        maxSessionsPerDay: 3,
        completedAt: new Date(),
      };
      onboardingPreferences.set(testUser.email, completedData);

      const request = new NextRequest('http://localhost:3000/api/auth/onboarding', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.completed).toBe(true);
      expect(data.preferences).toEqual({
        interests: completedData.interests,
        defaultSessionDuration: completedData.defaultSessionDuration,
        dailyTimeLimit: completedData.dailyTimeLimit,
        maxSessionsPerDay: completedData.maxSessionsPerDay,
        completedAt: completedData.completedAt.toISOString(),
      });
    });

    it('should return not completed status when onboarding not done', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/onboarding', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.completed).toBe(false);
      expect(data.message).toBe('Onboarding not yet completed');
    });

    it('should reject request without authentication', async () => {
      mockGetAuthenticatedUser.mockReturnValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/onboarding', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('unauthorized');
      expect(data.message).toBe('Please log in to view onboarding status');
    });

    it('should handle server errors gracefully', async () => {
      // Force an error by making getAuthenticatedUser throw
      mockGetAuthenticatedUser.mockImplementation(() => {
        throw new Error('Database error');
      });

      const request = new NextRequest('http://localhost:3000/api/auth/onboarding', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('server_error');
      expect(data.message).toBe('Failed to get onboarding status');
    });
  });
}); 