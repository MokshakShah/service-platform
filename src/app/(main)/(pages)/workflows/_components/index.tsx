import React from 'react'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

import Workflow from './workflow';
import MoreCredits from './more-creadits';

type Props = {}


const Workflows = async (props: Props) => {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return (
        <div className="mt-28 flex text-muted-foreground items-center justify-center">
          Please log in to view workflows
        </div>
      );
    }

    const workflows = await db.workflows.findMany({
      where: { userId },
    });

    return (
      <div className="relative flex flex-col gap-4">
        <section className="flex flex-col m-2">
          <MoreCredits />
          {workflows?.length ? (
            workflows.map((flow: any) => (
              <Workflow
                key={flow.id}
                {...flow}
              />
            ))
          ) : (
            <div className="mt-28 flex text-muted-foreground items-center justify-center">
              No Workflows
            </div>
          )}
        </section>
      </div>
    );
  } catch (error) {
    console.error('Error fetching workflows:', error);
    return (
      <div className="mt-28 flex text-muted-foreground items-center justify-center">
        Error loading workflows
      </div>
    );
  }
};

export default Workflows
