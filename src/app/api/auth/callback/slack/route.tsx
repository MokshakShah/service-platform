import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  // Extract the code parameter from the query string
  const code = req.nextUrl.searchParams.get('code')

  // Check if the code parameter is missing
  if (!code) {
    console.error('Slack OAuth: Code not provided')
    return new NextResponse('Code not provided', { status: 400 })
  }

  console.log('Slack OAuth: Code received:', code.substring(0, 20) + '...')

  try {
    // Make a POST request to Slack's OAuth endpoint to exchange the code for an access token
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        redirect_uri: process.env.SLACK_REDIRECT_URI!,
      }),
    })

    const data = await response.json()
    console.log('Slack OAuth Response OK:', data.ok)

    // Check if the response indicates a failure
    if (!data.ok) {
      console.error('Slack OAuth failed:', data.error)
      throw new Error(data.error || 'Slack OAuth failed')
    }

    if (!!data?.ok) {
      const appId = data?.app_id
      const userId = data?.authed_user?.id
      const userToken = data?.authed_user?.access_token
      const accessToken = data?.access_token
      const botUserId = data?.bot_user_id
      const teamId = data?.team?.id
      const teamName = data?.team?.name

      console.log('Slack OAuth Success - Redirecting with params:')
      console.log('  app_id:', appId)
      console.log('  authed_user_id:', userId)
      console.log('  slack_access_token:', accessToken?.substring(0, 20) + '...')
      console.log('  team_id:', teamId)

      // Handle the successful OAuth flow and redirect the user
      const redirectUrl = `https://localhost:3000/connections?app_id=${appId}&authed_user_id=${userId}&authed_user_token=${userToken}&slack_access_token=${accessToken}&bot_user_id=${botUserId}&team_id=${teamId}&team_name=${teamName}`
      console.log('Redirect URL:', redirectUrl)
      return NextResponse.redirect(redirectUrl)
    }
  } catch (error) {
    console.error('Slack OAuth Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
