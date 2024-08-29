// app/videos/record/page.tsx
'use client';

import React from 'react';
import VideoRecorder from '@/components/VideoRecorder';
import VideoNavigation from '@/components/VideoNavigation';

export default function RecordVideoPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <VideoNavigation />
      <h1 className="text-3xl font-bold mb-6">Record Video</h1>
      <VideoRecorder />
    </div>
  );
}