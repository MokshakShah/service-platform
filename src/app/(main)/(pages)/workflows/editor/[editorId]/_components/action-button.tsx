import React, { useCallback } from 'react'
import { Option } from './content-based-on-title'
import { ConnectionProviderProps } from '@/providers/connections-provider'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { postContentToWebHook, postContentWithFileToWebHook } from '@/app/(main)/(pages)/connections/_actions/discord-connection'
import { onCreateNodeTemplate } from '../../../_actions/workflow-connections'
import { toast } from 'sonner'
import { onCreateNewPageInDatabase } from '@/app/(main)/(pages)/connections/_actions/notion-connection';
import { postMessageToSlack, postMessageWithFileToSlack } from '@/app/(main)/(pages)/connections/_actions/slack-connection'

type Props = {
  currentService: string
  nodeConnection: ConnectionProviderProps
  channels?: Option[]
  setChannels?: (value: Option[]) => void
  file?: any
}

const ActionButton = ({
  currentService,
  nodeConnection,
  channels,
  setChannels,
  file,
}: Props) => {
  const pathname = usePathname()

  const onSendDiscordMessage = useCallback(async () => {
    const response = await postContentWithFileToWebHook(
      nodeConnection.discordNode.content,
      nodeConnection.discordNode.webhookURL,
      file
    )

    if (response.message == 'success') {
      toast.success('Message sent to Discord successfully!')
      nodeConnection.setDiscordNode((prev: any) => ({
        ...prev,
        content: '',
      }))
    } else {
      toast.error('Failed to send message to Discord')
    }
  }, [nodeConnection.discordNode, file])

  const onStoreNotionContent = useCallback(async () => {
    try {
      if (!nodeConnection.notionNode.databaseId) {
        toast.error('Database not configured. Please select a database.')
        return
      }
      if (!nodeConnection.notionNode.accessToken) {
        toast.error('Notion not connected. Please connect your Notion account.')
        return
      }
      if (!nodeConnection.notionNode.content) {
        toast.error('Please enter content before sending.')
        return
      }

      // Include Google Drive file information in Notion content
      let notionContent = nodeConnection.notionNode.content
      if (file && file.name) {
        const fileInfo = `\n\nGoogle Drive File: ${file.name}\nView: https://drive.google.com/file/d/${file.id}/view`
        notionContent = notionContent + fileInfo
      }

      console.log(
        nodeConnection.notionNode.databaseId,
        nodeConnection.notionNode.accessToken,
        notionContent
      )
      const response = await onCreateNewPageInDatabase(
        nodeConnection.notionNode.databaseId,
        nodeConnection.notionNode.accessToken,
        notionContent
      )
      if (response) {
        toast.success('Page created successfully in Notion')
        nodeConnection.setNotionNode((prev: any) => ({
          ...prev,
          content: '',
        }))
      }
    } catch (error: any) {
      console.error('Error creating Notion page:', error)
      toast.error(error?.message || 'Failed to create page in Notion')
    }
  }, [nodeConnection.notionNode, file])

  const onSendEmail = useCallback(async () => {
    try {
      if (!nodeConnection.emailNode.recipientEmail) {
        toast.error('Please enter recipient email address')
        return
      }
      if (!nodeConnection.emailNode.subject) {
        toast.error('Please enter email subject')
        return
      }
      if (!nodeConnection.emailNode.body) {
        toast.error('Please enter email body')
        return
      }

      // Prepare attachments for API
      let attachments = []
      if (nodeConnection.emailNode.attachments && nodeConnection.emailNode.attachments.length > 0) {
        attachments = await Promise.all(
          nodeConnection.emailNode.attachments.map(async (file: File) => {
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader()
              reader.onload = () => {
                const result = reader.result as string
                resolve(result.split(',')[1]) // Remove data:type;base64, prefix
              }
              reader.readAsDataURL(file)
            })
            
            return {
              filename: file.name,
              content: base64,
              contentType: file.type,
            }
          })
        )
      }

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientEmail: nodeConnection.emailNode.recipientEmail,
          subject: nodeConnection.emailNode.subject,
          body: nodeConnection.emailNode.body,
          attachments: attachments,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success('Email sent successfully!')
        // Clear form after successful send
        nodeConnection.setEmailNode((prev: any) => ({
          ...prev,
          recipientEmail: '',
          subject: '',
          body: '',
          attachments: [],
        }))
      } else {
        toast.error(data.error || 'Failed to send email')
      }
    } catch (error: any) {
      console.error('Error sending email:', error)
      toast.error('Failed to send email')
    }
  }, [nodeConnection.emailNode])

  const onStoreSlackContent = useCallback(async () => {
    const response = await postMessageWithFileToSlack(
      nodeConnection.slackNode.slackAccessToken,
      channels!,
      nodeConnection.slackNode.content,
      file
    )
    if (response.message == 'Success') {
      toast.success('Message sent to Slack successfully!')
      nodeConnection.setSlackNode((prev: any) => ({
        ...prev,
        content: '',
      }))
      setChannels!([])
    } else {
      toast.error(response.message)
    }
  }, [nodeConnection.slackNode, channels, file])

  const onCreateLocalNodeTempate = useCallback(async () => {
    if (currentService === 'Discord') {
      const response = await onCreateNodeTemplate(
        nodeConnection.discordNode.content,
        currentService,
        pathname.split('/').pop()!
      )

      if (response) {
        toast.message(response)
      }
    }
    if (currentService === 'Slack') {
      const response = await onCreateNodeTemplate(
        nodeConnection.slackNode.content,
        currentService,
        pathname.split('/').pop()!,
        channels,
        nodeConnection.slackNode.slackAccessToken
      )

      if (response) {
        toast.message(response)
      }
    }

    if (currentService === 'Notion') {
      const response = await onCreateNodeTemplate(
        JSON.stringify(nodeConnection.notionNode.content),
        currentService,
        pathname.split('/').pop()!,
        [],
        nodeConnection.notionNode.accessToken,
        nodeConnection.notionNode.databaseId
      )

      if (response) {
        toast.message(response)
      }
    }

    if (currentService === 'Email') {
      const emailConfig = {
        recipientEmail: nodeConnection.emailNode.recipientEmail,
        subject: nodeConnection.emailNode.subject,
        body: nodeConnection.emailNode.body,
        attachments: nodeConnection.emailNode.attachments?.map((file: File) => ({
          filename: file.name,
          size: file.size,
          type: file.type,
        })) || [],
      }
      
      const response = await onCreateNodeTemplate(
        JSON.stringify(emailConfig),
        currentService,
        pathname.split('/').pop()!
      )

      if (response) {
        toast.message(response)
      }
    }

    if (currentService === 'Trigger') {
      const triggerConfig = {
        triggerType: nodeConnection.triggerNode.triggerType,
        webhookUrl: nodeConnection.triggerNode.webhookUrl,
        description: nodeConnection.triggerNode.description,
      }
      
      const response = await onCreateNodeTemplate(
        JSON.stringify(triggerConfig),
        currentService,
        pathname.split('/').pop()!
      )

      if (response) {
        toast.message(response)
      }
    }
  }, [nodeConnection, channels])

  const renderActionButton = () => {
    switch (currentService) {
      case 'Discord':
        return (
          <>
            <Button
              variant="outline"
              onClick={onSendDiscordMessage}
            >
              Test Message
            </Button>
            <Button
              onClick={onCreateLocalNodeTempate}
              variant="outline"
            >
              Save Template
            </Button>
          </>
        )

      case 'Notion':
        return (
          <>
            <Button
              variant="outline"
              onClick={onStoreNotionContent}
            >
              Test
            </Button>
            <Button
              onClick={onCreateLocalNodeTempate}
              variant="outline"
            >
              Save Template
            </Button>
          </>
        )

      case 'Slack':
        return (
          <>
            <Button
              variant="outline"
              onClick={onStoreSlackContent}
            >
              Send Message
            </Button>
            <Button
              onClick={onCreateLocalNodeTempate}
              variant="outline"
            >
              Save Template
            </Button>
          </>
        )

      case 'Email':
        return (
          <>
            <Button
              variant="outline"
              onClick={onSendEmail}
            >
              Send Test Email
            </Button>
            <Button
              onClick={onCreateLocalNodeTempate}
              variant="outline"
            >
              Save Template
            </Button>
          </>
        )

      case 'Trigger':
        return (
          <Button
            onClick={onCreateLocalNodeTempate}
            variant="outline"
          >
            Save Trigger
          </Button>
        )

      default:
        return null
    }
  }
  return renderActionButton()
}

export default ActionButton
