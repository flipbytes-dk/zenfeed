import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// TODO: Replace with actual database integration
// This should match the store in verify-email/route.ts
const pendingVerifications = new Map<string, {
  email: string;
  token: string;
  expires: Date;
  verified: boolean;
}>();

// Helper function to generate verification token
function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Helper function to send verification email (mock implementation)
async function sendVerificationEmail(email: string, token: string): Promise<boolean> {
  // TODO: Replace with actual email service (SendGrid, AWS SES, etc.)
  console.log(`Sending verification email to: ${email}`);
  console.log(`Verification link: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`);
  
  // Simulate email sending
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), 100);
  });
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'missing_email', message: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if email format is valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'invalid_email', message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // TODO: Check if user exists in database
    // For now, we'll allow resending for any email

    const existingVerification = pendingVerifications.get(email);
    if (existingVerification && existingVerification.verified) {
      return NextResponse.json(
        { error: 'already_verified', message: 'Email is already verified' },
        { status: 400 }
      );
    }

    // Generate new verification token
    const token = generateVerificationToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store verification request
    pendingVerifications.set(email, {
      email,
      token,
      expires,
      verified: false,
    });

    // Send verification email
    const emailSent = await sendVerificationEmail(email, token);

    if (!emailSent) {
      return NextResponse.json(
        { error: 'email_failed', message: 'Failed to send verification email' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Verification email sent successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
} 