import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/utils';
import { encryptToken } from '@/lib/utils';
import { PrismaClient } from '@/lib/generated/prisma';

export async function GET(request: NextRequest) {
  // Move env var validation inside the handler
  const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
  const YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
  const YOUTUBE_REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI;
  if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET || !YOUTUBE_REDIRECT_URI) {
    return NextResponse.json({ success: false, error: 'Missing YouTube OAuth environment variables' }, { status: 500 });
  }

  const prisma = new PrismaClient();

  try {
    const session = requireAuth(request);
    const userId = session.userId;
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    if (!code) {
      return NextResponse.json({ success: false, error: 'Missing code parameter' }, { status: 400 });
    }

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: YOUTUBE_CLIENT_ID!,
        client_secret: YOUTUBE_CLIENT_SECRET!,
        redirect_uri: YOUTUBE_REDIRECT_URI!,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) {
      const error = await tokenRes.text();
      console.error('YouTube token exchange failed:', error);
      return NextResponse.json({ error: 'Failed to connect YouTube account. Please try again.' }, { status: 500 });
    }
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    if (!accessToken) {
      return NextResponse.json({ error: 'No access token received' }, { status: 500 });
    }

    // Fetch YouTube channel info
    const userRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userRes.ok) {
      const error = await userRes.text();
      console.error('YouTube channel info fetch failed:', error);
      return NextResponse.json({ error: 'Failed to fetch YouTube channel info.' }, { status: 500 });
    }
    const userData = await userRes.json();
    const channel = userData.items?.[0];
    if (!channel) {
      return NextResponse.json({ error: 'No YouTube channel found' }, { status: 500 });
    }
    const providerAccountId = channel.id;
    const username = channel.snippet?.title;

    // Prevent linking the same YouTube account to multiple users
    const existingAccount = await prisma.userSocialAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'youtube',
          providerAccountId,
        },
      },
    });
    if (existingAccount && existingAccount.userId !== userId) {
      return NextResponse.json({ error: 'This YouTube account is already connected to another user.' }, { status: 409 });
    }

    // Store or update the social account in DB
    await prisma.userSocialAccount.upsert({
      where: {
        provider_providerAccountId: {
          provider: 'youtube',
          providerAccountId,
        },
      },
      update: {
        userId: userId,
        accessToken: encryptToken(accessToken),
        refreshToken: refreshToken ? encryptToken(refreshToken) : undefined,
      },
      create: {
        userId: userId,
        provider: 'youtube',
        providerAccountId,
        accessToken: encryptToken(accessToken),
        refreshToken: refreshToken ? encryptToken(refreshToken) : undefined,
      },
    });

    return NextResponse.json({ success: true, message: 'YouTube account connected successfully', username });
  } catch (err) {
    console.error('YouTube OAuth callback error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 