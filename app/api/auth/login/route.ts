import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { PrismaClient } from '@/lib/generated/prisma';
import { sessions } from '@/lib/stores/verification-store';

const prisma = new PrismaClient();
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Helper function to generate session token
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Input validation
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

    // Check if user exists in database
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: 'user_not_found', message: 'No account found with this email address' },
        { status: 404 }
      );
    }

    // Check if email is verified
    if (!user.verified) {
      return NextResponse.json(
        { error: 'email_not_verified', message: 'Please verify your email address before logging in' },
        { status: 403 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'invalid_credentials', message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create session token
    const sessionToken = generateSessionToken();
    const sessionExpiry = new Date(Date.now() + SESSION_EXPIRY_MS);

    // Store session in memory for auth utils
    sessions.set(sessionToken, {
      userId: user.id,
      email: user.email,
      expires: sessionExpiry,
      createdAt: new Date(),
    });

    // Create response with session cookie
    const response = NextResponse.json(
      {
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          verified: user.verified,
          createdAt: user.createdAt,
        },
      },
      { status: 200 }
    );

    // Set session cookie
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
} 