'use client';

import React, { useState } from 'react';
import MuxUploader from "@mux/mux-uploader-react";
import { createAsset } from '@/utils/muxClient';
import { createVideoAction } from '@/actions/videos-actions';
import { createPromptResponse } from '@/actions/prompt-responses-actions';
import { useRouter } from 'next/navigation';

interface VideoUploaderProps {
  promptId: string;
  userId: string;
}

export default function VideoUploader({ promptId, userId }: VideoUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const getUploadUrl = async () => {
    const response = await fetch('/api/videos/upload-url');
    const { uploadUrl } = await response.json();
    return uploadUrl;
  };

  const handleUploadSuccess = async (event: CustomEvent) => {
    setIsUploading(true);
    setError(null);
    try {
      const { id: uploadId } = event.detail;

      console.log('Creating asset for upload ID:', uploadId);
      const asset = await createAsset(uploadId);
      console.log('Asset created:', asset);
      
      if (!asset.id || !asset.playback_ids || asset.playback_ids.length === 0) {
        throw new Error('Invalid asset data returned from Mux');
      }

      console.log('Creating video entry...');
      const videoResult = await createVideoAction({
        userId,
        muxAssetId: asset.id,
        muxPlaybackId: asset.playback_ids[0].id,
        status: 'ready',
      });

      if (videoResult.status !== 'success' || !videoResult.data) {
        throw new Error('Failed to create video entry');
      }

      console.log('Video entry created:', videoResult.data);

      console.log('Creating prompt response...');
      const promptResponseResult = await createPromptResponse({
        userId,
        promptId,
        videoId: videoResult.data.id.toString(),
      });

      if (promptResponseResult.status !== 'success' || !promptResponseResult.data) {
        throw new Error('Failed to create prompt response');
      }

      console.log('Prompt response created successfully:', promptResponseResult.data);

      // Redirect to the prompt response page
      router.push(`/prompt-responses/${promptResponseResult.data.id}`);
    } catch (error) {
      console.error('Error in upload process:', error);
      setError(`Upload failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <MuxUploader
        endpoint={getUploadUrl}
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