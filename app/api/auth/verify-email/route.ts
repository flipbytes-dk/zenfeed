import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { pendingVerifications } from '@/lib/stores/verification-store';

export async function POST(request: NextRequest) {
  try {
    const { token, email } = await request.json();

    if (!token || !email) {
      return NextResponse.json(
        { error: 'missing_params', message: 'Token and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'invalid_email', message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate token format (hex string)
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return NextResponse.json(
        { error: 'invalid_token', message: 'Invalid token format' },
        { status: 400 }
      );
    }

    // TODO: Replace with database lookup
    const verification = pendingVerifications.get(email);

    if (!verification) {
      return NextResponse.json(
        { error: 'not_found', message: 'Verification request not found' },
        { status: 404 }
      );
    }

    if (verification.verified) {
      return NextResponse.json(
        { error: 'already_verified', message: 'Email already verified' },
        { status: 400 }
      );
    }

    if (new Date() > verification.expires) {
      return NextResponse.json(
        { error: 'expired', message: 'Verification token has expired' },
        { status: 400 }
      );
    }

    // Use constant-time comparison to prevent timing attacks
    if (!timingSafeEqual(Buffer.from(verification.token), Buffer.from(token))) {
      return NextResponse.json(
        { error: 'invalid_token', message: 'Invalid verification token' },
        { status: 400 }
      );
    }

    // Mark as verified
    verification.verified = true;
    pendingVerifications.set(email, verification);

    // TODO: Update user status in database
    console.log(`Email verified for: ${email}`);

    return NextResponse.json(
      { message: 'Email verified successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
} 