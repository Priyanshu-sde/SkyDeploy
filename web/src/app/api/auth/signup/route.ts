import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function POST(req: NextRequest) {
  const { email, name, password } = await req.json();
  if (!email || !password || !name) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'User already exists' }, { status: 400 });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      name,
      hashedPassword,
    },
  });
  return NextResponse.json({ id: user.id, email: user.email });
} 