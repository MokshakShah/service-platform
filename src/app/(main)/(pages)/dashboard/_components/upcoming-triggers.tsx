import React from 'react';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Clock4 } from 'lucide-react';

type Trigger = {
  workflowId: string;
  workflowName: string;
  scheduleTime: string;
  description: string;
  completed: boolean;
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

    const scheduledTriggers: Trigger[] = [];
    const now = new Date();

    workflows.forEach((workflow) => {
      if (workflow.triggerTemplate) {
        try {
          const triggerData = JSON.parse(workflow.triggerTemplate);
          if (triggerData.triggerType === 'schedule' && triggerData.scheduleDate && triggerData.scheduleTime) {
            const scheduleDateTime = new Date(`${triggerData.scheduleDate}T${triggerData.scheduleTime}`);
            scheduledTriggers.push({
              workflowId: workflow.id,
              workflowName: workflow.name,
              scheduleTime: scheduleDateTime.toISOString(),
              description: triggerData.description || 'Scheduled trigger',
              completed: scheduleDateTime <= now || Boolean(triggerData.executedAt),
            });
          }
        } catch (error) {
          console.error('Error parsing trigger template:', error);
        }
      }
    });

    // Sort by schedule time (latest first)
    scheduledTriggers.sort((a, b) => new Date(b.scheduleTime).getTime() - new Date(a.scheduleTime).getTime());

    if (scheduledTriggers.length === 0) {
      return (
        <Card className="m-6">
          <CardHeader>
            <CardTitle>Scheduled Triggers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No scheduled triggers yet.</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="m-6">
        <CardHeader>
          <CardTitle>Scheduled Triggers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {scheduledTriggers.slice(0, 10).map((trigger, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Link href={`/workflows/editor/${trigger.workflowId}`} className="font-medium hover:underline">
                    {trigger.workflowName}
                  </Link>
                  <p className="text-sm text-muted-foreground">{trigger.description}</p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    {trigger.completed ? (
                      <div className="inline-flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-xs font-medium">Done</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 text-amber-600">
                        <Clock4 className="w-4 h-4" />
                        <span className="text-xs font-medium">Pending</span>
                      </div>
                    )}
                  </div>
                  <div>
                  <p className="text-sm font-medium">
                    {new Date(trigger.scheduleTime).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(trigger.scheduleTime).toLocaleTimeString()}
                  </p>
                  </div>
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