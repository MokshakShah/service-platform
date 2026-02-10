import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getFileContent } from '@/app/(main)/(pages)/connections/_actions/google-connection'
import { postContentToWebHook } from '@/app/(main)/(pages)/connections/_actions/discord-connection'
import { postMessageToSlack } from '@/app/(main)/(pages)/connections/_actions/slack-connection'
import { onCreateNewPageInDatabase } from '@/app/(main)/(pages)/connections/_actions/notion-connection'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { fileId, platform } = body // platform: 'discord', 'slack', 'notion', or 'all'

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 })
    }

    console.log(`🧪 Testing Google Drive workflow for file: ${fileId}`)
    console.log(`📤 Target platform: ${platform}`)

    // Get file content from Google Drive
    const fileContent = await getFileContent(fileId)
    
    if (!fileContent?.success) {
      return NextResponse.json({ 
        error: 'Failed to get file content', 
        details: fileContent?.error 
      }, { status: 400 })
    }

    const file = fileContent.file
    console.log(`📄 File retrieved: ${file.name} (${file.mimeType})`)

    // Prepare formatted content
    let messageContent = `📁 **File from Google Drive**\n\n` +
      `**File:** ${file.name}\n` +
      `**Type:** ${file.mimeType}\n` +
      `**Modified:** ${new Date(file.modifiedTime).toLocaleString()}\n\n`
    
    if (file.content && file.content.length > 0) {
      const maxLength = platform === 'discord' ? 1900 : 2000
      const truncatedContent = file.content.length > maxLength 
        ? file.content.substring(0, maxLength) + '...\n\n[Content truncated]'
        : file.content
      
      messageContent += `**Content:**\n\`\`\`\n${truncatedContent}\n\`\`\``
    }
    
    if (file.downloadUrl) {
      messageContent += `\n\n🔗 **View File:** ${file.downloadUrl}`
    }

    const results = []

    // Send to Discord
    if (platform === 'discord' || platform === 'all') {
      const discordConnection = await db.discordWebhook.findFirst({
        where: { userId: userId },
        select: { url: true, name: true }
      })

      if (discordConnection) {
        try {
          await postContentToWebHook(messageContent, discordConnection.url)
          results.push({ platform: 'discord', status: 'success', webhook: discordConnection.name })
          console.log('✅ Sent to Discord successfully')
        } catch (error) {
          results.push({ platform: 'discord', status: 'error', error: String(error) })
          console.log('❌ Discord send failed:', error)
        }
      } else {
        results.push({ platform: 'discord', status: 'not_connected' })
      }
    }

    // Send to Slack
    if (platform === 'slack' || platform === 'all') {
      const slackConnection = await db.slack.findFirst({
        where: { userId: userId },
        select: { slackAccessToken: true, teamName: true }
      })

      if (slackConnection) {
        try {
          // For testing, we'll use a general channel - you can modify this
          const channels = [{ label: 'general', value: 'general' }]
          await postMessageToSlack(slackConnection.slackAccessToken, channels, messageContent)
          results.push({ platform: 'slack', status: 'success', team: slackConnection.teamName })
          console.log('✅ Sent to Slack successfully')
        } catch (error) {
          results.push({ platform: 'slack', status: 'error', error: String(error) })
          console.log('❌ Slack send failed:', error)
        }
      } else {
        results.push({ platform: 'slack', status: 'not_connected' })
      }
    }

    // Send to Notion
    if (platform === 'notion' || platform === 'all') {
      const notionConnection = await db.notion.findFirst({
        where: { userId: userId },
        select: { accessToken: true, databaseId: true, workspaceName: true }
      })

      if (notionConnection) {
        try {
          let notionContent = `File: ${file.name} | Type: ${file.mimeType} | Modified: ${new Date(file.modifiedTime).toLocaleString()}`
          if (file.content) {
            notionContent += ` | Content: ${file.content.substring(0, 500)}${file.content.length > 500 ? '...' : ''}`
          }
          
          await onCreateNewPageInDatabase(
            notionConnection.databaseId,
            notionConnection.accessToken,
            notionContent
          )
          results.push({ platform: 'notion', status: 'success', workspace: notionConnection.workspaceName })
          console.log('✅ Created Notion page successfully')
        } catch (error) {
          results.push({ platform: 'notion', status: 'error', error: String(error) })
          console.log('❌ Notion creation failed:', error)
        }
      } else {
        results.push({ platform: 'notion', status: 'not_connected' })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Workflow test completed',
      file: {
        name: file.name,
        type: file.mimeType,
        size: file.size,
        hasContent: !!file.content,
        contentLength: file.content?.length || 0
      },
      results: results
    })

  } catch (error: any) {
    console.error('Test workflow error:', error)
    return NextResponse.json({
      error: 'Test workflow failed',
      details: error?.message
    }, { status: 500 })
  }
}