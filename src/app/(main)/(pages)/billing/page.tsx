import React from 'react';

import BillingDashboard from './_components/billing-dashboard';


const Billing = async (props: Props) => {
  try {
    const { session_id } = props.searchParams ?? { session_id: '' };
    if (!session_id) {
      throw new Error('Session ID is missing');
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/billing?session_id=${session_id}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch billing info');
    const user = await res.json();
    if (!user) throw new Error('User not found in the database');

    return <BillingDashboard />;
  } catch (error: any) {
    console.error('Error in Billing page:', error);
    return <div>Error: {error.message}</div>;
  }
};

export default Billing;
