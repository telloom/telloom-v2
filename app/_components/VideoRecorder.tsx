'use client';

// components/VideoRecorder.tsx
import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { InsertVideo } from '../_types/video'; // Add this import

interface VideoRecorderProps {
  promptId: string;
  onUploadComplete: (data: any) => Promise<any>;
  createVideo: (data: any) => Promise<any>;
}

const VideoRecorder: React.FC<VideoRecorderProps> = ({ promptId, onUploadComplete, createVideo }) => {
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
    }
  };

  return (
    <div className="mt-2">
      <video ref={videoRef} autoPlay muted className="w-full h-48 bg-black mb-2" />
      {!recording && !videoBlob && (
        <button
          onClick={startRecording}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          Start Recording
        </button>
      )}
      {recording && (
        <button
          onClick={stopRecording}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          Stop Recording
        </button>
      )}
      {videoBlob && (
        <button
          onClick={uploadRecording}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Upload Recording
        </button>
      )}
    </div>
  );
};

export default VideoRecorder;