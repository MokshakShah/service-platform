import { google } from 'googleapis'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/db'

export async function GET() {
  console.log('Drive API: Starting request...')
  
  try {
    const { userId } = await auth()
    console.log('Drive API: userId:', userId)
    
    if (!userId) {
      console.log('Drive API: No userId found')
      return NextResponse.json({ message: 'User not found' }, { status: 401 })
    }

    // Check environment variables
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.OAUTH2_REDIRECT_URI) {
      console.error('Drive API: Missing Google OAuth environment variables')
      return NextResponse.json(
        { message: 'Google OAuth not configured. Please contact administrator.' },
        { status: 500 }
      )
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.OAUTH2_REDIRECT_URI
    )

    console.log('Drive API: Getting Clerk client...')
    const clerk = await clerkClient()
    
    console.log('Drive API: Fetching Google OAuth token...')
    const clerkResponse = await clerk.users.getUserOauthAccessToken(
      userId,
      'google'
    )

    console.log('Drive API: Clerk response:', clerkResponse?.data?.length || 0, 'tokens found')

    if (!clerkResponse?.data || clerkResponse.data.length === 0) {
      console.log('Drive API: No Google OAuth tokens found')
      return NextResponse.json(
        { message: 'Google account not connected. Please connect your Google account first.' },
        { status: 400 }
      )
    }

    const accessToken = clerkResponse.data[0]?.token
    if (!accessToken) {
      console.log('Drive API: No access token in response')
      return NextResponse.json(
        { message: 'Failed to retrieve Google access token' },
        { status: 400 }
      )
    }

    console.log('Drive API: Setting OAuth credentials...')
    oauth2Client.setCredentials({
      access_token: accessToken,
    })

    console.log('Drive API: Creating Google Drive client...')
    const drive = google.drive({
      version: 'v3',
      auth: oauth2Client,
    })
    
    console.log('Drive API: Fetching files from Google Drive...')
    const response = await drive.files.list({
      pageSize: 10,
      fields: 'nextPageToken, files(id, name, mimeType, modifiedTime)',
    })

    console.log('Drive API: Files fetched successfully:', response.data.files?.length || 0, 'files')

    if (response?.data) {
      return NextResponse.json(
        {
          message: response.data,
        },
        {
          status: 200,
        }
      )
    } else {
      console.log('Drive API: No data in response')
      return NextResponse.json(
        {
          message: { files: [] },
        },
        {
          status: 200,
        }
      )
    }
  } catch (error: any) {
    console.error('Drive API: Error occurred:', error)
    console.error('Drive API: Error message:', error?.message)
    console.error('Drive API: Error stack:', error?.stack)
    
    // Handle specific Google API errors
    if (error?.code === 401) {
      return NextResponse.json(
        {
          message: 'Google access token expired. Please reconnect your Google account.',
          error: error?.message,
        },
        {
          status: 401,
        }
      )
    }
    
    if (error?.code === 403) {
      return NextResponse.json(
        {
          message: 'Insufficient permissions to access Google Drive. Please check your Google account permissions.',
          error: error?.message,
        },
        {
          status: 403,
        }
      )
    }

    return NextResponse.json(
      {
        message: 'Failed to fetch Google Drive files',
        error: error?.message || 'Unknown error',
        details: error?.toString(),
      },
      {
        status: 500,
      }
    )
  }
}
