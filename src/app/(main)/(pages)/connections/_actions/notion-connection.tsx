'use server'

import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { Client } from '@notionhq/client'

export const onNotionConnect = async (
  access_token: string,
  workspace_id: string,
  workspace_icon: string,
  workspace_name: string,
  database_id: string,
  id: string
) => {
  if (!id) {
    throw new Error('User not authenticated')
  }

  if (access_token) {
    // Upsert Notion connection: update if exists, create if not
    await db.notion.upsert({
      where: {
        userId: id,
      },
      update: {
        workspaceIcon: workspace_icon!,
        accessToken: access_token,
        workspaceId: workspace_id!,
        workspaceName: workspace_name!,
        databaseId: database_id,
      },
      create: {
        userId: id,
        workspaceIcon: workspace_icon!,
        accessToken: access_token,
        workspaceId: workspace_id!,
        workspaceName: workspace_name!,
        databaseId: database_id,
        connections: {
          create: {
            userId: id,
            type: 'Notion',
          },
        },
      },
    })
  }
