import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/utils';
import { 
  users, 
  onboardingPreferences,
  OnboardingData
} from '@/lib/stores/verification-store';

// Valid interest categories (matching frontend)
const VALID_INTERESTS = [
  'technology', 'business', 'science', 'health-fitness', 'education',
  'entertainment', 'sports', 'news-politics', 'arts-culture', 'travel',
  'food-cooking', 'lifestyle', 'gaming', 'finance', 'environment'
];

export async function POST(request: NextRequest) {
  try {
    // Validate user session
    const session = getAuthenticatedUser(request);
    if (!session || !session.email) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Please log in to complete onboarding' },
        { status: 401 }
      );
    }

    const { interests, defaultSessionDuration, dailyTimeLimit, maxSessionsPerDay } = await request.json();

    // Validation
    if (!interests || !Array.isArray(interests)) {
      return NextResponse.json(
        { error: 'invalid_interests', message: 'Interests must be provided as an array' },
        { status: 400 }
      );
    }

    if (interests.length < 3 || interests.length > 15) {
      return NextResponse.json(
        { error: 'invalid_interests_count', message: 'Please select between 3 and 15 interests' },
        { status: 400 }
      );
    }

    // Validate all interests are from allowed list
    const invalidInterests = interests.filter(interest => !VALID_INTERESTS.includes(interest));
    if (invalidInterests.length > 0) {
      return NextResponse.json(
        { error: 'invalid_interest_values', message: `Invalid interests: ${invalidInterests.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate session duration (15 minutes to 4 hours = 240 minutes)
    if (typeof defaultSessionDuration !== 'number' || defaultSessionDuration < 15 || defaultSessionDuration > 240) {
      return NextResponse.json(
        { error: 'invalid_session_duration', message: 'Session duration must be between 15 and 240 minutes' },
        { status: 400 }
      );
    }

    // Validate daily time limit (-1 for unlimited, or 30 minutes to 8 hours = 480 minutes)
    if (typeof dailyTimeLimit !== 'number' || 
        (dailyTimeLimit !== -1 && (dailyTimeLimit < 30 || dailyTimeLimit > 480))) {
      return NextResponse.json(
        { error: 'invalid_daily_limit', message: 'Daily limit must be -1 (unlimited) or between 30 and 480 minutes' },
        { status: 400 }
      );
    }

    // Validate sessions per day (1 to 10)
    if (typeof maxSessionsPerDay !== 'number' || maxSessionsPerDay < 1 || maxSessionsPerDay > 10) {
      return NextResponse.json(
        { error: 'invalid_sessions_count', message: 'Sessions per day must be between 1 and 10' },
        { status: 400 }
      );
    }

    // Check if user exists and is verified
    const user = users.get(session.email);
    if (!user) {
      return NextResponse.json(
        { error: 'user_not_found', message: 'User account not found' },
        { status: 404 }
      );
    }

    if (!user.verified) {
      return NextResponse.json(
        { error: 'user_not_verified', message: 'Please verify your email before completing onboarding' },
        { status: 400 }
      );
    }

    // Create onboarding data
    const onboardingData: OnboardingData = {
      email: session.email,
      interests: [...new Set(interests)], // Remove duplicates
      defaultSessionDuration,
      dailyTimeLimit,
      maxSessionsPerDay,
      completedAt: new Date()
    };

    // Store onboarding preferences
    onboardingPreferences.set(session.email, onboardingData);

    // Update user to mark onboarding as completed
    users.set(session.email, {
      ...user,
      onboardingCompleted: true
    });

    console.log(`Onboarding completed for user: ${session.email}`);
    console.log(`Preferences: ${interests.length} interests, ${defaultSessionDuration}min sessions, ${dailyTimeLimit === -1 ? 'unlimited' : dailyTimeLimit + 'min'} daily limit`);

    return NextResponse.json(
      { 
        message: 'Onboarding completed successfully!',
        preferences: {
          interests: onboardingData.interests,
          defaultSessionDuration: onboardingData.defaultSessionDuration,
          dailyTimeLimit: onboardingData.dailyTimeLimit,
          maxSessionsPerDay: onboardingData.maxSessionsPerDay
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Onboarding completion error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Failed to complete onboarding. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Validate user session
    const session = getAuthenticatedUser(request);
    if (!session || !session.email) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Please log in to view onboarding status' },
        { status: 401 }
      );
    }

    // Get user onboarding data
    const onboardingData = onboardingPreferences.get(session.email);

    if (!onboardingData) {
      return NextResponse.json(
        { 
          completed: false,
          message: 'Onboarding not yet completed'
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { 
        completed: true,
        preferences: {
          interests: onboardingData.interests,
          defaultSessionDuration: onboardingData.defaultSessionDuration,
          dailyTimeLimit: onboardingData.dailyTimeLimit,
          maxSessionsPerDay: onboardingData.maxSessionsPerDay,
          completedAt: onboardingData.completedAt
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Get onboarding status error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Failed to get onboarding status' },
      { status: 500 }
    );
  }
} 