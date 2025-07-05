import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@/lib/generated/prisma';

const prisma = new PrismaClient();

// Helper function to generate verification token
function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Helper function to send verification email using Resend
async function sendVerificationEmail(email: string, token: string): Promise<boolean> {
  try {
    const { Resend } = await import('resend');
    
    // Debug: Check if API key is loaded
    console.log('RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
    console.log('RESEND_API_KEY starts with re_:', process.env.RESEND_API_KEY?.startsWith('re_'));
    
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set in environment variables');
      return false;
    }
    
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const verificationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
    
    const fromEmail = process.env.FROM_EMAIL || 'ZenFeed <onboarding@resend.dev>';
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: 'Verify your ZenFeed account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to ZenFeed!</h2>
          <p>Please click the link below to verify your email address and activate your account:</p>
          <a href="${verificationLink}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">Verify Email</a>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationLink}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create this account, please ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Failed to send verification email:', error);
      return false;
    }

    console.log('Verification email sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
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

    // Check if user already exists in database
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'user_exists', message: 'User already exists with this email' },
        { status: 409 }
      );
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user (unverified) in database
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        verified: false,
      },
    });

    // Generate verification token
    const token = generateVerificationToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store verification token in database
    await prisma.verificationToken.create({
      data: {
        token,
        userId: user.id,
        expires,
        used: false,
      },
    });

    // Send verification email
    const emailSent = await sendVerificationEmail(email, token);

    if (!emailSent) {
      // Clean up user if email failed
      await prisma.verificationToken.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
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