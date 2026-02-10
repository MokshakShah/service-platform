import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function POST() {
    try {
        const { userId } = await auth();
        
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Manually upgrade user to Pro (since they already paid)
        const user = await db.user.update({
            where: { clerkId: userId },
            data: {
                tier: 'Pro',
                credits: '100',
            },
        });

        console.log(`Manually upgraded user ${user.email} to Pro with 100 credits`);

        return NextResponse.json({
            message: 'Account upgraded to Pro successfully',
            user: {
                id: user.id,
                email: user.email,
                tier: user.tier,
                credits: user.credits
            }
        });
    } catch (error) {
        console.error('Manual upgrade error:', error);
        return NextResponse.json({
            error: 'Failed to upgrade account',
            details: String(error)
        }, { status: 500 });
    }
}