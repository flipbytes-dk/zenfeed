import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { users, pendingVerifications, TOKEN_EXPIRY_MS } from '@/lib/stores/verification-store';

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
    const { email, password } = await request.json();

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'missing_fields', message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email) || 
        email.includes('..') || 
        email.startsWith('.') || 
        email.endsWith('.') ||
        email.includes(' ')) {
      return NextResponse.json(
        { error: 'invalid_email', message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Password validation
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'weak_password', message: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check if user already exists
    if (users.has(email)) {
      return NextResponse.json(
        { error: 'user_exists', message: 'User already exists with this email' },
        { status: 409 }
      );
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user (unverified)
    users.set(email, {
      email,
      passwordHash,
      verified: false,
      createdAt: new Date(),
    });

    // Generate verification token
    const token = generateVerificationToken();
    const expires = new Date(Date.now() + TOKEN_EXPIRY_MS);

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
      // Clean up user if email failed
      users.delete(email);
      pendingVerifications.delete(email);
      
      return NextResponse.json(
        { error: 'email_failed', message: 'Failed to send verification email' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Registration successful! Please check your email to verify your account.',
        email: email 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
} 