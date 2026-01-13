import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.type !== 'user.created') {
      return NextResponse.json({ status: 'ignored', reason: 'Not a user.created event' }, { status: 200 });
    }
    const user = body.data;
    const email = user.email_addresses?.[0]?.email_address || '';
    await db.user.upsert({
      where: { clerkId: user.id },
      update: {
        email,
        name: user.first_name || '',
        profileImage: user.image_url || '',
      },
      create: {
        clerkId: user.id,
        email,
        name: user.first_name || '',
        profileImage: user.image_url || '',
      },
    });
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('Error updating database:', error);
    return NextResponse.json({ status: 'error', error: String(error) }, { status: 500 });
  }
}
