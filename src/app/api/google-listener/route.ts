import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const listener = await db.user.findUnique({
    where: { clerkId: userId },
    select: { googleResourceId: true },
  });
  return NextResponse.json(listener);
}
