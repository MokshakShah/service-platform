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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { onContentChange } from '@/lib/editor-utils'
import GoogleFileDetails from './google-file-details'
import GoogleDriveFiles from './google-drive-files'
import ActionButton from './action-button'
import axios from 'axios'
import { toast } from 'sonner'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { X, Upload, FileImage, FileVideo } from 'lucide-react'

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
  const { user } = useUser()

  const [driveFiles, setDriveFiles] = React.useState<any[]>([])
  const [selectedFileId, setSelectedFileId] = React.useState<string>('')

  // Initialize sender email when Email node is selected
  useEffect(() => {
    if (title === 'Email' && user?.emailAddresses?.[0]?.emailAddress) {
      nodeConnection.setEmailNode((prev: any) => ({
        ...prev,
        senderEmail: user.emailAddresses[0].emailAddress,
      }))
    }
  }, [title, user, nodeConnection])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const fileArray = Array.from(files)
      const validFiles = fileArray.filter(file => {
        const isImage = file.type.startsWith('image/')
        const isVideo = file.type.startsWith('video/')
        const maxSize = 10 * 1024 * 1024 // 10MB
        
        if (!isImage && !isVideo) {
          toast.error(`${file.name} is not a valid image or video file`)
          return false
        }
        
        if (file.size > maxSize) {
          toast.error(`${file.name} is too large. Maximum size is 10MB`)
          return false
        }
        
        return true
      })
      
      nodeConnection.setEmailNode((prev: any) => ({
        ...prev,
        attachments: [...prev.attachments, ...validFiles],
      }))
      
      if (validFiles.length > 0) {
        toast.success(`Added ${validFiles.length} file(s) to attachments`)
      }
    }
  }

  const removeAttachment = (index: number) => {
    nodeConnection.setEmailNode((prev: any) => ({
      ...prev,
      attachments: prev.attachments.filter((_: any, i: number) => i !== index),
    }))
  }

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
      : title === 'Trigger'
        ? true // Trigger is always "connected" since it's a starting point
        : title === 'Email'
          ? true // Email is always "connected" since it uses logged-in user's email
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
          {title === 'Email' ? (
            <>
              <p>Configure email settings</p>
              <div className="flex flex-col gap-4">
                {/* Sender Email (Read-only) */}
                <div>
                  <Label htmlFor="senderEmail" className="text-sm font-medium">
                    From (Sender Email)
                  </Label>
                  <Input
                    id="senderEmail"
                    type="email"
                    value={nodeConnectionType.senderEmail}
                    disabled
                    className="bg-gray-50 text-gray-600"
                    placeholder="Your email will appear here"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This will be your logged-in email address
                  </p>
                </div>

                {/* Recipient Email */}
                <div>
                  <Label htmlFor="recipientEmail" className="text-sm font-medium">
                    To (Recipient Email) *
                  </Label>
                  <Input
                    id="recipientEmail"
                    type="email"
                    placeholder="recipient@example.com"
                    value={nodeConnectionType.recipientEmail}
                    onChange={(event) => {
                      nodeConnection.setEmailNode((prev: any) => ({
                        ...prev,
                        recipientEmail: event.target.value,
                      }))
                    }}
                  />
                </div>

                {/* Subject */}
                <div>
                  <Label htmlFor="subject" className="text-sm font-medium">
                    Subject *
                  </Label>
                  <Input
                    id="subject"
                    type="text"
                    placeholder="Enter email subject"
                    value={nodeConnectionType.subject}
                    onChange={(event) => {
                      nodeConnection.setEmailNode((prev: any) => ({
                        ...prev,
                        subject: event.target.value,
                      }))
                    }}
                  />
                </div>

                {/* Body */}
                <div>
                  <Label htmlFor="body" className="text-sm font-medium">
                    Message Body *
                  </Label>
                  <Textarea
                    id="body"
                    placeholder="Enter your email message here..."
                    value={nodeConnectionType.body}
                    onChange={(event) => {
                      nodeConnection.setEmailNode((prev: any) => ({
                        ...prev,
                        body: event.target.value,
                      }))
                    }}
                    rows={6}
                    className="resize-none"
                  />
                </div>

                {/* Attachments */}
                <div>
                  <Label className="text-sm font-medium">
                    Attachments (Optional)
                  </Label>
                  <div className="mt-2">
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('file-upload')?.click()}
                      className="w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Images/Videos
                    </Button>
                    <p className="text-xs text-gray-500 mt-1">
                      Supported: Images and Videos (Max 10MB each)
                    </p>
                  </div>

                  {/* Display Attachments */}
                  {nodeConnectionType.attachments && nodeConnectionType.attachments.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-2">
                        Attached Files ({nodeConnectionType.attachments.length})
                      </p>
                      <div className="space-y-2">
                        {nodeConnectionType.attachments.map((file: File, index: number) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                          >
                            <div className="flex items-center gap-2">
                              {file.type.startsWith('image/') ? (
                                <FileImage className="w-4 h-4 text-blue-500" />
                              ) : (
                                <FileVideo className="w-4 h-4 text-green-500" />
                              )}
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{file.name}</span>
                                <span className="text-xs text-gray-500">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </span>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAttachment(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : title === 'Trigger' ? (
            <>
              <p>Configure your workflow trigger</p>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-sm font-medium">Trigger Type</label>
                  <Select
                    value={nodeConnectionType.triggerType}
                    onValueChange={(value) => {
                      nodeConnection.setTriggerNode((prev: any) => ({
                        ...prev,
                        triggerType: value,
                      }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select trigger type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="webhook">Webhook</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="schedule">Schedule</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {nodeConnectionType.triggerType === 'webhook' && (
                  <div>
                    <label className="text-sm font-medium">Webhook URL</label>
                    <Input
                      type="text"
                      placeholder="https://your-webhook-url.com"
                      value={nodeConnectionType.webhookUrl}
                      onChange={(event) => {
                        nodeConnection.setTriggerNode((prev: any) => ({
                          ...prev,
                          webhookUrl: event.target.value,
                        }))
                      }}
                    />
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    type="text"
                    placeholder="Describe when this workflow should trigger..."
                    value={nodeConnectionType.description}
                    onChange={(event) => {
                      nodeConnection.setTriggerNode((prev: any) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <p>{title === 'Notion' ? 'Values to be stored' : 'Message'}</p>
              <Input
                type="text"
                value={nodeConnectionType.content}
                onChange={(event) => onContentChange(nodeConnection, title, event)}
              />
            </>
          )}

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
            file={file}
          />
        </div>
      </Card>
    </AccordionContent>
  )
}

export default ContentBasedOnTitle
