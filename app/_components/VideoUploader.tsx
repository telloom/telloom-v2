'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MuxUploader from "@mux/mux-uploader-react";
import { PrismaClient } from '@prisma/client';
import { createUploadUrl } from '@/actions/video-actions';

interface VideoUploaderProps {
  promptId: string;
  userId: string;
}

const prisma = new PrismaClient();

const VideoUploader: React.FC<VideoUploaderProps> = ({ promptId, userId }) => {
  const [error, setError] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const router = useRouter();

  const handleUploadSuccess = useCallback(async (event: CustomEvent) => {
    console.log('Upload success:', event.detail);
    try {
      // Create a new Video record in the database
      await prisma.video.create({
        data: {
          userId,
          promptId,
          status: 'WAITING',
          // Add other fields as necessary
        },
      });
      router.push(`/prompts/${promptId}`);
    } catch (error) {
      console.error('Failed to create video record:', error);
      setError('Failed to process upload. Please try again.');
    }
  }, [promptId, userId, router]);

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