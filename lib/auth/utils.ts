import { NextRequest } from 'next/server';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { sessions } from '@/lib/stores/verification-store';

export interface AuthSession {
  userId: string;
  email: string;
  expires: Date;
  createdAt: Date;
}

export interface AuthUser {
  email: string;
  verified: boolean;
  createdAt: Date;
}

/**
 * Get session from request cookies
 */
export function getSessionFromRequest(request: NextRequest): string | null {
  return request.cookies.get('session')?.value || null;
}

/**
 * Validate session token and return session data
 */
export function validateSession(sessionToken: string): AuthSession | null {
  if (!sessionToken) {
    return null;
  }

  const session = sessions.get(sessionToken);
  if (!session) {
    return null;
  }

  // Check if session is expired
  if (new Date() > session.expires) {
    // Clean up expired session
    sessions.delete(sessionToken);
    return null;
  }

  return session;
}

/**
 * Get authenticated user from request
 */
export function getAuthenticatedUser(request: NextRequest): AuthSession | null {
  const sessionToken = getSessionFromRequest(request);
  if (!sessionToken) {
    return null;
  }

  return validateSession(sessionToken);
}

/**
 * Check if request is from authenticated user
 */
export function isAuthenticated(request: NextRequest): boolean {
  return getAuthenticatedUser(request) !== null;
}

/**
 * Require authentication for API routes
 * Returns the authenticated session or throws an error response
 */
export function requireAuth(request: NextRequest): AuthSession {
  const session = getAuthenticatedUser(request);
  if (!session) {
    throw new Response(
      JSON.stringify({ error: 'unauthorized', message: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return session;
}

/**
 * Clean up expired sessions (can be called periodically)
 */
export function cleanupExpiredSessions(): number {
  const now = new Date();
  let cleanedCount = 0;

  for (const [token, session] of sessions.entries()) {
    if (now > session.expires) {
      sessions.delete(token);
      cleanedCount++;
    }
  }

  return cleanedCount;
}

/**
 * Check if a user needs to complete onboarding
 * @returns Promise<boolean> - true if onboarding is needed
 */
export async function checkOnboardingStatus(): Promise<{ needsOnboarding: boolean; error?: string }> {
  try {
    const response = await fetch('/api/auth/onboarding', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return { needsOnboarding: true, error: 'Failed to check onboarding status' };
    }

    const data = await response.json();
    return { needsOnboarding: !data.onboardingCompleted };
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return { needsOnboarding: true, error: 'Network error' };
  }
}

/**
 * Redirect user to appropriate page after authentication
 * @param router - Next.js router instance
 * @param redirectTo - Optional redirect URL
 */
export async function handlePostAuthRedirect(router: AppRouterInstance, redirectTo?: string) {
  try {
    const { needsOnboarding, error } = await checkOnboardingStatus();
    
    if (error) {
      console.warn('Onboarding check failed, redirecting to dashboard:', error);
      router.push(redirectTo || '/dashboard');
      return;
    }

    if (needsOnboarding) {
      router.push('/auth/onboarding');
    } else {
      router.push(redirectTo || '/dashboard');
    }
  } catch (error) {
    console.error('Error in post-auth redirect:', error);
    router.push(redirectTo || '/dashboard');
  }
} 