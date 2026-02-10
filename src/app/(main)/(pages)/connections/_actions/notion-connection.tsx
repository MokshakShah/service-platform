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
    // Check if user already has a Notion connection
    const existingNotion = await db.notion.findFirst({
      where: {
        userId: id,
      },
    })

    if (existingNotion) {
      // Update existing connection
      await db.notion.update({
        where: {
          id: existingNotion.id,
        },
        data: {
          workspaceIcon: workspace_icon!,
          accessToken: access_token,
          workspaceId: workspace_id!,
          workspaceName: workspace_name!,
          databaseId: database_id,
        },
      })
    } else {
      // Create new connection
      await db.notion.create({
        data: {
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
  }
}

export const onCreateNewPageInDatabase = async (
  databaseId: string,
  accessToken: string,
  content: string
) => {
  const { userId } = await auth()
  if (!userId) return

  const notion = new Client({ auth: accessToken })
  const response = await notion.pages.create({
    parent: {
      database_id: databaseId,
    },
    properties: {
      Name: {
        title: [
          {
            text: {
              content: content,
            },
          },
        ],
      },
    },
  })
  return response
}

export const getNotionConnection = async () => {
  const { userId } = await auth()
  if (!userId) return null

  const connection = await db.notion.findFirst({
    where: {
      userId: userId,
    },
  })
  return connection
}

export const getNotionDatabase = async (databaseId: string, accessToken: string) => {
  const notion = new Client({ auth: accessToken })
  const response = await notion.databases.retrieve({
    database_id: databaseId,
  })
  return response
}
