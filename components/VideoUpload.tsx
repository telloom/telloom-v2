'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface VideoUploadProps {
  promptId: string;
  onUploadComplete: (data: any) => Promise<any>;
  createVideo: (data: any) => Promise<any>;
}

const VideoUpload: React.FC<VideoUploadProps> = ({ promptId, onUploadComplete, createVideo }) => {
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      // Get upload URL from your API
      const response = await fetch('/api/videos/upload-url');
      const { uploadUrl } = await response.json();

      // Upload file to Mux
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      // Create video in database
      const { data: videoData } = await createVideo({ 
        uploadId: uploadUrl.split('/').pop(),
        status: 'processing'
      } as InsertVideo);

      // Create prompt response
      const { data: promptResponseData } = await onUploadComplete({ 
        promptId: promptId,
        videoId: videoData.id
      });

      router.push(`/prompt-responses/${promptResponseData.id}`);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-2">
      <label htmlFor="video-upload" className="cursor-pointer bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        {uploading ? 'Uploading...' : 'Upload Video'}
      </label>
      <input
        id="video-upload"
        type="file"
        accept="video/*"
        onChange={handleUpload}
        disabled={uploading}
        className="hidden"
      />
    </div>
  );
};

export default VideoUpload;