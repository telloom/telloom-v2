'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface VideoUploadProps {
  promptId: string;
}

const VideoUpload: React.FC<VideoUploadProps> = ({ promptId }) => {
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

      // Notify your backend about the upload and create a prompt response
      const createResponse = await fetch('/api/prompt-responses/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          uploadId: uploadUrl.split('/').pop(),
          promptId: promptId
        }),
      });

      const { promptResponseId } = await createResponse.json();

      router.push(`/prompt-responses/${promptResponseId}`);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-2">
      <label htmlFor="video-upload" className="cursor-pointer bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        Upload Video
      </label>
      <input
        id="video-upload"
        type="file"
        accept="video/*"
        onChange={handleUpload}
        disabled={uploading}
        className="hidden"
      />
      {uploading && <p className="mt-2 text-sm text-gray-500">Uploading...</p>}
    </div>
  );
};

export default VideoUpload;