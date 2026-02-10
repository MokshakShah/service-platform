'use server'

import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import axios from 'axios'

export const onDiscordConnect = async (
  channel_id: string,
  webhook_id: string,
  webhook_name: string,
  webhook_url: string,
  id: string,
  guild_name: string,
  guild_id: string
) => {
  if (!id) {
    throw new Error('User not authenticated')
  }

  //check if webhook id params set
  if (webhook_id) {
    //check if webhook exists in database with userid
    const webhook = await db.discordWebhook.findFirst({
      where: {
        userId: id,
      },
      include: {
        connections: {
          select: {
            type: true,
          },
        },
      },
    })

    //if webhook does not exist for this user
    if (!webhook) {
      //create new webhook
      await db.discordWebhook.create({
        data: {
          userId: id,
          webhookId: webhook_id,
          channelId: channel_id!,
          guildId: guild_id!,
          name: webhook_name!,
          url: webhook_url!,
          guildName: guild_name!,
          connections: {
            create: {
              userId: id,
              type: 'Discord',
            },
          },
        },
      })
    }

    //if webhook exists return check for duplicate
    if (webhook) {
      //check if webhook exists for target channel id
      const webhook_channel = await db.discordWebhook.findUnique({
        where: {
          channelId: channel_id,
        },
        include: {
          connections: {
            select: {
              type: true,
            },
          },
        },
      })

      //if no webhook for channel create new webhook
      if (!webhook_channel) {
        await db.discordWebhook.create({
          data: {
            userId: id,
            webhookId: webhook_id,
            channelId: channel_id!,
            guildId: guild_id!,
            name: webhook_name!,
            url: webhook_url!,
            guildName: guild_name!,
            connections: {
              create: {
                userId: id,
                type: 'Discord',
              },
            },
          },
        })
      }
    }
  }
}

export const getDiscordConnectionUrl = async () => {
  const { userId } = await auth()
  if (userId) {
    const webhook = await db.discordWebhook.findFirst({
      where: {
        userId: userId,
      },
      select: {
        url: true,
        name: true,
        guildName: true,
      },
    })

    return webhook
  }
}

export const onDiscordDisconnect = async (userId: string) => {
  try {
    if (!userId) {
      throw new Error('User not authenticated')
    }

    // Delete Discord webhook and its connections
    await db.discordWebhook.deleteMany({
      where: {
        userId: userId,
      },
    })

    // Delete Discord connections
    await db.connections.deleteMany({
      where: {
        userId: userId,
        type: 'Discord',
      },
    })

    return { success: true, message: 'Discord disconnected successfully' }
  } catch (error: any) {
    console.error('Error disconnecting Discord:', error)
    return { success: false, message: error.message || 'Failed to disconnect Discord' }
  }
}

export const postContentToWebHook = async (content: string, url: string) => {
  // console.log(content)
  if (content != '') {
    const posted = await axios.post(url, { content })
    if (posted) {
      return { message: 'success' }
    }
    return { message: 'failed request' }
  }
  return { message: 'String empty' }
}

export const postContentWithFileToWebHook = async (
  content: string, 
  url: string, 
  file?: any
) => {
  try {
    if (!content && !file) {
      return { message: 'No content or file provided' }
    }

    // If there's a file, include only the file name and link
    let messageContent = content
    if (file && file.name) {
      const fileInfo = `\n\n📁 **${file.name}**\n🔗 [View File](https://drive.google.com/file/d/${file.id}/view)`
      messageContent = messageContent + fileInfo
    }

    const posted = await axios.post(url, { 
      content: messageContent || 'File shared from Google Drive'
    })
    
    if (posted) {
      return { message: 'success' }
    }
    return { message: 'failed request' }
  } catch (error: any) {
    console.error('Error posting to Discord webhook:', error)
    return { message: 'failed request', error: error.message }
  }
}
