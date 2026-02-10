import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function POST() {
    try {
        const { userId } = await auth();
        const user = await currentUser();
        
        console.log('Fix user - userId:', userId);
        console.log('Fix user - user:', user);
        
        if (!userId || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's actual email and name from Clerk
        const email = user.emailAddresses?.[0]?.emailAddress || 'temp@example.com';
        const name = user.firstName || user.username || 'User';

        // Create or update user with proper defaults
        const dbUser = await db.user.upsert({
            where: { clerkId: userId },
            update: {
                email,
                name,
                credits: '10',
                tier: 'Free',
            },
            create: {
                clerkId: userId,
                email,
                name,
                profileImage: user.imageUrl || '',
                credits: '10',
                tier: 'Free',
            },
        });

        console.log('Fix user - created/updated user:', dbUser);

        return NextResponse.json({
            message: 'User fixed successfully',
            user: {
                id: dbUser.id,
                clerkId: dbUser.clerkId,
                email: dbUser.email,
                name: dbUser.name,
                credits: dbUser.credits,
                tier: dbUser.tier
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