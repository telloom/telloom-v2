// components/UploadInterface.tsx
// This component handles the video upload interface

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import { MuxPlayer } from './MuxPlayer';

interface UploadInterfaceProps {
  onClose?: () => void;
  onComplete?: (videoBlob: Blob) => void;
  onSave?: (videoBlob: Blob) => void;
  promptId?: string;
  promptText?: string;
}

export function UploadInterface({
  onClose,
  onComplete,
  onSave,
  promptId,
  promptText
}: UploadInterfaceProps) {
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

  const handleVideoReady = useCallback((playbackId: string) => {
    setProcessingState('ready');
    setMuxPlaybackId(playbackId);
    toast.success('Video uploaded successfully');
  }, []);

  const handleVideoError = useCallback(() => {
    setProcessingState('error');
    toast.error('Video processing failed');
  }, []);

  const pollVideoStatus = useCallback(
    async (videoId: string) => {
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes with 5-second intervals

      const checkStatus = async () => {
        const { data: video, error } = await supabase
          .from('Video')
          .select('status, muxPlaybackId')
          .eq('id', videoId)
          .single();

        if (error) {
          console.error('Error checking video status:', error);
          handleVideoError();
          return;
        }

        if (video.status === 'READY' && video.muxPlaybackId) {
          // Video is ready
          handleVideoReady(video.muxPlaybackId);
          return;
        }

        if (video.status === 'ERRORED') {
          toast.error('Video processing failed');
          handleVideoError();
          return;
        }

        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkStatus, 5000); // Check every 5 seconds
        } else {
          handleVideoError();
        }
      };

      await checkStatus();
    },
    [supabase, handleVideoReady, handleVideoError]
  );

  const handleUpload = useCallback(
    async (file: File) => {
      // Prevent multiple simultaneous uploads
      if (uploadLock.current || processingState !== 'idle') {
        console.log('Upload blocked:', {
          uploadLock: uploadLock.current,
          processingState
        });
        toast.error('Upload already in progress or disabled');
        return;
      }

      try {
        // Set upload lock
        uploadLock.current = true;
        setIsUploading(true);
        setProcessingState('uploading');

        // Get session for auth
        const {
          data: { session },
          error: sessionError
        } = await supabase.auth.getSession();
        if (sessionError || !session) {
          throw new Error('Not authenticated');
        }

        // Check for existing video first
        const { data: existingVideo } = await supabase
          .from('Video')
          .select('*')
          .eq('promptId', promptId)
          .not('status', 'eq', 'ERRORED')
          .maybeSingle();

        if (existingVideo) {
          setExistingVideo(true);
          toast.error('A video for this prompt already exists');
          // Clean up and return early
          setIsUploading(false);
          uploadLock.current = false;
          return;
        }

        // Get upload URL from your API
        const res = await fetch('/api/mux/upload-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            promptId
          })
        });

        if (res.status === 409) {
          await res.json(); // Consume the response
          setExistingVideo(true);
          toast.error('A video for this prompt already exists');
          // Clean up and return early
          setIsUploading(false);
          uploadLock.current = false;
          return;
        }

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to get upload URL');
        }

        const { uploadUrl, uploadId, videoId } = await res.json();

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

            if (onComplete) {
              onComplete(new Blob());
            }
            if (onSave) {
              onSave(new Blob());
            }

            // Start polling for video status
            pollVideoStatus(videoId);
          } else {
            handleVideoError();
          }
        });

        xhr.addEventListener('error', () => {
          if (!aborted) {
            handleVideoError();
          }
        });

        xhr.addEventListener('abort', () => {
          aborted = true;
          handleVideoError();
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
        handleVideoError();
        setIsUploading(false);
        uploadLock.current = false;
      }
    },
    [
      isUploading,
      processingState,
      promptId,
      onComplete,
      onSave,
      pollVideoStatus,
      handleVideoError,
      supabase
    ]
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
      if (!promptId) return;

      try {
        const { data: videos, error } = await supabase
          .from('Video')
          .select('*')
          .eq('promptId', promptId)
          .not('status', 'eq', 'ERRORED')
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking existing video:', error);
          return;
        }

        setExistingVideo(videos);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingVideo();
  }, [promptId, supabase]);

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto !border-0 !shadow-none p-4">
        <div>Loading...</div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto !border-0 !shadow-none h-full flex flex-col">
      <div className="p-4 flex flex-col min-h-0 flex-1">
        {processingState === 'idle' && !isUploading && (
          <div className="mb-4">
            <h2 className="text-lg font-normal tracking-tight">
              Upload Your Video Response
            </h2>
          </div>
        )}

        <div className="flex flex-col flex-1 min-h-0">
          {processingState === 'ready' && muxPlaybackId ? (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 min-h-0 relative">
                <MuxPlayer playbackId={muxPlaybackId} />
              </div>
              <div className="text-sm text-[#16A34A] bg-[#DCFCE7] p-3 rounded-md text-center mt-4">
                Video uploaded and processed successfully!
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
          ) : (
            <div className="flex-1 flex flex-col">
              {isUploading ? (
                <div className="py-8 space-y-4">
                  <div className="text-sm text-muted-foreground text-center">
                    Uploading... {uploadProgress}%
                  </div>
                  <div className="w-full max-w-md mx-auto bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div
                  className={`flex-1 border border-dashed rounded-lg py-32 px-4 text-center hover:bg-muted/50 transition-colors cursor-pointer ${
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
                  <p className="text-muted-foreground">
                    Drag and drop a video file here, or click to select one
                  </p>
                </div>
              )}
            </div>
          )}

          {existingVideo && (
            <div className="text-sm text-yellow-600 bg-yellow-50/50 p-3 rounded-md text-center mt-4">
              A video for this prompt already exists. Delete the existing video if you want to upload a new one.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}