'use client';

import React, { useState } from 'react';
import MuxUploader from "@mux/mux-uploader-react";
import { createAsset } from '@/utils/muxClient';
import { createPromptResponse } from '@/actions/prompt-responses-actions';

interface VideoUploaderProps {
  promptId: string;
  userId: string;
}

export default function VideoUploader({ promptId, userId }: VideoUploaderProps) {
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const getUploadUrl = async () => {
    const response = await fetch('/api/videos/upload-url');
    const { uploadUrl } = await response.json();
    setUploadUrl(uploadUrl);
    return uploadUrl;
  };

  const handleUploadSuccess = async () => {
    setIsUploading(true);
    setError(null);
    try {
      if (!uploadUrl) {
        throw new Error('No upload URL available');
      }

      const uploadId = uploadUrl.split('/').pop();
      if (!uploadId) {
        throw new Error('Invalid upload URL');
      }

      console.log('Creating asset for upload ID:', uploadId);
      const asset = await createAsset(uploadId);
      console.log('Asset created:', asset);
      
      if (!asset.id || !asset.playback_ids || asset.playback_ids.length === 0) {
        throw new Error('Invalid asset data returned from Mux');
      }

      console.log('Creating prompt response...');
      const result = await createPromptResponse({
        userId,
        promptId,
        videoId: asset.id,
        muxPlaybackId: asset.playback_ids[0].id,
      });
      console.log('Prompt response created successfully:', result);

      // Optionally, redirect to the prompt response page or show a success message
    } catch (error) {
      console.error('Error creating prompt response:', error);
      setError(`Failed to create prompt response: ${error instanceof Error ? error.message : String(error)}`);
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
      {isUploading && <p>Uploading video...</p>}
      {error && <p className="text-red-500">{error}</p>}
    </>
  );
}