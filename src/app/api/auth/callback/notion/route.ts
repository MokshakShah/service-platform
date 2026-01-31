import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const encoded = Buffer.from(
    `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_API_SECRET}`
  ).toString('base64');
  
  try {
    if (!code) {
      console.error('Notion OAuth: Code not provided');
      return NextResponse.redirect('https://localhost:3000/connections');
    }

    console.log('Notion OAuth: Code received:', code.substring(0, 20) + '...');

    const response = await axios('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-type': 'application/json',
        Authorization: `Basic ${encoded}`,
        'Notion-Version': '2022-06-28',
      },
      data: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.NOTION_REDIRECT_URI!,
      }),
    });

    if (response.data) {
      console.log('Notion OAuth Success');
      const notion = new Client({
        auth: response.data.access_token,
      });
      
      const databasesPages = await notion.search({
        sort: {
          direction: 'ascending',
          timestamp: 'last_edited_time',
        },
      });
      
      console.log('Search results count:', databasesPages?.results?.length);
      console.log('Search results:', databasesPages?.results?.map((r: any) => ({ object: r.object, id: r.id })));
      
      // Filter for database objects since search returns both pages and databases
      const databases = databasesPages?.results?.filter(
        (result: any) => result.object === 'database'
      );
      
      console.log('Databases found:', databases?.length);
      console.log('Databases:', databases?.map((db: any) => ({ id: db.id, title: db.title })));
      
      const databaseId = databases?.length ? databases[0].id : '';

      console.log('Database ID found:', databaseId);

      const redirectUrl = `https://localhost:3000/connections?access_token=${response.data.access_token}&workspace_name=${response.data.workspace_name}&workspace_icon=${response.data.workspace_icon}&workspace_id=${response.data.workspace_id}&database_id=${databaseId}`;
      console.log('Redirecting to:', redirectUrl);
      
      return NextResponse.redirect(redirectUrl);
    }
  } catch (error: any) {
    console.error('Notion OAuth Error:', error?.response?.data || error.message);
    return NextResponse.redirect(`https://localhost:3000/connections?error=notion_failed`);
  }

  return NextResponse.redirect('https://localhost:3000/connections');
}
