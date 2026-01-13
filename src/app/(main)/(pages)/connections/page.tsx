import { CONNECTIONS } from '@/lib/constant'
import React from 'react'
import ConnectionCard from './_components/connection-card'
import { useUser } from '@clerk/nextjs'
import { onDiscordConnect } from './_actions/discord-connection'
import { onNotionConnect } from './_actions/notion-connection'
import { onSlackConnect } from './_actions/slack-connection'
import { getUserData } from './_actions/get-user'
import ConnectionsClient from './ConnectionsClient'

type Props = {
  searchParams?: { [key: string]: string | undefined }
}


const Connections = (props: Props) => {
  return <ConnectionsClient {...props} />;
};

export default Connections;

