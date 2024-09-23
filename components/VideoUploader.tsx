'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import MuxUploader from "@mux/mux-uploader-react";
import { createUploadUrl } from '../utils/muxClient';
import { createPreliminaryVideoRecord, updateVideoWithMuxInfo, createSimpleVideoRecord } from '@/actions/videos-actions';

interface VideoUploaderProps {
  promptId: string;
  userId: string;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ promptId, userId }) => {
  const [error, setError] = useState<string | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isUploaderVisible, setIsUploaderVisible] = useState(false);
  const router = useRouter();
  const muxUploaderRef = useRef<any>(null);

  // Log props when component mounts
  useEffect(() => {
    console.log('VideoUploader mounted with props:', { promptId, userId });
  }, [promptId, userId]);

  const createInitialRecord = useCallback(async () => {
    try {
      console.log('Creating preliminary video record...', { promptId, userId });
      const result = await createPreliminaryVideoRecord({
        promptId,
        userId,
        status: 'waiting',
      });
      console.log('Preliminary video record created:', result);

      if (result.status === 'success' && result.data) {
        setVideoId(result.data.id.toString());
        return result.data.id;
      } else {
        throw new Error('Failed to create preliminary video record');
      }
    } catch (error) {
      console.error('Failed to create preliminary video record:', error);
      setError('Failed to initialize uploader. Please try again.');
      return null;
    }
  }, [promptId, userId]);

  const handleUploadClick = useCallback(async () => {
    try {
      console.log('Upload button clicked. Creating preliminary video record...', { promptId, userId });
      const result = await createPreliminaryVideoRecord({
        promptId,
        userId,
        status: 'waiting',
      });
      console.log('Preliminary video record creation result:', result);

      if (result.status === 'success' && result.data) {
        console.log('Video ID set:', result.data.id.toString());
        setVideoId(result.data.id.toString());
        setIsUploaderVisible(true);
      } else {
        throw new Error(`Failed to create preliminary video record: ${result.message}`);
      }
    } catch (error) {
      console.error('Error in handleUploadClick:', error);
      setError(`Failed to initialize uploader: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [promptId, userId]);

  const handleUploadSuccess = useCallback(async (event: CustomEvent) => {
    console.log('Upload success event:', event);
    const uploadId = event?.detail?.id;
    console.log('Upload ID:', uploadId);

    if (!uploadId || !videoId) {
      console.error('Upload ID or Video ID is missing');
      setError('Failed to process upload. Missing required information.');
      return;
    }

    try {
      console.log('Updating video with Mux upload ID:', uploadId);
      const result = await updateVideoWithMuxInfo(uploadId, { 
        muxUploadId: uploadId,
        status: 'waiting',
        id: Number(videoId),
        userId,
        promptId,
      });
      console.log('Video update result:', result);

      if (result.status === 'success') {
        router.push(`/videos/${result.data.id}`);
      } else {
        throw new Error('Failed to update video entry');
      }
    } catch (err: unknown) {
      console.error('Upload process failed:', err);
      setError(`Failed to process upload: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [router, videoId, userId, promptId]);

  const [recordCreationMessage, setRecordCreationMessage] = useState<string | null>(null);

  const handleCreateSimpleRecord = async () => {
    try {
      console.log('Creating simple video record...', { promptId, userId });
      const result = await createSimpleVideoRecord({
        promptId,
        userId,
        status: 'waiting',
      });
      console.log('Simple video record creation result:', result);

      if (result.status === 'success') {
        setRecordCreationMessage(`Record created successfully. ID: ${result.data.id}`);
      } else {
        setRecordCreationMessage(`Failed to create record: ${result.message}`);
      }
    } catch (error) {
      console.error('Error creating simple record:', error);
      setRecordCreationMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  useEffect(() => {
    const initializeUpload = async () => {
      try {
        const { uploadUrl } = await createUploadUrl();
        setUploadUrl(uploadUrl);
      } catch (error) {
        console.error('Failed to initialize upload:', error);
        setError('Failed to initialize uploader. Please try again.');
      }
    };
    initializeUpload();
  }, []);

  useEffect(() => {
    if (muxUploaderRef.current) {
      muxUploaderRef.current.addEventListener('file-ready', async () => {
        console.log('File ready event triggered. Creating initial record with:', { promptId, userId });
        await createInitialRecord();
      });
    }
  }, [createInitialRecord, promptId, userId]);

  return (
    <div className="mt-2">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <button
        onClick={handleCreateSimpleRecord}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2"
      >
        Create Simple Video Record
      </button>
      {recordCreationMessage && (
        <div className="mt-2 p-2 bg-blue-100 border rounded">
          {recordCreationMessage}
        </div>
      )}
      {!isUploaderVisible ? (
        <button
          onClick={handleUploadClick}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Upload a video
        </button>
      ) : uploadUrl ? (
        <MuxUploader
          ref={muxUploaderRef}
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