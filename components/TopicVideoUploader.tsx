/**
 * File: components/TopicVideoUploader.tsx
 * Description: A video upload interface component specifically for topic videos that handles direct-to-Mux uploads
 * with progress tracking, status polling, and error handling.
 */

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import { MuxPlayer } from './MuxPlayer';
import styles from './UploadInterface.module.css';

interface TopicVideoUploaderProps {
  promptCategoryId: string;
  onUploadSuccess?: (playbackId: string) => Promise<void>;
  categoryName?: string;
}

export function TopicVideoUploader({
  promptCategoryId,
  onUploadSuccess,
  categoryName
}: TopicVideoUploaderProps) {
  const supabase = createClient();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [existingVideo, setExistingVideo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [processingState, setProcessingState] = useState<
    'idle' | 'uploading' | 'processing' | 'ready' | 'error'
  >('idle');
  const [muxPlaybackId, setMuxPlaybackId] = useState<string | null>(null);
  const uploadLock = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const hasStartedUpload = useRef(false);

  const handleVideoReady = useCallback((playbackId: string) => {
    setProcessingState('ready');
    setMuxPlaybackId(playbackId);
    setExistingVideo(null);
    toast.success('Video uploaded successfully');
    if (onUploadSuccess) {
      onUploadSuccess(playbackId);
    }
  }, [onUploadSuccess]);

  const handleVideoError = useCallback(() => {
    setProcessingState('error');
    toast.error('Video processing failed');
  }, []);

  const pollVideoStatus = useCallback(
    async (videoId: string) => {
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes with 5-second intervals

      const checkStatus = async () => {
        try {
          const { data: video, error } = await supabase
            .from('TopicVideo')
            .select('muxPlaybackId, status')
            .eq('id', videoId)
            .single();

          if (error) {
            console.error('Error checking video status:', error);
            if (attempts < maxAttempts) {
              attempts++;
              await new Promise(resolve => setTimeout(resolve, 5000));
              return checkStatus();
            } else {
              handleVideoError();
              return;
            }
          }

          if (video?.status === 'READY' && video?.muxPlaybackId) {
            setMuxPlaybackId(video.muxPlaybackId);
            setProcessingState('ready');
            if (onUploadSuccess) {
              await onUploadSuccess(video.muxPlaybackId);
            }
            return;
          }

          if (video?.status === 'ERRORED') {
            handleVideoError();
            return;
          }

          if (attempts < maxAttempts) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 5000));
            return checkStatus();
          } else {
            handleVideoError();
          }
        } catch (error) {
          console.error('Error polling video status:', error);
          if (attempts < maxAttempts) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 5000));
            return checkStatus();
          } else {
            handleVideoError();
          }
        }
      };

      await checkStatus();
    },
    [supabase, handleVideoError, onUploadSuccess]
  );

  const handleUpload = useCallback(
    async (file: File) => {
      hasStartedUpload.current = true;
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);
      setExistingVideo(null);
      setProcessingState('idle');

      try {
        // Get current user
        const supabase = createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          throw new Error('Please sign in to upload videos');
        }

        // Get JWT token
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.access_token) {
          throw new Error('Failed to get authorization token');
        }

        // Get upload URL from your API
        const response = await fetch('/api/mux/topic-upload-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ promptCategoryId }),
        });

        if (!response.ok) {
          const error = await response.json();
          if (response.status === 401) {
            throw new Error('Please sign in to upload videos');
          } else if (response.status === 403) {
            throw new Error('You do not have permission to upload videos');
          } else if (response.status === 409) {
            throw new Error('A video for this topic already exists');
          } else {
            throw new Error(error.message || 'Failed to get upload URL');
          }
        }

        const { uploadUrl, uploadId, videoId } = await response.json();

        if (!uploadUrl || !uploadId) {
          throw new Error('Failed to get upload URL');
        }

        // Create XHR for upload
        const xhr = new XMLHttpRequest();
        let aborted = false;

        // Add event listeners
        xhr.upload.addEventListener('progress', (e) => {
          if (!aborted) {
            const progress = Math.round((e.loaded * 100) / e.total);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (aborted) return;

          if (xhr.status >= 200 && xhr.status < 300) {
            setIsUploading(false);
            setUploadProgress(100);
            setProcessingState('processing');

            // Start polling for video status
            pollVideoStatus(videoId);
          } else {
            handleVideoError();
            setProcessingState('idle');
          }
        });

        xhr.addEventListener('error', () => {
          if (!aborted) {
            handleVideoError();
            setProcessingState('idle');
          }
        });

        xhr.addEventListener('abort', () => {
          aborted = true;
          handleVideoError();
          setProcessingState('idle');
        });

        // Clean up function for all cases
        const cleanup = () => {
          if (!aborted) {
            setIsUploading(false);
            uploadLock.current = false;
          }
        };

        // Add cleanup to all event listeners
        xhr.addEventListener('load', cleanup);
        xhr.addEventListener('error', cleanup);
        xhr.addEventListener('abort', cleanup);

        // Start upload
        xhr.open('PUT', uploadUrl);
        xhr.send(file);
      } catch (error) {
        console.error('Upload error:', error);
        handleVideoError();
        setIsUploading(false);
        setProcessingState('idle');
        uploadLock.current = false;
        
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('Failed to upload video');
        }
      }
    },
    [promptCategoryId, pollVideoStatus, handleVideoError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      if (processingState !== 'idle') return;

      const file = e.dataTransfer.files[0];
      if (!file) return;

      handleUpload(file);
    },
    [handleUpload, processingState]
  );

  const handleClick = useCallback(() => {
    if (processingState !== 'idle') return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      handleUpload(file);
    };
    input.click();
  }, [handleUpload, processingState]);

  useEffect(() => {
    const checkExistingVideo = async () => {
      if (hasStartedUpload.current) return;
      if (!promptCategoryId) return;

      try {
        const { data: video, error } = await supabase
          .from('TopicVideo')
          .select('*')
          .eq('promptCategoryId', promptCategoryId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking existing video:', error);
          return;
        }

        setExistingVideo(video);
        if (video?.muxPlaybackId) {
          setMuxPlaybackId(video.muxPlaybackId);
          setProcessingState('ready');
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingVideo();
  }, [promptCategoryId, supabase]);

  if (isLoading) {
    return (
      <Card className="w-full mx-auto !border-0 !shadow-none p-4">
        <div>Loading...</div>
      </Card>
    );
  }

  return (
    <Card className="w-full mx-auto !border-0 !shadow-none h-full flex flex-col">
      <div className="p-4 flex flex-col min-h-0 flex-1">
        {processingState === 'idle' && !isUploading && !muxPlaybackId && (
          <div className="mb-4">
            <h2 className="text-lg font-normal tracking-tight">
              Upload Your Topic Video {categoryName ? `for ${categoryName}` : ''}
            </h2>
          </div>
        )}

        <div className="flex flex-col flex-1 min-h-0">
          {(processingState === 'ready' && muxPlaybackId) || (muxPlaybackId) ? (
            <div className="flex flex-col items-center justify-center flex-1 min-h-0">
              <div className={`relative w-full ${styles.videoContainer}`}>
                <div className="w-full">
                  <div className="aspect-video bg-black rounded-md overflow-hidden relative">
                    <div className="absolute inset-0">
                      <MuxPlayer playbackId={muxPlaybackId} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : processingState === 'processing' ? (
            <div className="text-center py-12">
              <svg
                className="animate-spin h-12 w-12 mx-auto mb-4 text-[#16A34A]"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="text-lg font-medium">Processing video...</p>
              <p className="text-sm text-muted-foreground">This may take a few minutes</p>
            </div>
          ) : processingState === 'error' ? (
            <div className="text-center py-12 text-red-500">
              <p className="text-lg font-medium">Error processing video</p>
              <p className="text-sm">Please try again</p>
            </div>
          ) : !muxPlaybackId && (
            <div className="flex-1 flex flex-col">
              {isUploading ? (
                <div className="py-24 space-y-8">
                  <div className="text-xl text-muted-foreground text-center">
                    Uploading... {uploadProgress}%
                  </div>
                  <div className="w-full max-w-3xl mx-auto bg-secondary rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div
                  className={`flex-1 border-2 border-dashed rounded-lg py-32 px-8 text-center hover:bg-muted/50 transition-colors cursor-pointer ${
                    processingState !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={handleClick}
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleClick();
                    }
                  }}
                >
                  <p className="text-xl text-muted-foreground">
                    Drag and drop a video file here, or click to select one
                  </p>
                </div>
              )}
            </div>
          )}

          {existingVideo && !muxPlaybackId && (
            <div className="text-sm text-yellow-600 bg-yellow-50/50 p-3 rounded-md text-center mt-4">
              A video for this topic already exists. Delete the existing video if you want to upload a new one.
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50/50 p-3 rounded-md text-center mt-4">
              {error}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
} 