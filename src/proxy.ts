import { clerkMiddleware } from '@clerk/nextjs/server';

export const config = {
  matcher: ['/((?!.+\.[\w]+$|_next).*)', '/', '/(api|trpc)(.*)', '/billing'],
};

export default clerkMiddleware();
