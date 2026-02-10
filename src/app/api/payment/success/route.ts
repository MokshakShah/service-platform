import { NextResponse, NextRequest } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await req.json();
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET, {
      typescript: true,
      apiVersion: '2023-10-16',
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    // Get subscription details
    let tier = 'Free';
    let credits = '10';
    
    if (session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      const price = subscription.items.data[0].price;
      
      // Map based on price nickname or amount
      if (price.nickname === 'Pro' || price.unit_amount === 2999) {
        tier = 'Pro';
        credits = '100';
      } else if (price.nickname === 'Unlimited' || price.unit_amount === 9999) {
        tier = 'Unlimited';
        credits = 'unlimited';
      }
    }

    // Update user in database
    const user = await db.user.update({
      where: { clerkId: userId },
      data: { tier, credits },
    });

    console.log(`Updated user ${user.email} to ${tier} with ${credits} credits`);

    return NextResponse.json({
      success: true,
      tier,
      credits,
      message: 'Subscription updated successfully'
    });

  } catch (error: any) {
    console.error('Payment success error:', error);
    return NextResponse.json({
      error: 'Failed to process payment success',
      details: error.message
    }, { status: 500 });
  }
}