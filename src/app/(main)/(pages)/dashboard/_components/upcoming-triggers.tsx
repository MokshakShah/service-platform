import React from 'react';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Trigger = {
  workflowId: string;
  workflowName: string;
  scheduleTime: string;
  description: string;
};

const UpcomingTriggers = async () => {
  try {
    const { userId } = await auth();

    if (!userId) {
      return null;
    }

    // Fetch workflows with triggerTemplate
    const workflows = await db.workflows.findMany({
      where: {
        userId,
        triggerTemplate: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        triggerTemplate: true,
      },
    });

    const upcomingTriggers: Trigger[] = [];

    workflows.forEach((workflow) => {
      if (workflow.triggerTemplate) {
        try {
          const triggerData = JSON.parse(workflow.triggerTemplate);
          if (triggerData.triggerType === 'schedule' && triggerData.scheduleDate && triggerData.scheduleTime) {
            const scheduleDateTime = new Date(`${triggerData.scheduleDate}T${triggerData.scheduleTime}`);
            if (scheduleDateTime > new Date()) {
              upcomingTriggers.push({
                workflowId: workflow.id,
                workflowName: workflow.name,
                scheduleTime: scheduleDateTime.toISOString(),
                description: triggerData.description || 'Scheduled trigger',
              });
            }
          }
        } catch (error) {
          console.error('Error parsing trigger template:', error);
        }
      }
    });

    // Sort by schedule time
    upcomingTriggers.sort((a, b) => new Date(a.scheduleTime).getTime() - new Date(b.scheduleTime).getTime());

    if (upcomingTriggers.length === 0) {
      return (
        <Card className="m-6">
          <CardHeader>
            <CardTitle>Upcoming Triggers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No upcoming triggers scheduled.</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="m-6">
        <CardHeader>
          <CardTitle>Upcoming Triggers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {upcomingTriggers.slice(0, 5).map((trigger, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Link href={`/workflows/editor/${trigger.workflowId}`} className="font-medium hover:underline">
                    {trigger.workflowName}
                  </Link>
                  <p className="text-sm text-muted-foreground">{trigger.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {new Date(trigger.scheduleTime).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(trigger.scheduleTime).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  } catch (error) {
    console.error('Error fetching upcoming triggers:', error);
    return (
      <Card className="m-6">
        <CardHeader>
          <CardTitle>Upcoming Triggers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Error loading upcoming triggers.</p>
        </CardContent>
      </Card>
    );
  }
};

export default UpcomingTriggers;