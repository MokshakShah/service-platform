'use client'

import React from 'react'
import { onPaymentDetails } from '@/app/(main)/(pages)/billing/_actions/payment-connecetions'

type BillingProviderProps = {
  credits: string
  tier: string
  setCredits: React.Dispatch<React.SetStateAction<string>>
  setTier: React.Dispatch<React.SetStateAction<string>>
}

const initialValues: BillingProviderProps = {
  credits: '0',
  setCredits: () => undefined,
  tier: 'Free',
  setTier: () => undefined,
}

type WithChildProps = {
  children: React.ReactNode
}

const context = React.createContext(initialValues)
const { Provider } = context

export const BillingProvider = ({ children }: WithChildProps) => {
  const [credits, setCredits] = React.useState(initialValues.credits)
  const [tier, setTier] = React.useState(initialValues.tier)

  React.useEffect(() => {
    const fetchUserBillingData = async () => {
      try {
        console.log('BillingProvider: Fetching user billing data...');
        const data = await onPaymentDetails()
        console.log('BillingProvider: Received data:', data);
        
        if (data) {
          const newCredits = data.credits?.toString() || '0';
          const newTier = data.tier || 'Free';
          
          console.log('BillingProvider: Setting credits to:', newCredits);
          console.log('BillingProvider: Setting tier to:', newTier);
          
          setCredits(newCredits)
          setTier(newTier)
        } else {
          console.log('BillingProvider: No data received, using defaults');
          setCredits('0')
          setTier('Free')
        }
      } catch (error) {
        console.error('BillingProvider: Failed to fetch billing data:', error)
        setCredits('0')
        setTier('Free')
      }
    }

    fetchUserBillingData()
  }, [])

  const values = {
    credits,
    setCredits,
    tier,
    setTier,
  }

  return <Provider value={values}>{children}</Provider>
}

export const useBilling = () => {
  const state = React.useContext(context)
  return state
}
