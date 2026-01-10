import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { userId } = getAuth(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const workflows = await db.workflows.findMany({
    where: { userId },
  });
  return NextResponse.json(workflows);
}
