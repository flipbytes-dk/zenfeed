import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/utils';
import { PrismaClient } from '@/lib/generated/prisma';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Validate session server-side using our auth utilities
    const session = getAuthenticatedUser(request);
    
    if (!session) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user data from database
    const user = await prisma.user.findUnique({ where: { email: session.email } });
    
    if (!user) {
      return NextResponse.json(
        { error: 'user_not_found', message: 'User not found' },
        { status: 404 }
      );
    }

    // Return user information (exclude sensitive data like password hash)
    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          verified: user.verified,
          createdAt: user.createdAt,
        },
        session: {
          expires: session.expires,
          createdAt: session.createdAt,
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
} 