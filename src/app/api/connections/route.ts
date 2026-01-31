import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const { userId } = await auth()
  
  if (!userId) {
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const notionConnection = await db.notion.findFirst({
      where: {
        userId: userId,
      },
    })

    const discordConnection = await db.discordWebhook.findFirst({
      where: {
        userId: userId,
      },
    })

    const slackConnection = await db.slack.findFirst({
      where: {
        userId: userId,
      },
    })

    console.log('Fetching connections for userId:', userId)
    console.log('Notion connection found:', notionConnection ? 'Yes' : 'No')
    console.log('Discord connection found:', discordConnection ? 'Yes' : 'No')
    console.log('Slack connection found:', slackConnection ? 'Yes' : 'No')

    return NextResponse.json(
      {
        notion: notionConnection ? {
          accessToken: notionConnection.accessToken,
          databaseId: notionConnection.databaseId,
          workspaceName: notionConnection.workspaceName,
          workspaceId: notionConnection.workspaceId,
        } : null,
        discord: discordConnection ? {
          url: discordConnection.url,
          name: discordConnection.name,
          guildName: discordConnection.guildName,
        } : null,
        slack: slackConnection ? {
          teamId: slackConnection.teamId,
          teamName: slackConnection.teamName,
        } : null,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error fetching connections:', error)
    return NextResponse.json(
      { message: 'Failed to fetch connections', error: error.message },
      { status: 500 }
    )
  }
}
