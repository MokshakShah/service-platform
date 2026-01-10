import ProfileForm from '@/components/forms/profile-form'
import React from 'react'
import ProfilePicture from './_components/profile-picture'


type Props = {}


const Settings = async (props: Props) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/settings`, { cache: 'no-store' });
  if (!res.ok) return null;
  const user = await res.json();
  if (!user) return null;


  // TODO: Move these actions to API routes or server actions triggered by HTTP request if needed
  const removeProfileImage = async () => {};
  const uploadProfileImage = async (image: string) => {};
  const updateUserInfo = async (name: string) => {};

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
          onDelete={removeProfileImage}
          userImage={user?.profileImage || ''}
          onUpload={uploadProfileImage}
        />
        <ProfileForm
          user={user}
          onUpdate={updateUserInfo}
        />
      </div>
    </div>
  )
}

export default Settings
