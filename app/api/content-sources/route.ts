import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/lib/generated/prisma';
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
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const data = await req.json();
  
  // Validate required fields
  if (!data.type || !data.name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Validate field types and lengths
  if (typeof data.type !== 'string' || data.type.length > 50) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }
  if (typeof data.name !== 'string' || data.name.length > 100) {
    return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
  }
  if (data.url && (typeof data.url !== 'string' || data.url.length > 500)) {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }
  if (data.priority && !['low', 'medium', 'high'].includes(data.priority)) {
    return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
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
      ...(data.type !== undefined && { type: data.type }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.url !== undefined && { url: data.url }),
      ...(data.username !== undefined && { username: data.username }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.active !== undefined && { active: data.active }),
      ...(data.description !== undefined && { description: data.description }),
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