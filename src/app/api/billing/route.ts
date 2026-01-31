import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const session_id = new URL(request.url).searchParams.get('session_id');
  if (!session_id) {
    return NextResponse.json({ error: 'Session ID is missing' }, { status: 400 });
  }
  const connection = await db.user.findFirst({
    where: { clerkId: userId },
  });
  return NextResponse.json(connection);
}
