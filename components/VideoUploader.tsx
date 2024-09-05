'use client';

import React, { useState } from 'react';
import MuxUploader from "@mux/mux-uploader-react";
import { useRouter } from 'next/navigation';
import { createVideoAction } from '@/actions/videos-actions';
import { createPromptResponse } from '@/actions/prompt-responses-actions';

interface VideoUploaderProps {
  promptId: string;
  userId: string;
}

export default function VideoUploader({ promptId, userId }: VideoUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const getUploadUrl = async () => {
    try {
      console.log('Fetching Mux upload URL...');
      const response = await fetch('/api/videos/upload-url');
      const { uploadUrl } = await response.json();
      console.log('Mux upload URL received:', uploadUrl);
      return uploadUrl;
    } catch (err) {
      console.error('Error fetching Mux upload URL:', err);
      throw new Error('Failed to get upload URL');
    }
  };

  const handleUploadSuccess = async (event: CustomEvent) => {
    console.log('Upload success event triggered:', event);

    try {
      const assetId = event?.detail?.asset_id;
      console.log('Asset ID from Mux:', assetId);

      if (!assetId) {
        throw new Error('Asset ID is missing');
      }

      const videoResult = await createVideoAction({
        userId,
        muxAssetId: assetId,
        muxPlaybackId: event.detail.playback_ids[0].id, // Assuming first playback ID is used
        status: 'ready',
      });

      if (videoResult.status !== 'success') {
        throw new Error('Failed to create video entry');
      }

      const promptResponseResult = await createPromptResponse({
        userId,
        promptId,
        videoId: videoResult.data.id.toString(),
      });

      if (promptResponseResult.status !== 'success') {
        throw new Error('Failed to create prompt response');
      }

      router.push(`/prompt-responses/${promptResponseResult.data.id}`);

    } catch (err) {
      console.error('Upload process failed:', err);
      setError(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <MuxUploader
        endpoint={getUploadUrl} // Fetch upload URL dynamically
        onSuccess={handleUploadSuccess}
        onError={(error) => {
          console.error('Upload error:', error);
          setError('Failed to upload video. Please try again.');
        }}
      />
      {isUploading && <p>Processing video...</p>}
      {error && <p className="text-red-500">{error}</p>}
    </>
  );
}