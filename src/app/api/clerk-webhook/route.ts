import { db } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  console.log('Clerk webhook received');
  try {
    const body = await req.json();
    console.log('Webhook body:', JSON.stringify(body, null, 2));
    
    if (body.type !== 'user.created') {
      console.log('Ignoring webhook - not a user.created event, type:', body.type);
      return NextResponse.json({ status: 'ignored', reason: 'Not a user.created event' }, { status: 200 });
    }
    
    const user = body.data;
    const email = user.email_addresses?.[0]?.email_address || '';
    const name = user.first_name || user.username || 'User';
    
    console.log('Creating/updating user:', {
      clerkId: user.id,
      email,
      name,
      profileImage: user.image_url
    });
    
    const dbUser = await db.user.upsert({
      where: { clerkId: user.id },
      update: {
        email,
        name,
        profileImage: user.image_url || '',
      },
      create: {
        clerkId: user.id,
        email,
        name,
        profileImage: user.image_url || '',
        credits: '10', // Explicitly set default credits
        tier: 'Free', // Explicitly set default tier
      },
    });
    
    console.log('User created/updated successfully:', dbUser);
    return NextResponse.json({ status: 'ok', user: dbUser }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ status: 'error', error: String(error) }, { status: 500 });
  }
}
