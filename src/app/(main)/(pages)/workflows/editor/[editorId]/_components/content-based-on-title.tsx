import { AccordionContent } from '@/components/ui/accordion'
import { ConnectionProviderProps } from '@/providers/connections-provider'
import { EditorState } from '@/providers/editor-provider'
import { nodeMapper } from '@/lib/types'
import React, { useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { onContentChange } from '@/lib/editor-utils'
import GoogleFileDetails from './google-file-details'
import GoogleDriveFiles from './google-drive-files'
import ActionButton from './action-button'
import axios from 'axios'
import { toast } from 'sonner'

export interface Option {
  value: string
  label: string
  disable?: boolean
  /** fixed option that can't be removed. */
  fixed?: boolean
  /** Group the options by providing key. */
  [key: string]: string | boolean | undefined
}
interface GroupOption {
  [key: string]: Option[]
}

type Props = {
  nodeConnection: ConnectionProviderProps
  newState: EditorState
  file: any
  setFile: (file: any) => void
  selectedSlackChannels: Option[]
  setSelectedSlackChannels: (value: Option[]) => void
}

const ContentBasedOnTitle = ({
  nodeConnection,
  newState,
  file,
  setFile,
  selectedSlackChannels,
  setSelectedSlackChannels,
}: Props) => {
  const { selectedNode } = newState.editor
  const title = selectedNode.data.title

  const [driveFiles, setDriveFiles] = React.useState<any[]>([])
  const [selectedFileId, setSelectedFileId] = React.useState<string>('')

  useEffect(() => {
    const reqGoogle = async () => {
      try {
        console.log('Fetching Google Drive files...')
        const response: { data: { message: { files: any } } } = await axios.get(
          '/api/drive'
        )
        if (response?.data?.message?.files) {
          console.log('Google Drive files fetched:', response.data.message.files)
          toast.message("Files fetched successfully")
          setDriveFiles(response.data.message.files)
          // Set first file as default selection
          if (response.data.message.files.length > 0) {
            setFile(response.data.message.files[0])
            setSelectedFileId(response.data.message.files[0].id)
          }
        } else {
          console.log('No files found in Google Drive response')
          toast.error('No files found')
        }
      } catch (error: any) {
        console.error('Error fetching Google Drive files:', error)
        console.error('Error response:', error?.response?.data)
        
        if (error?.response?.status === 400) {
          toast.error('Please connect your Google account first in Connections')
        } else if (error?.response?.status === 401) {
          toast.error('Please sign in to access Google Drive')
        } else {
          toast.error(error?.response?.data?.message || 'Failed to fetch Google Drive files')
        }
      }
    }

    const loadNotionConnection = async () => {
      try {
        console.log('Loading Notion connection...')
        const response = await axios.get('/api/connections')
        console.log('Connections API response:', response.data)
        
        if (response?.data?.notion) {
          console.log('Notion connection found, setting notionNode:', response.data.notion)
          nodeConnection.setNotionNode((prev: any) => ({
            ...prev,
            accessToken: response.data.notion.accessToken,
            databaseId: response.data.notion.databaseId,
            workspaceName: response.data.notion.workspaceName,
          }))
          
          // Check if database is configured
          if (response.data.notion.databaseId) {
            toast.success('Notion connection loaded successfully')
          } else {
            toast.error('Database not configured. Please select a database in your Notion connection.')
          }
        } else {
          console.log('No Notion connection found')
          toast.error('Database not configured. Please connect Notion in Connections first.')
        }
      } catch (error: any) {
        console.error('Error loading Notion connection:', error)
        console.error('Error response:', error?.response?.data)
        toast.error(error?.response?.data?.message || 'Failed to load Notion connection')
      }
    }

    if (title === 'Notion') {
      loadNotionConnection()
    } else if (title === 'Google Drive') {
      reqGoogle()
    }
  }, [title])

  // @ts-ignore
  const nodeConnectionType: any = nodeConnection[nodeMapper[title]]
  if (!nodeConnectionType) return <p>Not connected</p>

  const isConnected =
    title === 'Google Drive'
      ? !nodeConnection.isLoading
      : !!nodeConnectionType[
      `${title === 'Slack'
        ? 'slackAccessToken'
        : title === 'Discord'
          ? 'webhookURL'
          : title === 'Notion'
            ? 'accessToken'
            : ''
      }`
      ]

  if (!isConnected) return <p>Not connected</p>

  return (
    <AccordionContent>
      <Card>
        {title === 'Discord' && (
          <CardHeader>
            <CardTitle>{nodeConnectionType.webhookName}</CardTitle>
            <CardDescription>{nodeConnectionType.guildName}</CardDescription>
          </CardHeader>
        )}
        <div className="flex flex-col gap-3 px-6 py-3 pb-20">
          <p>{title === 'Notion' ? 'Values to be stored' : 'Message'}</p>

          <Input
            type="text"
            value={nodeConnectionType.content}
            onChange={(event) => onContentChange(nodeConnection, title, event)}
          />

          {JSON.stringify(file) !== '{}' && title !== 'Google Drive' && (
            <Card className="w-full">
              <CardContent className="px-2 py-3">
                <div className="flex flex-col gap-4">
                  <CardDescription>Drive File</CardDescription>
                  <div className="flex flex-wrap gap-2">
                    <GoogleFileDetails
                      nodeConnection={nodeConnection}
                      title={title}
                      gFile={file}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {title === 'Google Drive' && (
            <div className="flex flex-col gap-3">
              {driveFiles.length > 0 ? (
                <>
                  <p>Select a file from your Google Drive:</p>
                  <Select
                    value={selectedFileId}
                    onValueChange={(value) => {
                      setSelectedFileId(value)
                      const selectedFile = driveFiles.find(f => f.id === value)
                      if (selectedFile) {
                        setFile(selectedFile)
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a file..." />
                    </SelectTrigger>
                    <SelectContent>
                      {driveFiles.map((driveFile) => (
                        <SelectItem key={driveFile.id} value={driveFile.id}>
                          <div className="flex flex-col">
                            <span>{driveFile.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {driveFile.mimeType} • Modified: {new Date(driveFile.modifiedTime).toLocaleDateString()}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {file && (
                    <Card className="w-full">
                      <CardContent className="px-2 py-3">
                        <div className="flex flex-col gap-2">
                          <CardDescription>Selected File</CardDescription>
                          <div className="text-sm">
                            <p><strong>Name:</strong> {file.name}</p>
                            <p><strong>Type:</strong> {file.mimeType}</p>
                            <p><strong>Modified:</strong> {new Date(file.modifiedTime).toLocaleString()}</p>
                            <p><strong>ID:</strong> {file.id}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <GoogleDriveFiles />
              )}
            </div>
          )}
          <ActionButton
            currentService={title}
            nodeConnection={nodeConnection}
            channels={selectedSlackChannels}
            setChannels={setSelectedSlackChannels}
          />
        </div>
      </Card>
    </AccordionContent>
  )
}

export default ContentBasedOnTitle
