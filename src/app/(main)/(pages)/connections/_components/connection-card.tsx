import { ConnectionTypes } from '@/lib/types'
import React from 'react'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import Image from 'next/image'
import Link from 'next/link'

type Props = {
  type: ConnectionTypes
  icon: string
  title: ConnectionTypes
  description: string
  callback?: () => void
  connected: {} & any
  action?: React.ReactNode
  onDisconnect?: () => void
}

const ConnectionCard = ({
  description,
  type,
  icon,
  title,
  connected,
  action,
  onDisconnect,
}: Props) => {
  return (
    <Card className="flex w-full items-center justify-between">
      <CardHeader className="flex flex-col gap-4">
        <div className="flex flex-row gap-2">
          <Image
            src={icon}
            alt={title}
            height={30}
            width={30}
            className="object-contain"
          />
        </div>
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <div className="flex flex-col items-center gap-2 p-4">
        {connected[type] ? (
          <div className="flex flex-col gap-2">
            <span className="rounded-lg bg-green-600 p-2 font-bold text-white text-center">
              Connected
            </span>
            {onDisconnect && (
              <button
                onClick={onDisconnect}
                className="rounded-lg bg-red-600 p-2 font-bold text-white hover:bg-red-700 transition-colors"
              >
                Disconnect
              </button>
            )}
          </div>
        ) : (
          <>
            {action || (
              <span className="rounded-lg bg-gray-400 p-2 font-bold text-white opacity-50 cursor-not-allowed">
                Connect
              </span>
            )}
          </>
        )}
      </div>
    </Card>
  )
}

export default ConnectionCard
