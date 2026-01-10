'use server';

import { db } from '@/lib/db';
import { headers } from 'next/headers';
import { getAuth } from '@clerk/nextjs/server';

export const onPaymentDetails = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/payment-details`, { cache: 'no-store' });
  if (!res.ok) return null;
  const connection = await res.json();
  return connection;
};
