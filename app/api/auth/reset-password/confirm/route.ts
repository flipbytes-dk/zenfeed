import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { users, passwordResets } from '@/lib/stores/verification-store';

export async function POST(request: NextRequest) {
  try {
    const { email, token, password } = await request.json();

    // Validation
    if (!email || !token || !password) {
      return NextResponse.json(
        { error: 'missing_fields', message: 'Email, token, and password are required' },
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

    // Check if user exists
    const user = users.get(email);
    if (!user) {
      return NextResponse.json(
        { error: 'user_not_found', message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if reset token exists
    const resetData = passwordResets.get(email);
    if (!resetData) {
      return NextResponse.json(
        { error: 'invalid_token', message: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Validate token
    if (resetData.token !== token) {
      return NextResponse.json(
        { error: 'invalid_token', message: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Check if token has been used
    if (resetData.used) {
      return NextResponse.json(
        { error: 'token_used', message: 'Reset token has already been used' },
        { status: 400 }
      );
    }

    // Check if token has expired
    const now = new Date();
    if (now > resetData.expires) {
      // Clean up expired token
      passwordResets.delete(email);
      return NextResponse.json(
        { error: 'token_expired', message: 'Reset token has expired' },
        { status: 400 }
      );
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update user password
    users.set(email, {
      ...user,
      passwordHash: passwordHash,
    });

    // Mark token as used and clean up
    passwordResets.delete(email);

    return NextResponse.json(
      { 
        message: 'Password successfully updated! You can now sign in with your new password.',
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Password reset confirmation error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
} 