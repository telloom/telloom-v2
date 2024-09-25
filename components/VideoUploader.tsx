'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MuxUploader from "@mux/mux-uploader-react";
import { createUploadUrl, finalizeVideoUpload } from '@/actions/videos-actions';

interface VideoUploaderProps {
  promptId: string;
  userId: string;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ promptId, userId }) => {
  const [error, setError] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const router = useRouter();

  const initializeUpload = useCallback(async () => {
    try {
      const result = await createUploadUrl(promptId, userId);
      console.log('Upload initialized:', result); // Add logging
      if (result.uploadId) {
        setUploadId(result.uploadId.toString());
      }
      return result.uploadUrl;
    } catch (error) {
      console.error('Failed to initialize upload:', error);
      setError('Failed to initialize upload');
      return null;
    }
  }, [promptId, userId]);

  const handleUploadSuccess = useCallback(async () => {
    console.log('Upload success called, uploadId:', uploadId);
    if (!uploadId) {
      setError('Upload ID not found');
      return;
    }

    try {
      await finalizeVideoUpload(uploadId);
      console.log('Upload finalized successfully');
      router.push(`/prompts/${promptId}`);
    } catch (error) {
      console.error('Failed to finalize upload:', error);
      setError('Failed to finalize upload');
    }
  }, [uploadId, promptId, router]);

  return (
    <>
      {error && <div className="text-red-500">{error}</div>}
      <MuxUploader
        endpoint={initializeUpload}
        onSuccess={handleUploadSuccess}
        onError={(error) => {
          console.error('Upload error:', error);
          setError(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }}
      />
    </>
  );
};

export default VideoUploader;