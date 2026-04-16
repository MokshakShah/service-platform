
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import UpcomingTriggers from './_components/upcoming-triggers';

const DashboardPage = () => {
  return (
    <>
      <SignedIn>
        <div className="flex flex-col gap-4 relative">
          <h1 className="text-4xl sticky top-0 z-[10] p-6 bg-background/50 backdrop-blur-lg flex items-center border-b">
            Dashboard
          </h1>
          <UpcomingTriggers />
        </div>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
};

export default DashboardPage;
