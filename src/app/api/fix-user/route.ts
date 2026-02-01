import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function POST() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Create or update user with proper defaults
        const user = await db.user.upsert({
            where: { clerkId: userId },
            update: {
                credits: '10',
                tier: 'Free',
            },
            create: {
                clerkId: userId,
                email: 'temp@example.com', // You can update this later
                name: 'User',
                credits: '10',
                tier: 'Free',
            },
        });

        return NextResponse.json({
            message: 'User fixed successfully',
            user: {
                credits: user.credits,
                tier: user.tier
            }
        });
    } catch (error) {
        console.error('Fix user error:', error);
        return NextResponse.json({
            error: 'Failed to fix user',
            details: String(error)
        }, { status: 500 });
    }
}