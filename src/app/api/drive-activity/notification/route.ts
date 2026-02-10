import { postContentToWebHook } from '@/app/(main)/(pages)/connections/_actions/discord-connection'
import { onCreateNewPageInDatabase } from '@/app/(main)/(pages)/connections/_actions/notion-connection'
import { postMessageToSlack } from '@/app/(main)/(pages)/connections/_actions/slack-connection'
import { getFileContent } from '@/app/(main)/(pages)/connections/_actions/google-connection'
import { db } from '@/lib/db'
import axios from 'axios'
import { headers } from 'next/headers'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  console.log('🔴 Google Drive Activity Detected')
  const headersList = await headers()
  let channelResourceId
  let fileId = ''
  
  // Extract Google Drive resource ID and file ID from headers
  headersList.forEach((value, key) => {
    if (key == 'x-goog-resource-id') {
      channelResourceId = value
    }
  })

  // Try to get file ID from request body or URL params
  try {
    const body = await req.json()
    fileId = body?.fileId || ''
  } catch (error) {
    // If no JSON body, try URL params
    const url = new URL(req.url)
    fileId = url.searchParams.get('fileId') || ''
  }

  console.log('Channel Resource ID:', channelResourceId)
  console.log('File ID:', fileId)

  if (channelResourceId) {
    const user = await db.user.findFirst({
      where: {
        googleResourceId: channelResourceId,
      },
      select: { clerkId: true, credits: true },
    })
    
    if ((user && parseInt(user.credits!) > 0) || user?.credits == 'Unlimited') {
      const workflows = await db.workflows.findMany({
        where: {
          userId: user.clerkId,
        },
      })
      
      if (workflows) {
        // Get file content if fileId is available
        let fileContent = null
        if (fileId) {
          console.log('Fetching file content for:', fileId)
          fileContent = await getFileContent(fileId)
          console.log('File content result:', fileContent?.success ? 'Success' : 'Failed')
        }

        workflows.map(async (flow) => {
          const flowPath = JSON.parse(flow.flowPath!)
          let current = 0
          
          while (current < flowPath.length) {
            // Prepare content with file information
            let messageContent = ''
            
            if (fileContent?.success) {
              const file = fileContent.file
              messageContent = `📁 **File Update from Google Drive**\n\n` +
                `**File:** ${file.name}\n` +
                `**Type:** ${file.mimeType}\n` +
                `**Modified:** ${new Date(file.modifiedTime).toLocaleString()}\n\n`
              
              if (file.content && file.content.length > 0) {
                // Truncate content if too long for Discord/Slack
                const maxLength = flowPath[current] === 'Discord' ? 1900 : 2000
                const truncatedContent = file.content.length > maxLength 
                  ? file.content.substring(0, maxLength) + '...\n\n[Content truncated]'
                  : file.content
                
                messageContent += `**Content:**\n\`\`\`\n${truncatedContent}\n\`\`\``
              }
              
              if (file.downloadUrl) {
                messageContent += `\n\n🔗 **View File:** ${file.downloadUrl}`
              }
            } else {
              // Fallback message if no file content
              messageContent = flow.discordTemplate || flow.slackTemplate || 'File activity detected in Google Drive'
            }

            if (flowPath[current] == 'Discord') {
              const discordMessage = await db.discordWebhook.findFirst({
                where: {
                  userId: flow.userId,
                },
                select: {
                  url: true,
                },
              })
              if (discordMessage) {
                console.log('Sending to Discord:', messageContent.substring(0, 100) + '...')
                await postContentToWebHook(
                  messageContent,
                  discordMessage.url
                )
                flowPath.splice(current, 1)
              }
            }
            
            if (flowPath[current] == 'Slack') {
              const channels = flow.slackChannels.map((channel: any) => {
                return {
                  label: '',
                  value: channel,
                }
              })
              console.log('Sending to Slack:', messageContent.substring(0, 100) + '...')
              await postMessageToSlack(
                flow.slackAccessToken!,
                channels,
                messageContent
              )
              flowPath.splice(current, 1)
            }
            
            if (flowPath[current] == 'Notion') {
              let notionContent = ''
              if (fileContent?.success) {
                const file = fileContent.file
                notionContent = `File: ${file.name} | Type: ${file.mimeType} | Modified: ${new Date(file.modifiedTime).toLocaleString()}`
                if (file.content) {
                  notionContent += ` | Content: ${file.content.substring(0, 500)}${file.content.length > 500 ? '...' : ''}`
                }
              } else {
                notionContent = flow.notionTemplate || 'Google Drive file activity'
              }
              
              console.log('Creating Notion page:', notionContent.substring(0, 100) + '...')
              await onCreateNewPageInDatabase(
                flow.notionDbId!,
                flow.notionAccessToken!,
                notionContent
              )
              flowPath.splice(current, 1)
            }

            if (flowPath[current] == 'Wait') {
              const res = await axios.put(
                'https://api.cron-job.org/jobs',
                {
                  job: {
                    url: `${process.env.NGROK_URI}?flow_id=${flow.id}`,
                    enabled: 'true',
                    schedule: {
                      timezone: 'Europe/Istanbul',
                      expiresAt: 0,
                      hours: [-1],
                      mdays: [-1],
                      minutes: ['*****'],
                      months: [-1],
                      wdays: [-1],
                    },
                  },
                },
                {
                  headers: {
                    Authorization: `Bearer ${process.env.CRON_JOB_KEY!}`,
                    'Content-Type': 'application/json',
                  },
                }
              )
              if (res) {
                flowPath.splice(current, 1)
                const cronPath = await db.workflows.update({
                  where: {
                    id: flow.id,
                  },
                  data: {
                    cronPath: JSON.stringify(flowPath),
                  },
                })
                if (cronPath) break
              }
              break
            }
            current++
          }

          // Deduct credits after workflow execution
          await db.user.update({
            where: {
              clerkId: user.clerkId,
            },
            data: {
              credits: `${parseInt(user.credits!) - 1}`,
            },
          })
        })
        
        return Response.json(
          {
            message: 'Workflow completed successfully',
            fileProcessed: fileContent?.success || false,
          },
          {
            status: 200,
          }
        )
      }
    }
  }
  
  return Response.json(
    {
      message: 'No active workflows or insufficient credits',
    },
    {
      status: 200,
    }
  )
}
