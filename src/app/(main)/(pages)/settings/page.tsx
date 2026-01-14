import ProfileForm from '@/components/forms/profile-form'
import React from 'react'
import ProfilePicture from './_components/profile-picture'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'


type Props = {}


const Settings = async (props: Props) => {
  const { userId } = await auth();
  
  if (!userId) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-red-500">You must be logged in to access settings.</p>
      </div>
    );
  }

  const user = await db.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-red-500">User not found in the database. Please contact support.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="sticky top-0 z-[10] flex items-center justify-between border-b bg-background/50 p-6 text-4xl backdrop-blur-lg">
        <span>Settings</span>
      </h1>
      <div className="flex flex-col gap-10 p-6">
        <div>
          <h2 className="text-2xl font-bold">User Profile</h2>
          <p className="text-base text-white/50">
            Add or update your information
          </p>
        </div>
        <ProfilePicture
          userImage={user?.profileImage || ''}
        />
        <ProfileForm
          user={user}
        />
      </div>
    </div>
  )
}

export default Settings
