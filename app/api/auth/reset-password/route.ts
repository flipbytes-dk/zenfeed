import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { 
  users, 
  passwordResets, 
  resetAttempts,
  MAX_RESET_ATTEMPTS,
  RESET_WINDOW_MS,
  RESET_TOKEN_EXPIRY_MS
} from '@/lib/stores/verification-store';

// Helper function to generate password reset token
function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Helper function to send password reset email (mock implementation)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function sendPasswordResetEmail(email: string, _token: string): Promise<boolean> {
  // TODO: Replace with actual email service (SendGrid, AWS SES, etc.)
  console.log(`Sending password reset email to: ${email}`);
  console.log(`Password reset requested for email: ${email} at ${new Date().toISOString()}`);
  
  // Simulate email sending
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), 100);
  });
}

// Helper function to check rate limiting
function isRateLimited(email: string): boolean {
  const attempt = resetAttempts.get(email);
  if (!attempt) return false;

  const now = new Date();
  const timeSinceLastAttempt = now.getTime() - attempt.lastAttempt.getTime();

  // Reset counter if window has passed
  if (timeSinceLastAttempt > RESET_WINDOW_MS) {
    resetAttempts.delete(email);
    return false;
  }

  return attempt.count >= MAX_RESET_ATTEMPTS;
}

// Helper function to update rate limiting
function updateRateLimit(email: string): void {
  const attempt = resetAttempts.get(email);
  const now = new Date();

  if (!attempt || (now.getTime() - attempt.lastAttempt.getTime()) > RESET_WINDOW_MS) {
    resetAttempts.set(email, { count: 1, lastAttempt: now });
  } else {
    resetAttempts.set(email, { 
      count: attempt.count + 1, 
      lastAttempt: now 
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validation
    if (!email) {
      return NextResponse.json(
        { error: 'missing_fields', message: 'Email is required' },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'invalid_email', message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check rate limiting
    if (isRateLimited(email)) {
      return NextResponse.json(
        { error: 'rate_limited', message: 'Too many reset attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Check if user exists
    const user = users.get(email);

    // Always update rate limiting to prevent timing attacks
    updateRateLimit(email);

    // Only proceed with token generation if user exists and is verified
    if (user && user.verified) {
      // Invalidate any existing reset tokens for this email
      passwordResets.delete(email);

      // Generate reset token
      const token = generateResetToken();
      const expires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

      // Store password reset request
      passwordResets.set(email, {
        email,
        token,
        expires,
        used: false,
      });

      // Send reset email
      const emailSent = await sendPasswordResetEmail(email, token);

      if (!emailSent) {
        // Clean up reset token if email failed
        passwordResets.delete(email);
        
        return NextResponse.json(
          { error: 'email_failed', message: 'Failed to send password reset email' },
          { status: 500 }
        );
      }
    }

    // Always return the same success message to prevent enumeration
    return NextResponse.json(
      {
        message: 'If an account exists with this email, a password reset link has been sent.'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
} 