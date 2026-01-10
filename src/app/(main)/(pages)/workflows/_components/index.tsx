import React from 'react'

import Workflow from './workflow';
import MoreCredits from './more-creadits';

type Props = {}


const Workflows = async (props: Props) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/workflows`, {
    cache: 'no-store',
  });
  const workflows = await res.json();
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
};

export default Workflows
