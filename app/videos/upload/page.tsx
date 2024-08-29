// app/videos/upload/page.tsx
'use client';

import React from 'react';
import VideoUpload from '@/components/VideoUpload';
import VideoNavigation from '@/components/VideoNavigation';

export default function UploadVideoPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <VideoNavigation />
      <h1 className="text-3xl font-bold mb-6">Upload Video</h1>
      <VideoUpload />
    </div>
  );
}