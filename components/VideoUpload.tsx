'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MuxUploader from "@mux/mux-uploader-react";
import { createUploadUrl, getUploadStatus } from '../utils/muxClient';

interface VideoUploadProps {
  promptId: string;
  onUploadComplete: (data: any) => Promise<any>;
  createVideo: (data: any) => Promise<any>;
}

const VideoUpload: React.FC<VideoUploadProps> = ({ promptId, onUploadComplete, createVideo }) => {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleUploadSuccess = useCallback(async (event: CustomEvent) => {
    const { id } = event.detail as { id: string };
    try {
      // Poll for upload status
      let uploadStatus;
      do {
        await new Promise(resolve => setTimeout(resolve, 1000));
        uploadStatus = await getUploadStatus(id);
      } while (uploadStatus.status === 'waiting');

      if (uploadStatus.status !== 'asset_created') {
        throw new Error(`Upload failed with status: ${uploadStatus.status}`);
      }

      const { data: videoData } = await createVideo({ 
        uploadId: id,
        assetId: uploadStatus.asset_id,
        status: 'ready'
      });

      const promptResponseData = await onUploadComplete({ 
        promptId: promptId,
        videoId: videoData.id
      });

      router.push(`/prompt-responses/${promptResponseData.id}`);
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Failed to process upload. Please try again.');
    }
  }, [createVideo, onUploadComplete, promptId, router]);

  return (
    <div className="mt-2">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <MuxUploader
        endpoint={createUploadUrl}
        onSuccess={handleUploadSuccess}
        onError={(event: React.SyntheticEvent<HTMLElement>) => {
          console.error('Upload error:', (event as any).detail);
          setError(`Upload failed: ${(event as any).detail?.message || 'Unknown error'}`);
        }}
      />
    </div>
  );
};

export default VideoUpload;