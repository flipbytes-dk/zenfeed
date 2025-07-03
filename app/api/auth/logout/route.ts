import { NextRequest, NextResponse } from 'next/server';
import { sessions } from '@/lib/stores/verification-store';

export async function POST(request: NextRequest) {
  try {
    // Get session token from cookies
    const sessionToken = request.cookies.get('session')?.value;

    if (sessionToken) {
      // Remove session from server store
      sessions.delete(sessionToken);
    }

    // Create response
    const response = NextResponse.json(
      { message: 'Logout successful' },
      { status: 200 }
    );

    // Clear session cookie
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Immediate expiry
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Also support GET for logout links
export async function GET(request: NextRequest) {
  return POST(request);
} 