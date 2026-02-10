import { NextResponse, NextRequest } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET!, {
  typescript: true,
  apiVersion: '2023-10-16',
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    
    if (!signature) {
      console.error('No Stripe signature found');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }
    
    let event: Stripe.Event;
    
    try {
      // For development, you might not have webhook secret configured
      if (process.env.STRIPE_WEBHOOK_SECRET) {
        event = stripe.webhooks.constructEvent(
          body,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } else {
        // In development, parse the event directly (less secure but functional)
        event = JSON.parse(body);
        console.log('⚠️  Webhook signature verification skipped (development mode)');
      }
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('✅ Stripe webhook event received:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('💳 Checkout session completed:', {
          id: session.id,
          customer: session.customer,
          subscription: session.subscription,
          metadata: session.metadata
        });
        
        // Get user ID from metadata (set when creating checkout session)
        const userId = session.metadata?.userId;
        
        if (!userId) {
          console.error('❌ No userId found in session metadata');
          return NextResponse.json({ error: 'No user ID in metadata' }, { status: 400 });
        }

        // Get the subscription details if it exists
        if (session.subscription) {
          try {
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
            const price = subscription.items.data[0].price;
            
            console.log('📋 Subscription details:', {
              priceId: price.id,
              amount: price.unit_amount,
              nickname: price.nickname,
              currency: price.currency
            });
            
            // Map price to tiers and credits
            let tier = 'Free';
            let credits = '10';
            
            // Map based on price nickname or amount (in cents)
            if (price.nickname === 'Pro' || price.unit_amount === 2999) {
              tier = 'Pro';
              credits = '100';
            } else if (price.nickname === 'Unlimited' || price.unit_amount === 9999) {
              tier = 'Unlimited';
              credits = 'unlimited';
            }
            
            console.log(`🔄 Upgrading user ${userId} to ${tier} with ${credits} credits`);
            
            // Update user in database using Clerk ID
            const user = await db.user.update({
              where: { clerkId: userId },
              data: { tier, credits },
            });
            
            console.log(`✅ Successfully updated user ${user.email} to ${tier} with ${credits} credits`);
            
          } catch (error) {
            console.error('❌ Error processing subscription:', error);
            return NextResponse.json({ error: 'Failed to process subscription' }, { status: 500 });
          }
        } else {
          console.log('ℹ️  No subscription found in session');
        }
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('🔄 Subscription updated:', subscription.id);
        
        try {
          const customer = await stripe.customers.retrieve(subscription.customer as string);
          if (customer && !customer.deleted && customer.email) {
            const user = await db.user.findFirst({
              where: { email: customer.email },
            });
            
            if (user) {
              const price = subscription.items.data[0].price;
              let tier = 'Free';
              let credits = '10';
              
              if (price.nickname === 'Pro' || price.unit_amount === 2999) {
                tier = 'Pro';
                credits = '100';
              } else if (price.nickname === 'Unlimited' || price.unit_amount === 9999) {
                tier = 'Unlimited';
                credits = 'unlimited';
              }
              
              await db.user.update({
                where: { id: user.id },
                data: { tier, credits },
              });
              
              console.log(`✅ Updated subscription for user ${user.email} to ${tier}`);
            }
          }
        } catch (error) {
          console.error('❌ Error updating subscription:', error);
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('❌ Subscription cancelled:', subscription.id);
        
        try {
          const customer = await stripe.customers.retrieve(subscription.customer as string);
          if (customer && !customer.deleted && customer.email) {
            const user = await db.user.findFirst({
              where: { email: customer.email },
            });
            
            if (user) {
              // Downgrade to free
              await db.user.update({
                where: { id: user.id },
                data: { tier: 'Free', credits: '10' },
              });
              
              console.log(`⬇️  Downgraded user ${user.email} to Free tier`);
            }
          }
        } catch (error) {
          console.error('❌ Error processing cancellation:', error);
        }
        break;
      }
      
      default:
        console.log(`ℹ️  Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Stripe webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}