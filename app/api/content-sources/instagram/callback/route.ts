import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/lib/generated/prisma';
import { requireAuth } from '@/lib/auth/utils';
import { encryptToken } from '@/lib/utils';

const prisma = new PrismaClient();

const INSTAGRAM_CLIENT_ID = process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID;
const INSTAGRAM_CLIENT_SECRET = process.env.INSTAGRAM_CLIENT_SECRET;
const INSTAGRAM_REDIRECT_URI = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI;

if (!INSTAGRAM_CLIENT_ID || !INSTAGRAM_CLIENT_SECRET || !INSTAGRAM_REDIRECT_URI) {
  throw new Error('Missing Instagram OAuth environment variables');
}

export async function GET(req: NextRequest) {
  try {
    // Require user authentication
    const session = requireAuth(req);
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    if (!code) {
      return NextResponse.json({ error: 'Missing code parameter' }, { status: 400 });
    }

    // Exchange code for access token
    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: INSTAGRAM_CLIENT_ID!,
        client_secret: INSTAGRAM_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        redirect_uri: INSTAGRAM_REDIRECT_URI!,
        code,
      }),
    });

    if (!tokenRes.ok) {
      const error = await tokenRes.text();
      console.error('Instagram token exchange failed:', error);
      return NextResponse.json({ error: 'Failed to connect Instagram account. Please try again.' }, { status: 500 });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return NextResponse.json({ error: 'No access token received' }, { status: 500 });
    }

    // Fetch Instagram user id and username
    const userRes = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`);
    if (!userRes.ok) {
      const error = await userRes.text();
      console.error('Instagram user info fetch failed:', error);
      return NextResponse.json({ error: 'Failed to fetch Instagram user info.' }, { status: 500 });
    }
    const userData = await userRes.json();
    const providerAccountId = userData.id;
    if (!providerAccountId) {
      return NextResponse.json({ error: 'No Instagram user id received' }, { status: 500 });
    }

    // Store or update the social account in DB
    await prisma.userSocialAccount.upsert({
      where: {
        provider_providerAccountId: {
          provider: 'instagram',
          providerAccountId,
        },
      },
      update: {
        userId: session.userId,
        accessToken: encryptToken(accessToken),
        // Optionally: refreshToken, expiresAt
      },
      create: {
        userId: session.userId,
        provider: 'instagram',
        providerAccountId,
        accessToken: encryptToken(accessToken),
      },
    });

    // Respond with success (do not expose token)
    return NextResponse.json({
      success: true,
      message: 'Instagram account connected successfully',
      redirectUrl: '/dashboard/content-sources?connected=instagram',
    });
  } catch (error) {
    console.error('Instagram OAuth callback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 