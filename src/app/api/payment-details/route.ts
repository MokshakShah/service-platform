import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const { userId } = await auth();
    console.log('Payment-details API - userId:', userId);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const connection = await db.user.findFirst({
      where: { clerkId: userId },
    });
    
    console.log('Payment-details API - user data:', connection);
    
    if (!connection) {
      console.log('No user found for clerkId:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json(connection);
  } catch (error) {
    console.error('Payment-details API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
