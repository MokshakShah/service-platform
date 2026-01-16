import { NextResponse, NextRequest } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { userId } = getAuth(request);
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
