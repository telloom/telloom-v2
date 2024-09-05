'use client';

import React from 'react';
import MuxUploader from '@mux/mux-uploader-react';
import { createUploadUrl } from '@/utils/muxClient';
import { useRouter } from 'next/navigation';

interface MuxUploaderProps {
  promptId: string;
  userId: string;
}

export default function MuxUploaderComponent({ promptId, userId }: MuxUploaderProps) {
  const router = useRouter();

  const handleUploadSuccess = async (event: CustomEvent) => {
    console.log('Upload success event:', event);
    if (!event.detail) {
      console.error('Event detail is null');
      return;
    }
    const uploadId = event.detail.id;
    if (!uploadId) {
      console.error('Upload ID is missing from the event detail');
      return;
    }
    try {
      console.log('Sending request to /api/videos/create...');
      const response = await fetch('/api/videos/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId, promptId, userId }),
      });

      const responseData = await response.json();
      console.log('Response from /api/videos/create:', responseData);

      if (!response.ok) throw new Error(`Failed to create video entry: ${responseData.error}`);

      const { promptResponseId } = responseData;
      router.push(`/prompt-responses/${promptResponseId}`);
    } catch (error) {
      console.error('Upload process failed:', error);
    }
  };

  return (
    <MuxUploader
      endpoint={async () => {
        const { uploadUrl } = await createUploadUrl();
        return uploadUrl;
      }}
      onSuccess={handleUploadSuccess}
      onError={(error) => console.error('Upload error:', error)}
    />
  );
}