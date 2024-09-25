'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MuxUploader from "@mux/mux-uploader-react";
import { createUploadUrl } from '@/actions/videos-actions';

interface VideoUploaderProps {
  promptId: string;
  userId: string;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ promptId, userId }) => {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleUploadSuccess = useCallback(async (event: CustomEvent) => {
    console.log('Upload success:', event.detail);
    // The video record is already created, so we can just redirect
    router.push(`/prompts/${promptId}`); // Adjust this route as needed
  }, [promptId, router]);

  return (
    <>
      {error && <div className="text-red-500">{error}</div>}
      <MuxUploader
        endpoint={async () => {
          try {
            const { uploadUrl } = await createUploadUrl(promptId, userId);
            return uploadUrl;
          } catch (error) {
            console.error('Failed to initialize upload:', error);
            setError('Failed to initialize uploader. Please try again.');
            return '';
          }
        }}
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