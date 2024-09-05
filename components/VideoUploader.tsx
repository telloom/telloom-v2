'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MuxUploader from "@mux/mux-uploader-react";
import { createUploadUrl, getUploadStatus, getAsset } from '../utils/muxClient';
import { createVideoAction } from '@/actions/videos-actions';
import { createPromptResponse } from '@/actions/prompt-responses-actions';

interface VideoUploaderProps {
  promptId: string;
  userId: string;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ promptId, userId }) => {
  const [error, setError] = useState<string | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const router = useRouter();

  const handleUploadSuccess = useCallback(async (event: CustomEvent) => {
    console.log('Upload success event:', event);
    const uploadId = event?.detail?.id;
    console.log('Upload ID:', uploadId);

    if (!uploadId) {
      console.error('Upload ID is missing from the event detail');
      setError('Failed to process upload. Upload ID is missing.');
      return;
    }

    try {
      // Create initial video record
      const initialVideoResult = await createVideoAction({ 
        userId,
        muxUploadId: uploadId,
        promptId, // Add this line
        status: 'processing',
      });

      if (initialVideoResult.status !== 'success') {
        throw new Error('Failed to create initial video entry');
      }

      // Poll for upload status
      let uploadStatus;
      do {
        await new Promise(resolve => setTimeout(resolve, 1000));
        uploadStatus = await getUploadStatus(uploadId);
        console.log('Upload status:', uploadStatus);
      } while (uploadStatus.status === 'waiting' || uploadStatus.status === 'preparing');

      if (uploadStatus.status !== 'ready') {
        throw new Error(`Upload failed with status: ${uploadStatus.status}`);
      }

      const assetId = uploadStatus.assetId;
      if (!assetId) {
        throw new Error('Asset ID is missing from upload status');
      }

      // Get asset details
      const asset = await getAsset(assetId);

      const updatedVideoResult = await createVideoAction({ 
        userId,
        muxUploadId: uploadId,
        muxAssetId: assetId,
        muxPlaybackId: asset.playbackId || '',
        promptId,
        status: 'ready',
      });

      if (updatedVideoResult.status !== 'success') {
        throw new Error('Failed to update video entry');
      }

      const promptResponseResult = await createPromptResponse({
        userId,
        promptId,
        videoId: BigInt(updatedVideoResult.data.id), // Convert to BigInt here
      });

      if (promptResponseResult.status !== 'success') {
        throw new Error('Failed to create prompt response');
      }

      router.push(`/prompt-responses/${promptResponseResult.data.id}`);
    } catch (err: unknown) {
      console.error('Upload process failed:', err);
      setError(`Failed to process upload: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [promptId, userId, router]);

  useEffect(() => {
    const fetchUploadUrl = async () => {
      try {
        const { uploadUrl } = await createUploadUrl();
        setUploadUrl(uploadUrl);
      } catch (error) {
        console.error('Failed to fetch upload URL:', error);
        setError('Failed to initialize uploader. Please try again.');
      }
    };
    fetchUploadUrl();
  }, []);

  return (
    <div className="mt-2">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      {uploadUrl ? (
        <MuxUploader
          endpoint={uploadUrl}
          onSuccess={handleUploadSuccess}
          onError={(error: unknown) => {
            console.error('Upload error:', error);
            setError(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }}
        />
      ) : (
        <p>Initializing uploader...</p>
      )}
    </div>
  );
};

export default VideoUploader;