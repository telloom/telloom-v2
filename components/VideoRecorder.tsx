// components/VideoRecorder.tsx
import React, { useRef, useState } from 'react';
import { useRouter } from 'next/router';

const VideoRecorder: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const router = useRouter();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setVideoBlob(blob);
      };
      mediaRecorder.start();
      setRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const uploadRecording = async () => {
    if (!videoBlob) return;

    try {
      // Get upload URL from your API
      const response = await fetch('/api/videos/upload-url');
      const { uploadUrl } = await response.json();

      // Upload file to Mux
      await fetch(uploadUrl, {
        method: 'PUT',
        body: videoBlob,
        headers: {
          'Content-Type': 'video/webm',
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
    }
  };

  return (
    <div>
      <video ref={videoRef} autoPlay muted />
      {!recording && !videoBlob && <button onClick={startRecording}>Start Recording</button>}
      {recording && <button onClick={stopRecording}>Stop Recording</button>}
      {videoBlob && <button onClick={uploadRecording}>Upload Recording</button>}
    </div>
  );
};

export default VideoRecorder;