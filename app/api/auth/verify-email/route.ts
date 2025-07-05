import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/lib/generated/prisma';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { token, email } = await request.json();
    
    console.log('Email verification attempt:', { email, tokenLength: token?.length });

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

    // Look up user by email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: 'not_found', message: 'User not found' },
        { status: 404 }
      );
    }

    // Look up verification token
    const verification = await prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        token,
      },
    });

    if (!verification) {
      return NextResponse.json(
        { error: 'not_found', message: 'Verification request not found' },
        { status: 404 }
      );
    }

    if (verification.used) {
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

    // Mark user as verified and token as used atomically
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { verified: true },
      }),
      prisma.verificationToken.update({
        where: { id: verification.id },
        data: { used: true },
      }),
    ]);

    return NextResponse.json(
      { success: true, message: 'Email verified successfully' },
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