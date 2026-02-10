'use client'
import { createContext, useContext, useState } from 'react'

export type ConnectionProviderProps = {
  discordNode: {
    webhookURL: string
    content: string
    webhookName: string
    guildName: string
  }
  setDiscordNode: React.Dispatch<React.SetStateAction<any>>
  googleNode: {}[]
  setGoogleNode: React.Dispatch<React.SetStateAction<any>>
  notionNode: {
    accessToken: string
    databaseId: string
    workspaceName: string
    content: ''
  }
  triggerNode: {
    triggerType: string
    webhookUrl: string
    description: string
  }
  emailNode: {
    recipientEmail: string
    subject: string
    body: string
    attachments: File[]
    senderEmail: string
  }
  workflowTemplate: {
    discord?: string
    notion?: string
    slack?: string
    email?: string
  }
  setNotionNode: React.Dispatch<React.SetStateAction<any>>
  setTriggerNode: React.Dispatch<React.SetStateAction<any>>
  setEmailNode: React.Dispatch<React.SetStateAction<any>>
  slackNode: {
    appId: string
    authedUserId: string
    authedUserToken: string
    slackAccessToken: string
    botUserId: string
    teamId: string
    teamName: string
    content: string
  }
  setSlackNode: React.Dispatch<React.SetStateAction<any>>
  setWorkFlowTemplate: React.Dispatch<
    React.SetStateAction<{
      discord?: string
      notion?: string
      slack?: string
      email?: string
    }>
  >
  isLoading: boolean
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
}

type ConnectionWithChildProps = {
  children: React.ReactNode
}

const InitialValues: ConnectionProviderProps = {
  discordNode: {
    webhookURL: '',
    content: '',
    webhookName: '',
    guildName: '',
  },
  googleNode: [],
  notionNode: {
    accessToken: '',
    databaseId: '',
    workspaceName: '',
    content: '',
  },
  triggerNode: {
    triggerType: 'webhook',
    webhookUrl: '',
    description: '',
  },
  emailNode: {
    recipientEmail: '',
    subject: '',
    body: '',
    attachments: [],
    senderEmail: '',
  },
  workflowTemplate: {
    discord: '',
    notion: '',
    slack: '',
    email: '',
  },
  slackNode: {
    appId: '',
    authedUserId: '',
    authedUserToken: '',
    slackAccessToken: '',
    botUserId: '',
    teamId: '',
    teamName: '',
    content: '',
  },
  isLoading: false,
  setGoogleNode: () => undefined,
  setDiscordNode: () => undefined,
  setNotionNode: () => undefined,
  setTriggerNode: () => undefined,
  setEmailNode: () => undefined,
  setSlackNode: () => undefined,
  setIsLoading: () => undefined,
  setWorkFlowTemplate: () => undefined,
}

const ConnectionsContext = createContext(InitialValues)
const { Provider } = ConnectionsContext

export const ConnectionsProvider = ({ children }: ConnectionWithChildProps) => {
  const [discordNode, setDiscordNode] = useState(InitialValues.discordNode)
  const [googleNode, setGoogleNode] = useState(InitialValues.googleNode)
  const [notionNode, setNotionNode] = useState(InitialValues.notionNode)
  const [triggerNode, setTriggerNode] = useState(InitialValues.triggerNode)
  const [emailNode, setEmailNode] = useState(InitialValues.emailNode)
  const [slackNode, setSlackNode] = useState(InitialValues.slackNode)
  const [isLoading, setIsLoading] = useState(InitialValues.isLoading)
  const [workflowTemplate, setWorkFlowTemplate] = useState(
    InitialValues.workflowTemplate
  )

  const values = {
    discordNode,
    setDiscordNode,
    googleNode,
    setGoogleNode,
    notionNode,
    setNotionNode,
    triggerNode,
    setTriggerNode,
    emailNode,
    setEmailNode,
    slackNode,
    setSlackNode,
    isLoading,
    setIsLoading,
    workflowTemplate,
    setWorkFlowTemplate,
  }

  return <Provider value={values}>{children}</Provider>
}

export const useNodeConnections = () => {
  const nodeConnection = useContext(ConnectionsContext)
  return { nodeConnection }
}
