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

// Helper function to send password reset email using Resend
async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password/confirm?token=${token}&email=${encodeURIComponent(email)}`;
    
    const fromEmail = process.env.FROM_EMAIL || 'ZenFeed <onboarding@resend.dev>';
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: 'Reset your ZenFeed password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>You requested to reset your password for your ZenFeed account.</p>
          <p>Click the link below to set a new password:</p>
          <a href="${resetLink}" style="display: inline-block; background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">Reset Password</a>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetLink}</p>
          <p>This link will expire in 1 hour for security reasons.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Failed to send password reset email:', error);
      return false;
    }

    console.log('Password reset email sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
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
    if (!emailRegex.test(email) || email.includes('..') || email.startsWith('.') || email.endsWith('.') || email.includes(' ')) {
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