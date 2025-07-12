import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/utils';
import { PrismaClient } from '@/lib/generated/prisma';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = requireAuth(request);
    const userId = session.userId;

    // Instagram
    const igAccount = await prisma.userSocialAccount.findFirst({
      where: {
        userId,
        provider: 'instagram',
      },
    });

    let instagram: {
      connected: boolean;
      providerAccountId?: string;
    } = { connected: false };
    if (igAccount) {
      instagram = {
        connected: true,
        providerAccountId: igAccount.providerAccountId,
      };
    }

    // YouTube
    const ytAccount = await prisma.userSocialAccount.findFirst({
      where: {
        userId,
        provider: 'youtube',
      },
    });

    let youtube: {
      connected: boolean;
      providerAccountId?: string;
      username?: string;
    } = { connected: false };
    if (ytAccount) {
      youtube = {
        connected: true,
        providerAccountId: ytAccount.providerAccountId,
        // Username is not stored, but could be fetched if needed
      };
    }

    return NextResponse.json({ instagram, youtube });
  } catch (error) {
    console.error('Connected accounts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 