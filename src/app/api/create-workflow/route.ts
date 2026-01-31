import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description } = await request.json();

    const workflow = await db.workflows.create({
      data: {
        userId,
        name,
        description
      },
    });

    if (workflow) {
      return NextResponse.json({ message: 'Workflow created' });
    }

    return NextResponse.json({ message: 'Failed to create workflow' }, { status: 500 });
  } catch (error: any) {
    console.error('Create workflow error:', error);
    return NextResponse.json(
      { message: error?.message || 'Oops! Pls try again' },
      { status: 500 }
    );
  }
}
