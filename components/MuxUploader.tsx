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
    const { id: assetId } = event.detail;
    try {
      const response = await fetch('/api/videos/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, promptId, userId }),
      });

      if (!response.ok) throw new Error('Failed to create video entry');

      const { promptResponseId } = await response.json();
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