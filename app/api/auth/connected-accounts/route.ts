import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/utils';
import { PrismaClient } from '@/lib/generated/prisma';

export async function GET(request: NextRequest) {
  const prisma = new PrismaClient();
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
    } = { connected: false };
    if (ytAccount) {
      youtube = {
        connected: true,
        providerAccountId: ytAccount.providerAccountId,
      };
    }

    return NextResponse.json({ instagram, youtube });
  } catch (err) {
    console.error('Connected accounts error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 