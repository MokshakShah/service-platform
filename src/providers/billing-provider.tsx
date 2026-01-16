'use client'

import React from 'react'
import axios from 'axios'

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
        const { data } = await axios.get('/api/payment-details')
        if (data) {
          setCredits(data.credits?.toString() || '0')
          setTier(data.tier || 'Free')
        }
      } catch (error) {
        console.error('Failed to fetch billing data:', error)
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
