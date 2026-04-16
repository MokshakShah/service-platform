'use server';
import { Option } from '@/components/ui/multiple-selector';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import axios from 'axios';

const registerHourlyScheduler = async () => {
  if (!process.env.CRON_JOB_KEY || !process.env.NEXT_PUBLIC_BASE_URL) {
    return;
  }

  try {
    await axios.put(
      'https://api.cron-job.org/jobs',
      {
        job: {
          url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/scheduled-triggers`,
          enabled: 'true',
          schedule: {
            timezone: 'UTC',
            expiresAt: 0,
            hours: [-1],
            mdays: [-1],
            minutes: [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56],
            months: [-1],
            wdays: [-1],
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.CRON_JOB_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Failed to register hourly scheduler:', error);
  }
};

export const getGoogleListener = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/google-listener`, { cache: 'no-store' });
  if (!res.ok) return null;
  const listener = await res.json();
  return listener;
};

export const onFlowPublish = async (workflowId: string, state: boolean) => {
  // console.log(state);
  const published = await db.workflows.update({
    where: {
      id: workflowId,
    },
    data: {
      publish: state,
    },
  });

  if (published.publish) return 'Workflow published';
  return 'Workflow unpublished';
};

export const onCreateNodeTemplate = async (
  content: string,
  type: string,
  workflowId: string,
  channels?: Option[],
  accessToken?: string,
  notionDbId?: string
) => {
  if (type === 'Discord') {
    const response = await db.workflows.update({
      where: {
        id: workflowId,
      },
      data: {
        discordTemplate: content,
      },
    });

    if (response) {
      return 'Discord template saved';
    }
  }
  if (type === 'Slack') {
    const response = await db.workflows.update({
      where: {
        id: workflowId,
      },
      data: {
        slackTemplate: content,
        slackAccessToken: accessToken,
      },
    });

    if (response) {
      const channelList = await db.workflows.findUnique({
        where: {
          id: workflowId,
        },
        select: {
          slackChannels: true,
        },
      });

      if (channelList) {
        //remove duplicates before insert

        const NonDuplicated = channelList.slackChannels.filter(
          (channel: string) => channel !== channels![0].value
        );

        NonDuplicated!
          .map((channel: string) => channel)
          .forEach(async (channel: string) => {
            await db.workflows.update({
              where: {
                id: workflowId,
              },
              data: {
                slackChannels: {
                  push: channel,
                },
              },
            });
          });

        return 'Slack template saved';
      }
      channels!
        .map((channel) => channel.value)
        .forEach(async (channel) => {
          await db.workflows.update({
            where: {
              id: workflowId,
            },
            data: {
              slackChannels: {
                push: channel,
              },
            },
          });
        });
      return 'Slack template saved';
    }
  }

  if (type === 'Notion') {
    const response = await db.workflows.update({
      where: {
        id: workflowId,
      },
      data: {
        notionTemplate: content,
        notionAccessToken: accessToken,
        notionDbId: notionDbId,
      },
    });

    if (response) return 'Notion template saved';
  }

  if (type === 'Email') {
    let parsedEmailConfig: any = null;

    try {
      parsedEmailConfig = JSON.parse(content);
    } catch (error) {
      return 'Invalid email configuration';
    }

    const existing = await db.workflows.findUnique({
      where: {
        id: workflowId,
      },
      select: {
        triggerTemplate: true,
      },
    });

    let existingTriggerTemplate: any = {};

    if (existing?.triggerTemplate) {
      try {
        existingTriggerTemplate = JSON.parse(existing.triggerTemplate);
      } catch (error) {
        existingTriggerTemplate = {};
      }
    }

    const response = await db.workflows.update({
      where: {
        id: workflowId,
      },
      data: {
        triggerTemplate: JSON.stringify({
          ...existingTriggerTemplate,
          emailConfig: parsedEmailConfig,
        }),
      },
    });

    if (response) return 'Email template saved';
  }

  if (type === 'Trigger') {
    let parsedContent: any = null;

    try {
      parsedContent = JSON.parse(content);
    } catch (error) {
      return 'Invalid trigger configuration';
    }

    if (!parsedContent?.scheduleDate || !parsedContent?.scheduleTime) {
      return 'Please select both schedule date and schedule time';
    }

    const scheduledAt = new Date(
      `${parsedContent.scheduleDate}T${parsedContent.scheduleTime}`
    );
    const minAllowed = new Date(Date.now() + 10 * 60 * 1000);

    if (Number.isNaN(scheduledAt.getTime())) {
      return 'Invalid schedule date or time';
    }

    if (scheduledAt < minAllowed) {
      return 'Schedule must be at least 10 minutes in the future';
    }

    const existing = await db.workflows.findUnique({
      where: {
        id: workflowId,
      },
      select: {
        triggerTemplate: true,
      },
    });

    let existingTriggerTemplate: any = {};

    if (existing?.triggerTemplate) {
      try {
        existingTriggerTemplate = JSON.parse(existing.triggerTemplate);
      } catch (error) {
        existingTriggerTemplate = {};
      }
    }

    const response = await db.workflows.update({
      where: {
        id: workflowId,
      },
      data: {
        triggerTemplate: JSON.stringify({
          ...existingTriggerTemplate,
          ...parsedContent,
          triggerType: 'schedule',
          executedAt: null,
        }),
      },
    });

    if (response) {
      await registerHourlyScheduler();
      return 'Trigger configuration saved';
    }
  }
};



export const onCreateWorkflow = async (name: string, description: string) => {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return { message: 'Unauthorized' };
    }

    const workflow = await db.workflows.create({
      data: {
        userId,
        name,
        description,
      },
    });

    if (workflow) {
      return { message: 'Workflow created' };
    }

    return { message: 'Failed to create workflow' };
  } catch (error: any) {
    console.error('Create workflow error:', error);
    return { message: error?.message || 'Oops!Pls try again' };
  }
};

export const onGetNodesEdges = async (flowId: string) => {
  const nodesEdges = await db.workflows.findUnique({
    where: {
      id: flowId,
    },
    select: {
      nodes: true,
      edges: true,
    },
  });
  if (nodesEdges?.nodes && nodesEdges?.edges) return nodesEdges;
};
