import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  const { userId } = getAuth(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { name, description } = await request.json();
  const workflow = await db.workflows.create({
    data: { userId, name, description },
  });
  if (workflow) return NextResponse.json({ message: 'workflow created' });
  return NextResponse.json({ message: 'Oops!Pls try again' }, { status: 500 });
}
