'use server'

import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { Client } from '@notionhq/client'

export const onNotionDisconnect = async (userId: string) => {
  try {
    if (!userId) {
      throw new Error('User not authenticated')
    }

    // Delete Notion connection and its connections
    await db.notion.deleteMany({
      where: {
        userId: userId,
      },
    })

    // Delete Notion connections
    await db.connections.deleteMany({
      where: {
        userId: userId,
        type: 'Notion',
      },
    })

    return { success: true, message: 'Notion disconnected successfully' }
  } catch (error: any) {
    console.error('Error disconnecting Notion:', error)
    return { success: false, message: error.message || 'Failed to disconnect Notion' }
  }
}

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
    let finalDatabaseId = database_id

    // If no database_id provided, try to get the first available database
    if (!database_id || database_id === '') {
      console.log('No database ID provided, fetching available databases...')
      try {
        const databases = await getNotionDatabases(access_token)
        if (databases && databases.length > 0) {
          finalDatabaseId = databases[0].id
          console.log('Found database:', databases[0].id)
        } else {
          console.log('No databases found in workspace')
        }
      } catch (error) {
        console.error('Error fetching databases:', error)
      }
    }

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
          databaseId: finalDatabaseId,
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
          databaseId: finalDatabaseId,
          connections: {
            create: {
              userId: id,
              type: 'Notion',
            },
          },
        },
      })
    }

    console.log('Notion connected with database ID:', finalDatabaseId)
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

export const getNotionDatabases = async (accessToken: string) => {
  try {
    const notion = new Client({ auth: accessToken })

    // Search for databases
    const response = await notion.search({
      filter: {
        value: 'database',
        property: 'object'
      }
    })

    return response.results
  } catch (error: any) {
    console.error('Error fetching Notion databases:', error)
    return []
  }
}

export const getNotionDatabase = async (databaseId: string, accessToken: string) => {
  const notion = new Client({ auth: accessToken })
  const response = await notion.databases.retrieve({
    database_id: databaseId,
  })
  return response
}
