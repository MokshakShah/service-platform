import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch workflows for this user using clerkId
    const workflows = await db.workflows.findMany({
      where: { userId },
    });
    
    return NextResponse.json(workflows);
  } catch (error: any) {
    console.error('Workflows API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch workflows' },
      { status: 500 }
    );
  }
}
