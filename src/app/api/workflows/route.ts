import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const { userId } = await auth();
    
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
