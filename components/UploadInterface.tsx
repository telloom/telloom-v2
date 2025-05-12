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
import { Loader2 } from 'lucide-react';

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
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleVideoError = useCallback(() => {
    setProcessingState('error');
    setUploadProgress(0);
    if (progressBarRef.current) {
      progressBarRef.current.style.setProperty('--progress-width', '0%');
    }
    if (pollIntervalRef.current) {
      clearTimeout(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const pollVideoStatus = useCallback(async (videoId: string) => {
    const MAX_POLL_ATTEMPTS = 60; // ~5 minutes
    const POLL_INTERVAL = 5000; // 5 seconds
    let attempts = 0;

    const checkStatus = async () => {
      if (!videoId) {
        return; // Should not happen if called correctly
      }
      if (attempts >= MAX_POLL_ATTEMPTS) {
        toast.error('Video processing timed out.');
        setProcessingState('error');
        return;
      }

      attempts++;

      try {
        const { data: video, error } = await supabase
          .from('Video')
          .select('status, muxPlaybackId')
          .eq('id', videoId)
          .single();

        if (error && error.code !== 'PGRST116') { // Ignore 'exact one row' error if no video yet
          console.error(`Error fetching video status for ${videoId}:`, error);
          pollIntervalRef.current = setTimeout(checkStatus, POLL_INTERVAL);
          return;
        }

        if (!video) {
          pollIntervalRef.current = setTimeout(checkStatus, POLL_INTERVAL);
          return;
        }

        if (video?.status === 'READY' && video?.muxPlaybackId) {
          setMuxPlaybackId(video.muxPlaybackId);
          setProcessingState('ready');
          toast.success('Video is processed and ready to view!');
          if (onUploadSuccess) {
            onUploadSuccess(videoId, video.muxPlaybackId).catch(err => {
              console.error('Error executing onUploadSuccess callback:', err);
            });
          }
          return; // Exit polling successfully
        }

        if (video?.status === 'ERRORED') {
          toast.error('Video processing failed on the server.');
          setProcessingState('error');
          return; // Exit polling on error
        }

        pollIntervalRef.current = setTimeout(checkStatus, POLL_INTERVAL);

      } catch (err) {
        console.error(`Unexpected error during poll for video ${videoId}:`, err);
        if (attempts < 3) { // Allow a few retries on network/unexpected errors
          pollIntervalRef.current = setTimeout(checkStatus, POLL_INTERVAL * 2); // Longer backoff
        } else {
          setProcessingState('error');
          toast.error('Failed to check video status after multiple attempts.');
        }
      }
    };

    if (pollIntervalRef.current) {
      clearTimeout(pollIntervalRef.current);
    }
    checkStatus(); // Start the first check
  }, [supabase, onUploadSuccess]);

  const handleUpload = useCallback(async (file: File) => {
    if (!user || !targetSharerId) {
      toast.error('Authentication or Sharer context missing.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setProcessingState('idle'); // Reset state for new upload
    setMuxPlaybackId(null);

    if (progressBarRef.current) {
      progressBarRef.current.style.setProperty('--progress-width', '0%');
    }

    if (xhrRef.current) {
      xhrRef.current.abort();
    }
    if (pollIntervalRef.current) {
      clearTimeout(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    try {
      const response = await fetch('/api/mux/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ promptId, targetSharerId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get upload URL');
      }

      const { uploadUrl, videoId } = await response.json();

      if (!uploadUrl || !videoId) {
        throw new Error('Missing upload URL or video ID from API');
      }

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', file.type);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
          if (progressBarRef.current) {
            progressBarRef.current.style.setProperty('--progress-width', `${percentComplete}%`);
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setProcessingState('processing');
          pollVideoStatus(videoId);
        } else {
          handleVideoError();
          console.error(`Upload failed with status: ${xhr.status}`, xhr.responseText);
          toast.error(`Upload failed: ${xhr.statusText || 'Unknown error'}`);
        }
      };

      xhr.onerror = () => {
        handleVideoError();
        console.error('[Upload] XHR onerror event');
        toast.error('Upload failed due to a network error.');
      };

      xhr.onabort = () => {
        // Don't show error toast if aborted intentionally
      };

      const cleanup = () => {
        setIsUploading(false);
        xhrRef.current = null;
      };

      xhr.onloadend = () => {
        cleanup();
      };

      xhr.send(file);

    } catch (error) {
      console.error('[Upload] Error during upload setup or execution:', error);
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred during upload.');
      handleVideoError();
      setIsUploading(false); // Ensure loading state is reset on setup error
    }

  }, [user, targetSharerId, promptId, pollVideoStatus]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (isUploading || processingState === 'processing' || processingState === 'ready') {
      return; // Ignore drop if busy
    }

    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      handleUpload(file);
    } else {
      toast.warning('Please drop a valid video file.');
    }
  }, [handleUpload, isUploading, processingState]);

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
  }, [handleUpload, processingState]);

  useEffect(() => {
    if (!user || !targetSharerId || !promptId) {
      setIsLoading(false); // Set loading false if cannot check
      return;
    }

    if (isUploading || processingState !== 'idle') {
      return;
    }

    const checkExistingVideo = async () => {
      try {
        const { data: existingVideo, error } = await supabase
          .from('Video')
          .select('id, status, muxPlaybackId, muxAssetId')
          .eq('promptId', promptId)
          .eq('profileSharerId', targetSharerId)
          .order('createdAt', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('[Upload] Error checking existing video:', error);
        }

        if (existingVideo?.status === 'READY' && existingVideo.muxPlaybackId) {
          setMuxPlaybackId(existingVideo.muxPlaybackId);
          setProcessingState('ready');
        } else if (existingVideo && ['PREPARING', 'WAITING'].includes(existingVideo.status)) {
          setProcessingState('processing');
          pollVideoStatus(existingVideo.id);
        } else {
          // Stay in 'idle' state
        }
      } catch (err) {
        console.error('[Upload] Unexpected error in checkExistingVideo:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingVideo();

  }, [user, targetSharerId, promptId, supabase, isUploading, processingState, pollVideoStatus]);

  useEffect(() => {
    return () => {
      if (xhrRef.current) {
        xhrRef.current.abort();
      }
      if (pollIntervalRef.current) {
        clearTimeout(pollIntervalRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto !border-0 !shadow-none h-full flex flex-col">
      <div className="p-4 flex flex-col min-h-0 flex-1">
        {processingState !== 'ready' && (
          <div className="mb-4">
            <h2 className="text-lg font-normal tracking-tight">
              {isUploading ? 'Uploading Your Video...' :
               processingState === 'processing' ? 'Processing Your Video...' :
               processingState === 'error' ? 'Upload Failed' :
               'Upload Your Video Response'}
            </h2>
          </div>
        )}

        <div className="flex flex-col flex-1 min-h-0">
          {processingState === 'ready' && muxPlaybackId ? (
            <div className="flex flex-col items-center justify-center flex-1 min-h-0">
              <div className={`relative w-full h-0 ${styles.videoContainer}`}>
                <MuxPlayer playbackId={muxPlaybackId} />
              </div>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Your video has been successfully uploaded and processed.
              </p>
              <button
                  onClick={() => {
                      setProcessingState('idle');
                      setMuxPlaybackId(null);
                      setUploadProgress(0);
                  }}
                  className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-full hover:bg-gray-300 transition-colors text-sm"
              >
                  Upload a Different Video
              </button>
            </div>
          ) : processingState === 'processing' ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-gray-400 mb-4" />
              <p className="text-muted-foreground">Processing your video...</p>
              <p className="text-xs text-muted-foreground mt-2">This might take a few moments.</p>
            </div>
          ) : processingState === 'error' ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center">
              <p className="text-red-600 mb-4">Something went wrong during the upload or processing.</p>
              <button
                onClick={() => setProcessingState('idle')}
                className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 flex-1 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative"
            >
              {isUploading ? (
                <div className="w-full">
                  <p className="mb-2 text-sm text-muted-foreground">Uploading: {uploadProgress}%</p>
                  <div className={styles.progressBarContainer}>
                    <div
                      ref={progressBarRef}
                      className={styles.progressBar}
                      role="progressbar"
                      aria-valuenow={uploadProgress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      {/* Percentage removed from inside */}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (xhrRef.current) {
                        xhrRef.current.abort();
                      }
                      setIsUploading(false);
                      setUploadProgress(0);
                      setProcessingState('idle');
                      setMuxPlaybackId(null);
                      if (progressBarRef.current) {
                        progressBarRef.current.style.setProperty('--progress-width', '0%');
                      }
                      toast.info('Upload cancelled.');
                    }}
                    className="mt-4 text-sm text-red-600 hover:underline"
                  >
                    Cancel Upload
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleUpload(file);
                      }
                    }}
                    className="hidden"
                    id="video-upload-input"
                  />
                  <label htmlFor="video-upload-input" className="cursor-pointer">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-600">
                      <span className="font-medium text-[#1B4332]">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">MP4, MOV, AVI, etc. up to 1GB</p>
                  </label>
                </div>
              )}
            </div>
          )}

          {existingVideo && !muxPlaybackId && processingState !== 'ready' && (
            <div className="text-sm text-yellow-600 bg-yellow-50/50 p-3 rounded-md text-center mt-4">
              A video for this prompt already exists. Delete the existing video if you want to upload a new one.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}