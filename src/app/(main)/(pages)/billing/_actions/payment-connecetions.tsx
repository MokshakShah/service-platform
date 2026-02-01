'use server';

import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

export const onPaymentDetails = async () => {
  try {
    const { userId } = await auth();
    console.log('onPaymentDetails: userId:', userId);
    
    if (!userId) {
      console.log('onPaymentDetails: No userId found');
      return null;
    }

    const connection = await db.user.findFirst({
      where: { clerkId: userId },
    });
    
    console.log('onPaymentDetails: Database result:', connection);
    return connection;
  } catch (error) {
    console.error('onPaymentDetails: Error:', error);
    return null;
  }
};
