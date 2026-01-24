"use client";
import { CONNECTIONS } from '@/lib/constant';
import React from 'react';
import ConnectionCard from './_components/connection-card';
import { useUser } from '@clerk/nextjs';
import { onDiscordConnect } from './_actions/discord-connection';
import { onNotionConnect } from './_actions/notion-connection';
import { onSlackConnect } from './_actions/slack-connection';
import { getUserData } from './_actions/get-user';
import Link from 'next/link';

type Props = {
  searchParams?: { [key: string]: string | undefined };
};


const ConnectionsClient = (props: Props) => {
  const {
    webhook_id,
    webhook_name,
    webhook_url,
    guild_id,
    guild_name,
    channel_id,
    access_token,
    workspace_name,
    workspace_icon,
    workspace_id,
    database_id,
    app_id,
    authed_user_id,
    authed_user_token,
    slack_access_token,
    bot_user_id,
    team_id,
    team_name,
  } = props.searchParams ?? {
    webhook_id: '',
    webhook_name: '',
    webhook_url: '',
    guild_id: '',
    guild_name: '',
    channel_id: '',
    access_token: '',
    workspace_name: '',
    workspace_icon: '',
    workspace_id: '',
    database_id: '',
    app_id: '',
    authed_user_id: '',
    authed_user_token: '',
    slack_access_token: '',
    bot_user_id: '',
    team_id: '',
    team_name: '',
  };

  // console.log('ConnectionsClient received searchParams:');
  // if (slack_access_token) console.log('  slack_access_token:', slack_access_token.substring(0, 20) + '...');
  // if (app_id) console.log('  app_id:', app_id);
  // if (authed_user_id) console.log('  authed_user_id:', authed_user_id);
  if (access_token) console.log('  Notion access_token:', access_token.substring(0, 20) + '...');
  if (workspace_id) console.log('  Notion workspace_id:', workspace_id);

  const { user } = useUser();
  const [connections, setConnections] = React.useState<any>({});

  React.useEffect(() => {
    if (!user) return;
    const onUserConnections = async () => {
      try {
        if (channel_id) {
          await onDiscordConnect(
            channel_id!,
            webhook_id!,
            webhook_name!,
            webhook_url!,
            user.id,
            guild_name!,
            guild_id!
          );
        }

        if (access_token) {
          console.log('Connecting Notion with token:', access_token.substring(0, 20) + '...');
          await onNotionConnect(
            access_token!,
            workspace_id!,
            workspace_icon!,
            workspace_name!,
            database_id!,
            user.id
          );
          console.log('Notion connected successfully');
        }

        if (slack_access_token) {
          await onSlackConnect(
            app_id!,
            authed_user_id!,
            authed_user_token!,
            slack_access_token!,
            bot_user_id!,
            team_id!,
            team_name!,
            user.id
          );
        }

        const connections: any = {};
        const user_info = await getUserData(user.id);
        console.log('User connections from DB:', user_info?.connections);
        user_info?.connections.map((connection: any) => {
          connections[connection.type] = true;
          return (connections[connection.type] = true);
        });
        console.log('Final connections state:', connections);
        return connections;
      } catch (error) {
        console.error('Error connecting services:', error);
        return {};
      }
    };
    onUserConnections().then(setConnections);
    // eslint-disable-next-line
  }, [user, channel_id, access_token, slack_access_token]);

  if (!user) return null;

  return (
    <div className="relative flex flex-col gap-4">
      <h1 className="sticky top-0 z-[10] flex items-center justify-between border-b bg-background/50 p-6 text-4xl backdrop-blur-lg">
        Connections
      </h1>
      <div className="relative flex flex-col gap-4">
        <section className="flex flex-col gap-4 p-6 text-muted-foreground">
          Connect all your apps directly from here. You may need to connect
          these apps regularly to refresh verification
          {CONNECTIONS.map((connection) => {
            const { title } = connection;
            const getHref = () => {
              if (title === 'Discord') return process.env.NEXT_PUBLIC_DISCORD_REDIRECT || '#';
              if (title === 'Notion') return process.env.NEXT_PUBLIC_NOTION_AUTH_URL || '#';
              if (title === 'Slack') {
                const slackRedirect = process.env.NEXT_PUBLIC_SLACK_REDIRECT || '#';
                console.log('Slack Redirect URL:', slackRedirect);
                return slackRedirect;
              }
              return '#';
            };

            const href = getHref();
            if (title === 'Slack') console.log('Slack href:', href);

            return (
              <ConnectionCard
                key={connection.title}
                description={connection.description}
                title={connection.title}
                icon={connection.image}
                type={connection.title}
                connected={connections}
                action={
                  href && href !== '#' ? (
                    <Link
                      href={href}
                      className="rounded-lg bg-gray-600 p-2 font-bold text-white hover:bg-gray-700"
                    >
                      Connect
                    </Link>
                  ) : (
                    <span className="rounded-lg bg-gray-400 p-2 font-bold text-white opacity-50 cursor-not-allowed">
                      Connect
                    </span>
                  )
                }
              />
            );
          })}
        </section>
      </div>
    </div>
  );
};

export default ConnectionsClient;
