'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'

export default function ManualUpgradePage() {
  const { user, isLoaded } = useUser()
  const [status, setStatus] = useState<string>('Ready to upgrade...')
  const [result, setResult] = useState<any>(null)

  const handleUpgrade = async () => {
    if (!user) {
      setStatus('Please log in first')
      return
    }

    try {
      setStatus('Upgrading account to Pro...')
      const response = await fetch('/api/manual-upgrade', {
        method: 'POST',
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setStatus('Account upgraded to Pro successfully!')
        setResult(data)
      } else {
        setStatus(`Error: ${data.error}`)
        setResult(data)
      }
    } catch (error) {
      setStatus(`Error: ${error}`)
      console.error('Manual upgrade error:', error)
    }
  }

  if (!isLoaded) {
    return <div className="container mx-auto p-8">Loading...</div>
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Manual Account Upgrade</h1>
      <div className="bg-gray-100 p-4 rounded mb-4">
        <p className="mb-2"><strong>Status:</strong> {status}</p>
        {result && (
          <div>
            <p><strong>Result:</strong></p>
            <pre className="bg-gray-200 p-2 rounded mt-2 text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      {!status.includes('successfully') && (
        <button 
          onClick={handleUpgrade}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-4"
          disabled={status.includes('Upgrading')}
        >
          {status.includes('Upgrading') ? 'Upgrading...' : 'Upgrade to Pro'}
        </button>
      )}
      
      <a 
        href="/billing" 
        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 inline-block"
      >
        Back to Billing
      </a>
    </div>
  )
}