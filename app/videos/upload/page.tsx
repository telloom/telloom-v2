// app/videos/upload/page.tsx
'use client';

import React from 'react';
import VideoUpload from '@/components/VideoUpload';
import VideoNavigation from '../../../src/components/VideoNavigation';
import UserInfo from '@/components/UserInfo';

export default function VideoUploadPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <UserInfo />
      <VideoNavigation />
      <h1 className="text-3xl font-bold mb-6">Upload Video</h1>
      <VideoUpload 
        promptId={/* Add promptId value */}
        onUploadComplete={/* Add onUploadComplete function */}
        createVideo={/* Add createVideo function */}
      />
    </div>
  );
}