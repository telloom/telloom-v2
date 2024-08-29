// components/VideoUpload.tsx
import React, { useState } from 'react';
import { useRouter } from 'next/router';

const VideoUpload: React.FC = () => {
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

      // Notify your backend about the upload
      await fetch('/api/videos/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uploadId: uploadUrl.split('/').pop() }),
      });

      router.push('/videos'); // Redirect to video list page
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label htmlFor="video-upload">Upload video:</label>
      <input id="video-upload" type="file" accept="video/*" onChange={handleUpload} disabled={uploading} />
      {uploading && <p>Uploading...</p>}
    </div>
  );
};

export default VideoUpload;