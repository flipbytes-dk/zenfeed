import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthenticatedUser } from '@/lib/auth/utils';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const session = getAuthenticatedUser(req);
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sources = await prisma.contentSource.findMany({ where: { userId: session.userId } });
  return NextResponse.json(sources);
}

export async function POST(req: NextRequest) {
  const session = getAuthenticatedUser(req);
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const data = await req.json();
  if (!data.type || !data.name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const source = await prisma.contentSource.create({
    data: {
      userId: session.userId,
      type: data.type,
      name: data.name,
      url: data.url,
      username: data.username,
      priority: data.priority || 'medium',
      active: data.active !== undefined ? data.active : true,
      description: data.description,
    },
  });
  return NextResponse.json(source, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = getAuthenticatedUser(req);
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const data = await req.json();
  if (!data.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const existing = await prisma.contentSource.findUnique({ where: { id: data.id } });
  if (!existing || existing.userId !== session.userId) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const updated = await prisma.contentSource.update({
    where: { id: data.id },
    data: {
      type: data.type,
      name: data.name,
      url: data.url,
      username: data.username,
      priority: data.priority,
      active: data.active,
      description: data.description,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = getAuthenticatedUser(req);
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const existing = await prisma.contentSource.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.userId) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  await prisma.contentSource.delete({ where: { id } });
  return NextResponse.json({ success: true });
} 