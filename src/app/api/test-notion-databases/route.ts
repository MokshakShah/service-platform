import { NextResponse } from 'next/server'
import { Client } from '@notionhq/client'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const accessToken = searchParams.get('token')

  if (!accessToken) {
    return NextResponse.json({ error: 'No access token provided' }, { status: 400 })
  }

  try {
    const notion = new Client({ auth: accessToken })
    
    console.log('Testing Notion API with token:', accessToken.substring(0, 20) + '...')
    
    // Search for databases
    const response = await notion.search({
      filter: {
        value: 'database',
        property: 'object'
      }
    })
    
    console.log('Notion search response:', response)
    
    return NextResponse.json({
      success: true,
      databases: response.results,
      count: response.results.length
    })
  } catch (error: any) {
    console.error('Error testing Notion databases:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error
    }, { status: 500 })
  }
}