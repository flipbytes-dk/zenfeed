import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/utils';
import { users } from '@/lib/stores/verification-store';

export async function GET(request: NextRequest) {
  try {
    // Validate session server-side using our auth utilities
    const session = getAuthenticatedUser(request);
    
    if (!session) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user data from store
    const user = users.get(session.email);
    
    if (!user) {
      return NextResponse.json(
        { error: 'user_not_found', message: 'User not found' },
        { status: 404 }
      );
    }

    // Return user information (exclude sensitive data like password hash)
    return NextResponse.json(
      {
        user: {
          email: user.email,
          verified: user.verified,
          createdAt: user.createdAt,
        },
        session: {
          expires: session.expires,
          createdAt: session.createdAt,
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
} 