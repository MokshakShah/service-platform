'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2, XCircle } from 'lucide-react'
import { useBilling } from '@/providers/billing-provider'

type Props = {
  sessionId: string
}

const PaymentSuccess = ({ sessionId }: Props) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [upgradeDetails, setUpgradeDetails] = useState<{ tier: string; credits: string } | null>(null)
  const { setCredits, setTier } = useBilling()

  useEffect(() => {
    const processPaymentSuccess = async () => {
      try {
        setStatus('loading')
        setMessage('Processing your payment...')

        const response = await fetch('/api/payment/success', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId }),
        })

        const data = await response.json()

        if (response.ok && data.success) {
          setStatus('success')
          setMessage(data.message || 'Payment processed successfully!')
          setUpgradeDetails({ tier: data.tier, credits: data.credits })
          
          // Update the billing context
          setCredits(data.credits)
          setTier(data.tier)
        } else {
          setStatus('error')
          setMessage(data.error || 'Failed to process payment')
        }
      } catch (error) {
        console.error('Payment success processing error:', error)
        setStatus('error')
        setMessage('An unexpected error occurred')
      }
    }

    if (sessionId) {
      processPaymentSuccess()
    }
  }, [sessionId, setCredits, setTier])

  const handleContinue = () => {
    // Remove the session_id from URL and show billing dashboard
    window.history.replaceState({}, '', '/billing')
    window.location.reload()
  }

  return (
    <div className="container mx-auto p-8">
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && <Loader2 className="h-12 w-12 animate-spin text-blue-500" />}
            {status === 'success' && <CheckCircle className="h-12 w-12 text-green-500" />}
            {status === 'error' && <XCircle className="h-12 w-12 text-red-500" />}
          </div>
          <CardTitle>
            {status === 'loading' && 'Processing Payment'}
            {status === 'success' && 'Payment Successful!'}
            {status === 'error' && 'Payment Error'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <CardDescription>{message}</CardDescription>
          
          {status === 'success' && upgradeDetails && (
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="font-semibold text-green-800">Account Upgraded!</p>
              <p className="text-green-700">
                Plan: <span className="font-bold">{upgradeDetails.tier}</span>
              </p>
              <p className="text-green-700">
                Credits: <span className="font-bold">{upgradeDetails.credits}</span>
              </p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-red-700">
                If you believe this is an error, please contact support with your session ID: 
                <code className="block mt-2 text-xs bg-red-100 p-2 rounded">{sessionId}</code>
              </p>
            </div>
          )}
          
          {status !== 'loading' && (
            <Button onClick={handleContinue} className="w-full">
              {status === 'success' ? 'Continue to Dashboard' : 'Back to Billing'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default PaymentSuccess