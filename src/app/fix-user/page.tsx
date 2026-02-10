'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'

export default function FixUserPage() {
  const { user, isLoaded } = useUser()
  const [status, setStatus] = useState<string>('Loading...')
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    if (!isLoaded) return
    
    if (!user) {
      setStatus('Please log in first')
      return
    }

    const fixUser = async () => {
      try {
        setStatus('Fixing user account...')
        const response = await fetch('/api/fix-user', {
          method: 'POST',
        })
        
        const data = await response.json()
        
        if (response.ok) {
          setStatus('User account fixed successfully!')
          setResult(data)
        } else {
          setStatus(`Error: ${data.error}`)
          setResult(data)
        }
      } catch (error) {
        setStatus(`Error: ${error}`)
        console.error('Fix user error:', error)
      }
    }

    fixUser()
  }, [user, isLoaded])

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Fix User Account</h1>
      <div className="bg-gray-100 p-4 rounded">
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
      {status.includes('successfully') && (
        <div className="mt-4">
          <a 
            href="/dashboard" 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Go to Dashboard
          </a>
        </div>
      )}
    </div>
  )
}