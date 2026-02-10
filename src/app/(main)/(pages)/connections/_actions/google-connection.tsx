'use server'
import { clerkClient } from '@clerk/nextjs/server'
import { auth } from '@clerk/nextjs/server'
import { google } from 'googleapis'

export const getFileMetaData = async () => {
  'use server'
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.OAUTH2_REDIRECT_URI
  )

  const { userId } = await auth()

  if (!userId) {
    return { message: 'User not found' }
  }

  const client = await clerkClient();
  const clerkResponse = await client.users.getUserOauthAccessToken(
    userId,
    'oauth_google'
  );

  const accessToken = clerkResponse.data[0]?.token

  oauth2Client.setCredentials({
    access_token: accessToken,
  })

  const drive = google.drive({ version: 'v3', auth: oauth2Client })
  const response = await drive.files.list()

  if (response) {
    return response.data
  }
}

export const getFileContent = async (fileId: string) => {
  'use server'
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.OAUTH2_REDIRECT_URI
    )

    const { userId } = await auth()
    if (!userId) {
      return { error: 'User not found' }
    }

    const client = await clerkClient();
    const clerkResponse = await client.users.getUserOauthAccessToken(
      userId,
      'oauth_google'
    );

    const accessToken = clerkResponse.data[0]?.token
    if (!accessToken) {
      return { error: 'No access token found' }
    }

    oauth2Client.setCredentials({
      access_token: accessToken,
    })

    const drive = google.drive({ version: 'v3', auth: oauth2Client })
    
    // First get file metadata to check the MIME type
    const fileMetadata = await drive.files.get({
      fileId: fileId,
      fields: 'id,name,mimeType,size,modifiedTime'
    })

    const file = fileMetadata.data
    console.log('File metadata:', file)

    let content = ''
    let downloadUrl = ''

    // Handle different file types
    if (file.mimeType?.includes('google-apps')) {
      // Google Workspace files (Docs, Sheets, Slides)
      let exportMimeType = 'text/plain'
      
      if (file.mimeType === 'application/vnd.google-apps.document') {
        exportMimeType = 'text/plain' // or 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' for .docx
      } else if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
        exportMimeType = 'text/csv'
      } else if (file.mimeType === 'application/vnd.google-apps.presentation') {
        exportMimeType = 'text/plain'
      }

      // Export Google Workspace files
      const exportResponse = await drive.files.export({
        fileId: fileId,
        mimeType: exportMimeType,
      })

      content = exportResponse.data as string
    } else {
      // Regular files (PDF, images, etc.)
      const fileResponse = await drive.files.get({
        fileId: fileId,
        alt: 'media'
      })

      if (file.mimeType?.startsWith('text/') || file.mimeType === 'application/json') {
        content = fileResponse.data as string
      } else {
        // For binary files, we'll provide a download link instead of content
        downloadUrl = `https://drive.google.com/file/d/${fileId}/view`
        content = `File: ${file.name}\nType: ${file.mimeType}\nSize: ${file.size} bytes\nDownload: ${downloadUrl}`
      }
    }

    return {
      success: true,
      file: {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        modifiedTime: file.modifiedTime,
        content: content,
        downloadUrl: downloadUrl
      }
    }

  } catch (error: any) {
    console.error('Error getting file content:', error)
    return { 
      error: 'Failed to get file content', 
      details: error?.message 
    }
  }
}

export const getFileDownloadUrl = async (fileId: string) => {
  'use server'
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.OAUTH2_REDIRECT_URI
    )

    const { userId } = await auth()
    if (!userId) return null

    const client = await clerkClient();
    const clerkResponse = await client.users.getUserOauthAccessToken(
      userId,
      'oauth_google'
    );

    const accessToken = clerkResponse.data[0]?.token
    if (!accessToken) return null

    oauth2Client.setCredentials({
      access_token: accessToken,
    })

    const drive = google.drive({ version: 'v3', auth: oauth2Client })
    
    // Get file metadata
    const fileMetadata = await drive.files.get({
      fileId: fileId,
      fields: 'id,name,mimeType,webViewLink,webContentLink'
    })

    return {
      viewLink: fileMetadata.data.webViewLink,
      downloadLink: fileMetadata.data.webContentLink,
      name: fileMetadata.data.name,
      mimeType: fileMetadata.data.mimeType
    }

  } catch (error) {
    console.error('Error getting download URL:', error)
    return null
  }
}
