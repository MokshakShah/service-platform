import BillingDashboard from './_components/billing-dashboard';
import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams?: { [key: string]: string | undefined }
}

const Billing = async (props: Props) => {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return <div>Error: You must be logged in to access billing</div>;
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return <div>Error: User not found in the database</div>;
    }

    // Check if this is a payment success redirect
    const sessionId = props.searchParams?.session_id;
    
    if (sessionId) {
      console.log('Processing payment success for session:', sessionId);
      
      // Process the payment success immediately on the server side
      try {
        if (!process.env.STRIPE_SECRET) {
          console.error('Stripe secret not configured');
          redirect('/billing');
          return;
        }

        const stripe = new Stripe(process.env.STRIPE_SECRET, {
          typescript: true,
          apiVersion: '2023-10-16',
        });
        
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        console.log('Retrieved session:', {
          id: session.id,
          payment_status: session.payment_status,
          subscription: session.subscription
        });
        
        if (session.payment_status === 'paid' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const price = subscription.items.data[0].price;
          
          console.log('Subscription details:', {
            priceId: price.id,
            amount: price.unit_amount,
            nickname: price.nickname
          });
          
          let tier = 'Free';
          let credits = '10';
          
          // Map based on price amount (in cents) or nickname
          if (price.unit_amount === 2999 || price.nickname === 'Pro') { // $29.99
            tier = 'Pro';
            credits = '100';
          } else if (price.unit_amount === 9999 || price.nickname === 'Unlimited') { // $99.99
            tier = 'Unlimited';
            credits = 'unlimited';
          }
          
          console.log('Upgrading user to:', { tier, credits });
          
          // Update user in database
          const updatedUser = await db.user.update({
            where: { clerkId: userId },
            data: { tier, credits },
          });
          
          console.log(`Successfully updated user ${updatedUser.email} to ${tier} with ${credits} credits`);
        } else {
          console.log('Payment not completed or no subscription found');
        }
      } catch (error) {
        console.error('Payment processing error:', error);
      }
      
      // Redirect to clean billing URL
      redirect('/billing');
    }

    return <BillingDashboard />;
  } catch (error: any) {
    console.error('Error in Billing page:', error);
    return <div>Error: {error.message}</div>;
  }
};

export default Billing;
