import BillingDashboard from './_components/billing-dashboard';
import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';


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

    return <BillingDashboard />;
  } catch (error: any) {
    console.error('Error in Billing page:', error);
    return <div>Error: {error.message}</div>;
  }
};

export default Billing;
