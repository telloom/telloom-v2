'use client';

import React from 'react';
import MuxUploader from '@mux/mux-uploader-react';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';
import { createUploadUrl } from '@/utils/muxClient';

interface MuxUploaderProps {
  promptId: string;
}

export default function MuxUploaderComponent({ promptId }: MuxUploaderProps) {
  const user = useUser();
  const supabase = useSupabaseClient();
  const router = useRouter();

  if (!user) {
    return <div>Please sign in to upload a video.</div>;
  }

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
      console.log('Sending request to /api/prompt-responses/create...');
      const response = await fetch('/api/prompt-responses/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId, promptId }),
      });

      const responseData = await response.json();
      console.log('Response from /api/prompt-responses/create:', responseData);

      if (!response.ok)
        throw new Error(`Failed to create prompt response: ${responseData.error}`);

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