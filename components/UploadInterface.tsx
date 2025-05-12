/**
 * File: components/UploadInterface.tsx
 * Description: A video upload interface component that handles direct-to-Mux video uploads with progress tracking,
 * status polling, and error handling. Supports upload cancellation, duplicate video detection, and provides
 * real-time feedback on upload and processing status. Integrates with Supabase for video metadata storage.
 */

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import { MuxPlayer } from './MuxPlayer';
import styles from './UploadInterface.module.css';
import { useAuth } from '@/hooks/useAuth';

interface UploadInterfaceProps {
  promptId: string;
  onUploadSuccess?: (videoId: string, playbackId: string) => Promise<void>;
  targetSharerId: string;
}

export function UploadInterface({
  promptId,
  onUploadSuccess,
  targetSharerId
}: UploadInterfaceProps) {
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [existingVideo, setExistingVideo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [processingState, setProcessingState] = useState<
    'idle' | 'uploading' | 'processing' | 'ready' | 'error'
  >('idle');
  const [muxPlaybackId, setMuxPlaybackId] = useState<string | null>(null);
  const uploadLock = useRef(false);
  const hasStartedUpload = useRef(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const handleVideoError = useCallback(() => {
    console.error(`Video processing failed for prompt ${promptId}`);
    setProcessingState('error');
    toast.error('Video processing failed');
    setUploadProgress(0);
    if (progressBarRef.current) {
      progressBarRef.current.style.setProperty('--progress-width', '0%');
    }
  }, [promptId]);

  const pollVideoStatus = useCallback(
    async (videoId: string) => {
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes with 5-second intervals

      const checkStatus = async () => {
        try {
          const { data: video, error } = await supabase
            .from('Video')
            .select('status, muxPlaybackId')
            .eq('id', videoId)
            .single();

          if (error) {
            console.error(`Error checking video status (attempt ${attempts + 1}) for ${videoId}:`, error);
            if (attempts < maxAttempts) {
              attempts++;
              await new Promise(resolve => setTimeout(resolve, 5000));
              return checkStatus();
            } else {
              console.error(`Max polling attempts reached after error for ${videoId}. Failing.`);
              handleVideoError();
              return;
            }
          }

          if (video?.status === 'READY' && video?.muxPlaybackId) {
            setMuxPlaybackId(video.muxPlaybackId);
            setProcessingState('ready');
            toast.success('Video is processed and ready to view!');
            if (onUploadSuccess) {
              onUploadSuccess(videoId, video.muxPlaybackId).catch(err => {
                console.error(`Error executing onUploadSuccess callback for ${videoId}:`, err);
              });
            }
            return; // Exit polling successfully
          }

          if (video?.status === 'ERRORED') {
            console.error(`Video status is ERRORED for ${videoId}. Failing.`);
            handleVideoError();
            return;
          }

          // If not ready or errored, continue polling
          if (attempts < maxAttempts) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 5000));
            return checkStatus();
          } else {
            console.error(`Max polling attempts reached for ${videoId} without READY status. Failing.`);
            handleVideoError();
          }
        } catch (error) {
          console.error(`Error in pollVideoStatus catch block (attempt ${attempts + 1}) for ${videoId}:`, error);
          if (attempts < maxAttempts) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 5000));
            return checkStatus();
          } else {
            console.error(`Max polling attempts reached for ${videoId} after catch block error. Failing.`);
            handleVideoError();
          }
        }
      };

      await checkStatus();
    },
    [supabase, handleVideoError, onUploadSuccess, promptId]
  );

  const handleUpload = useCallback(
    async (file: File) => {
      hasStartedUpload.current = true;
      setIsUploading(true);
      setUploadProgress(0);
      setProcessingState('idle'); // Reset processing state

      try {
        // Get current user
        const supabase = createClient();

        if (authLoading) {
          toast.error('Authentication in progress');
          throw new Error('Authentication in progress');
        }

        if (!user) {
          toast.error('Please sign in to upload videos');
          throw new Error('Please sign in to upload videos');
        }

        // Get JWT token
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.access_token) {
          toast.error('Failed to get authorization token');
          throw new Error('Failed to get authorization token');
        }

        // Get upload URL from your API
        const response = await fetch('/api/mux/upload-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            promptId,
            targetSharerId
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error(`Failed to get upload URL for prompt ${promptId}. Status: ${response.status}`, error);
          if (response.status === 401) {
            throw new Error('Please sign in to upload videos');
          } else if (response.status === 403) {
            throw new Error('You do not have permission to upload videos');
          } else if (response.status === 409) {
            throw new Error('A video for this prompt already exists');
          } else {
            throw new Error(error.message || 'Failed to get upload URL');
          }
        }

        const { uploadUrl, uploadId, videoId } = await response.json();

        if (!uploadUrl || !uploadId) {
          toast.error('Failed to get upload URL');
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

        xhr.addEventListener('loadend', () => {
          if (aborted) {
             return;
          }
          if (xhr.status >= 200 && xhr.status < 300) {
            setProcessingState('processing');
            if (videoId) {
              pollVideoStatus(videoId);
            } else {
              console.error(`Video ID not available for polling after upload for prompt ${promptId}.`);
              handleVideoError();
            }
          } else {
            toast.error(`Upload failed: ${xhr.statusText || 'Unknown error'}`);
            console.error(`Upload failed for prompt ${promptId}. Status: ${xhr.status}, StatusText: ${xhr.statusText}`);
            setIsUploading(false);
            setProcessingState('error');
          }
        });

        xhr.addEventListener('error', (e) => {
          console.error(`XHR error event during upload for prompt ${promptId}. Aborted: ${aborted}`, e);
          if (!aborted) {
            handleVideoError();
            setProcessingState('idle');
          }
        });

        xhr.addEventListener('abort', () => {
          console.log(`XHR abort event during upload for prompt ${promptId}.`);
          aborted = true;
          handleVideoError();
          setProcessingState('idle');
          setUploadProgress(0);
        });

        // Clean up function for all cases
        const cleanup = () => {
          if (!aborted) {
            setIsUploading(false);
            uploadLock.current = false;
          }
        };

        // Add cleanup to all event listeners
        xhr.addEventListener('loadend', cleanup);
        xhr.addEventListener('error', cleanup);
        xhr.addEventListener('abort', cleanup);

        // Start upload
        xhr.open('PUT', uploadUrl);
        xhr.send(file);
      } catch (error) {
        console.error(`Upload error in catch block for prompt ${promptId}:`, error);
        handleVideoError();
        setIsUploading(false);
        setProcessingState('idle');
        setUploadProgress(0);
        uploadLock.current = false;

        // Show appropriate error message
        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error('Failed to upload video');
        }
      }
    },
    [promptId, pollVideoStatus, handleVideoError, authLoading, user, targetSharerId]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      if (processingState !== 'idle') {
          return;
      }

      const file = e.dataTransfer.files[0];
      if (!file) {
           return;
      }
      handleUpload(file);
    },
    [handleUpload, processingState, promptId]
  );

  const handleClick = useCallback(() => {
    if (processingState !== 'idle') {
        return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        return;
      }
      handleUpload(file);
    };
    input.click();
  }, [handleUpload, processingState, promptId]);

  useEffect(() => {
    const checkExistingVideo = async () => {
      // Skip check if we've started uploading in this session
      if (hasStartedUpload.current) {
          return;
      }

      if (!promptId) {
          return;
      }

      setIsLoading(true);
      try {
        const { data: videos, error } = await supabase
          .from('Video')
          .select('*')
          .eq('promptId', promptId)
          .not('status', 'eq', 'ERRORED')
          .maybeSingle();

        if (error && error.code !== 'PGRST116') { // Ignore "no rows" error
          console.error(`Error checking existing video for prompt ${promptId}:`, error);
          return; // Exit if there's a real error
        }

        setExistingVideo(videos); // Set null if no video found

        if (videos?.status === 'READY' && videos?.muxPlaybackId) {
            setMuxPlaybackId(videos.muxPlaybackId);
            setProcessingState('ready');
        } else {
             // Ensure state is idle if no ready video exists
             if (processingState !== 'idle' && processingState !== 'uploading' && processingState !== 'processing') {
                setProcessingState('idle');
                setMuxPlaybackId(null);
             }
        }


      } catch (error) {
        console.error(`Error in checkExistingVideo catch block for prompt ${promptId}:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingVideo();
  }, [promptId, supabase, processingState]);

  // Effect to update the CSS variable for the progress bar
  useEffect(() => {
    if (progressBarRef.current) {
      progressBarRef.current.style.setProperty('--progress-width', `${uploadProgress}%`);
    }
  }, [uploadProgress, promptId]);

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
        {processingState === 'idle' && !isUploading && !muxPlaybackId && (
          <div className="mb-4">
            <h2 className="text-lg font-normal tracking-tight">
              Upload Your Video Response
            </h2>
          </div>
        )}

        <div className="flex flex-col flex-1 min-h-0">
          {processingState === 'ready' && muxPlaybackId ? (
            <div className="flex flex-col items-center justify-center flex-1 min-h-0">
              <div className={`relative w-full max-w-[800px] ${styles.videoContainer}`}>
                <div className="w-full">
                  <div className="aspect-video bg-black rounded-md overflow-hidden relative">
                    <div className="absolute inset-0">
                      <MuxPlayer playbackId={muxPlaybackId} />
                    </div>
                  </div>
                  <div className="text-sm text-[#16A34A] bg-[#DCFCE7] p-3 rounded-md text-center mt-4 w-full">
                    Video uploaded and processed successfully! You can close this popup when you&apos;re done reviewing your video.
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
                  <div className={styles.progressBarContainer}>
                    <div
                      ref={progressBarRef}
                      className={styles.progressBar}
                      role="progressbar"
                      aria-valuenow={uploadProgress} // Revert to number
                      aria-valuemin={0}           // Revert to number literal
                      aria-valuemax={100}          // Revert to number literal
                    >
                      {/* Empty */}
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className={`flex-1 border-2 border-dashed rounded-lg py-52 px-8 text-center hover:bg-muted/50 transition-colors cursor-pointer ${
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

          {existingVideo && !muxPlaybackId && processingState !== 'ready' && ( // Only show if not already showing player
            <div className="text-sm text-yellow-600 bg-yellow-50/50 p-3 rounded-md text-center mt-4">
              A video for this prompt already exists. Delete the existing video if you want to upload a new one.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}