/**
 * File: components/RecordingInterface.tsx
 * Description: A comprehensive video recording interface component that handles camera/microphone selection,
 * video recording with pause/resume functionality, audio visualization, preview playback, and video upload.
 * Supports high-quality video recording with fallback options and provides real-time audio level monitoring.
 */

'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Video, X, Square, Circle, Upload, Timer, Camera, Mic, RotateCcw, Save, Play, Pause } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { MuxPlayer } from './MuxPlayer';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import '@/styles/recording-interface.css';

export interface RecordingInterfaceProps {
  promptId: string;
  onClose: () => void;
  onSave: (blob: Blob) => Promise<string>;
}

interface MediaDevice {
  deviceId: string;
  label: string;
}

export function RecordingInterface({ promptId, onClose, onSave }: RecordingInterfaceProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [videoDevices, setVideoDevices] = useState<MediaDevice[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDevice[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [processingState, setProcessingState] = useState<'idle' | 'uploading' | 'processing' | 'ready' | 'error'>('idle');
  const [muxPlaybackId, setMuxPlaybackId] = useState<string | null>(null);

  const audioLevelWidth = useMemo(() => {
    const width = Math.min(100, (audioLevel / 256) * 100);
    return `w-[${width}%]`;
  }, [audioLevel]);

  useEffect(() => {
    // Get available media devices and start preview automatically
    const initializeDevices = async () => {
      try {
        // Request permission to access devices
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        const videoInputs = devices
          .filter(device => device.kind === 'videoinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Camera ${device.deviceId.slice(0, 4)}`
          }));
        
        const audioInputs = devices
          .filter(device => device.kind === 'audioinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Microphone ${device.deviceId.slice(0, 4)}`
          }));

        setVideoDevices(videoInputs);
        setAudioDevices(audioInputs);

        // Set default devices
        if (videoInputs.length > 0) {
          setSelectedVideoDevice(videoInputs[0].deviceId);
          // Start preview with the default device
          await startPreview(videoInputs[0].deviceId, audioInputs[0]?.deviceId);
        }
        if (audioInputs.length > 0) {
          setSelectedAudioDevice(audioInputs[0].deviceId);
        }
      } catch (err) {
        console.error('Error accessing media devices:', err);
        setError('Unable to access camera or microphone. Please check your permissions.');
      }
    };

    initializeDevices();

    // Cleanup function
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
      }
      cleanupAudioVisualization();
    };
  }, []);

  // Add audio visualization setup
  const setupAudioVisualization = (stream: MediaStream) => {
    try {
      // Create audio context and analyzer
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      
      // Connect audio stream to analyzer
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      audioAnalyserRef.current = analyser;

      // Start visualization loop
      const updateAudioLevel = () => {
        if (!audioAnalyserRef.current) return;
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume level
        const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
        setAudioLevel(average);
        
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      
      updateAudioLevel();
    } catch (err) {
      console.error('Error setting up audio visualization:', err);
    }
  };

  // Clean up audio visualization
  const cleanupAudioVisualization = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    audioContextRef.current = null;
    audioAnalyserRef.current = null;
  };

  const startPreview = async (videoDeviceId?: string, audioDeviceId?: string) => {
    try {
      // Clean up existing resources
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          streamRef.current?.removeTrack(track);
        });
      }
      cleanupAudioVisualization();

      // Define 16:9 resolutions in descending order of preference
      const resolutions = [
        { width: 1920, height: 1080 }, // 1080p
        { width: 1280, height: 720 },  // 720p
        { width: 854, height: 480 }    // 480p
      ];

      let stream = null;
      for (const resolution of resolutions) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              deviceId: videoDeviceId ? { exact: videoDeviceId } : undefined,
              width: { ideal: resolution.width },
              height: { ideal: resolution.height },
              aspectRatio: { exact: 16/9 },
              frameRate: { ideal: 30, min: 24 }
            },
            audio: { 
              deviceId: audioDeviceId ? { exact: audioDeviceId } : undefined,
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 48000,
              sampleSize: 16
            }
          });
          break; // If we get here, we successfully got a stream
        } catch (e) {
          if (resolution === resolutions[resolutions.length - 1]) {
            throw e; // If we've tried all resolutions, throw the error
          }
          // Otherwise continue to next resolution
          continue;
        }
      }

      if (!stream) {
        throw new Error('Could not initialize video stream');
      }

      streamRef.current = stream;
      setupAudioVisualization(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;
        videoRef.current.volume = 0;
      }

      setIsPreviewActive(true);
      setError(null);
    } catch (err) {
      console.error('Error starting preview:', err);
      setError('Unable to start camera preview. Please check your device settings.');
    }
  };

  const startRecording = useCallback(async () => {
    try {
      if (!isPreviewActive) {
        await startPreview(selectedVideoDevice, selectedAudioDevice);
      }

      if (!streamRef.current) {
        throw new Error('No media stream available');
      }

      // Clean up any existing recordings
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
        setRecordedVideoUrl(null);
      }
      setRecordedChunks([]);
      setRecordingTime(0);
      setIsPreviewMode(false);

      // Prioritize highest quality codecs
      const codecs = [
        'video/webm;codecs=h264,opus',   // High quality, widely supported
        'video/webm;codecs=vp9,opus',    // Excellent quality, better compression
        'video/webm;codecs=vp8,opus',    // Fallback
        'video/webm'                     // Last resort
      ];

      let mimeType = codecs.find(codec => MediaRecorder.isTypeSupported(codec)) || 'video/webm';

      // Configure for maximum quality
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType,
        videoBitsPerSecond: 8000000,     // 8 Mbps for high quality video
        audioBitsPerSecond: 128000       // 128 kbps for high quality audio
      });
      
      mediaRecorderRef.current = mediaRecorder;

      // Store all chunks immediately for best quality
      let chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          setRecordedChunks(chunks); // Update immediately to ensure we don't lose data
        }
      };

      // Handle recording errors
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred. Please try again.');
        stopRecording();
      };

      // Use performance.now() for accurate timing
      let startTime = performance.now();
      timerRef.current = setInterval(() => {
        const elapsedSeconds = Math.floor((performance.now() - startTime) / 1000);
        setRecordingTime(elapsedSeconds);
      }, 1000);

      // Request smaller chunks for better quality control
      mediaRecorder.start(1000); // 1-second chunks for reliable quality
      setIsRecording(true);
      setError(null);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Unable to start recording. Please check your device settings.');
    }
  }, [isPreviewActive, recordedVideoUrl, selectedVideoDevice, selectedAudioDevice, startPreview]);

  const startCountdown = useCallback(() => {
    setCountdownValue(3);
    const countdownInterval = setInterval(() => {
      setCountdownValue((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownInterval);
          if (prev === 1) {
            startRecording();
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [startRecording]);

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return Promise.resolve();

    return new Promise<void>((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve();
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        try {
          // Stop all tracks properly
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
              track.stop();
              streamRef.current?.removeTrack(track);
            });
          }

          // Create a single high-quality blob
          const blob = new Blob(recordedChunks, { 
            type: mediaRecorderRef.current?.mimeType || 'video/webm'
          });
          
          // Store locally for best quality
          const url = URL.createObjectURL(blob);
          setRecordedVideoUrl(url);
          setIsRecording(false);
          setIsPreviewMode(true);
          
          // Configure video element for high-quality playback
          if (videoRef.current) {
            videoRef.current.srcObject = null;
            videoRef.current.src = url;
            videoRef.current.muted = false;
            videoRef.current.volume = 1;
            await videoRef.current.load();
          }

          resolve();
        } catch (err) {
          console.error('Error creating video preview:', err);
          setError('Failed to create video preview. Please try recording again.');
          resolve();
        }
      };

      // Clear recording timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      mediaRecorderRef.current.stop();
    });
  }, [recordedChunks]);

  const togglePause = () => {
    if (mediaRecorderRef.current) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        timerRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
      setIsPaused(!isPaused);
    }
  };

  const handleComplete = async () => {
    stopRecording();
  };

  const handleSave = async () => {
    try {
      if (recordedChunks.length === 0) {
        setError('No recording available to save');
        return;
      }

      setProcessingState('uploading');
      setError(null);

      const blob = new Blob(recordedChunks, {
        type: 'video/webm'
      });

      const videoId = await onSave(blob);
      if (!videoId) {
        throw new Error('Failed to save video');
      }

      // Show success notification
      toast.success('Video uploaded successfully');
      
      // Just close the popup, no need to refresh
      onClose();

    } catch (error) {
      console.error('Error saving video:', error);
      setError(error instanceof Error ? error.message : 'Failed to save video');
      setProcessingState('error');
      toast.error('Failed to save video');
    }
  };

  const handleCancel = () => {
    // Stop recording if active
    if (mediaRecorderRef.current && isRecording) {
      stopRecording();
    }
    
    // Clean up recording state
    setRecordedChunks([]);
    setRecordingTime(0);
    
    // Stop all media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        streamRef.current?.removeTrack(track);
      });
      streamRef.current = null;
    }
    
    // Clean up video resources
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
      setRecordedVideoUrl(null);
    }
    
    // Clean up audio visualization
    cleanupAudioVisualization();
    
    // Reset all states
    setIsPreviewMode(false);
    setIsPreviewActive(false);
    setIsRecording(false);
    setIsPaused(false);
    setIsProcessing(false);
    
    // Clear any timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Call parent handler to close
    onClose();
  };

  const handleRetake = useCallback(() => {
    setIsPreviewMode(false);
    setRecordedChunks([]);
    startPreview(selectedVideoDevice, selectedAudioDevice);
  }, [selectedVideoDevice, selectedAudioDevice, startPreview]);

  const togglePreviewPlayback = async () => {
    if (videoRef.current) {
      try {
        if (isPlayingPreview) {
          await videoRef.current.pause();
        } else {
          await videoRef.current.play();
        }
        setIsPlayingPreview(!isPlayingPreview);
      } catch (err) {
        console.error('Error toggling preview playback:', err);
        setError('Unable to play video preview. Please try recording again.');
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Only call onSave since it's the same function as onComplete
      await onSave(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Failed to upload file. Please try again.');
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full max-h-[90vh] p-4">
      <div className="space-y-4 flex-1 overflow-y-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-md">
            {error}
          </div>
        )}

        <div className="flex flex-col flex-1">
          {processingState === 'ready' && muxPlaybackId ? (
            <div className="flex flex-col items-center justify-center flex-1 min-h-0">
              <div className="relative w-full max-w-[800px] w-[min(60vw,calc(55vh*16/9))]">
                <div className="w-full">
                  <div className="aspect-video bg-black rounded-md overflow-hidden relative">
                    <div className="absolute inset-0">
                      <MuxPlayer playbackId={muxPlaybackId} />
                    </div>
                  </div>
                  <div className="text-sm text-[#16A34A] bg-[#DCFCE7] p-3 rounded-md text-center mt-4 w-full">
                    Video uploaded and processed successfully!
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
          ) : processingState === 'uploading' ? (
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
              <p className="text-lg font-medium">Uploading video...</p>
              <p className="text-sm text-muted-foreground">Please wait</p>
            </div>
          ) : processingState === 'error' ? (
            <div className="text-center py-12 text-red-500">
              <p className="text-lg font-medium">Error processing video</p>
              <p className="text-sm">Please try again</p>
            </div>
          ) : (
            <>
              {/* Device Selection */}
              <div className={cn("space-y-6", (isRecording || isPreviewMode || processingState !== 'idle') && "opacity-50 pointer-events-none")}>
                <div className="flex gap-6">
                  <div className="flex-1">
                    <Label htmlFor="camera" className="mb-2 block">Camera</Label>
                    <Select
                      value={selectedVideoDevice}
                      onValueChange={(value) => {
                        setSelectedVideoDevice(value);
                        startPreview(value, selectedAudioDevice);
                      }}
                      disabled={isRecording || isPreviewMode || processingState !== 'idle'}
                    >
                      <SelectTrigger className="h-12 rounded-full">
                        <Camera className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Select camera" />
                      </SelectTrigger>
                      <SelectContent>
                        {videoDevices.map((device) => (
                          <SelectItem key={device.deviceId} value={device.deviceId}>
                            {device.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="microphone" className="mb-2 block">Microphone</Label>
                    <Select
                      value={selectedAudioDevice}
                      onValueChange={(value) => {
                        setSelectedAudioDevice(value);
                        startPreview(selectedVideoDevice, value);
                      }}
                      disabled={isRecording || isPreviewMode || processingState !== 'idle'}
                    >
                      <SelectTrigger className="h-12 rounded-full">
                        <Mic className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Select microphone" />
                      </SelectTrigger>
                      <SelectContent>
                        {audioDevices.map((device) => (
                          <SelectItem key={device.deviceId} value={device.deviceId}>
                            {device.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Video Preview with Timer and Audio Level Overlay */}
              <div className="flex flex-col items-center justify-center flex-1 min-h-0 mt-6">
                <div className="relative w-full max-w-[800px] max-h-[calc(100vh-300px)]">
                  <div className="w-full">
                    <div className="aspect-video bg-black rounded-md overflow-hidden relative">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted={!isPreviewMode}
                        controls={isPreviewMode}
                        controlsList="nodownload"
                        className={cn(
                          "w-full h-full object-cover",
                          !isPreviewMode && "scale-x-[-1]"
                        )}
                        onEnded={() => setIsPlayingPreview(false)}
                        onError={(e) => {
                          const error = e.currentTarget.error;
                          console.error('Video error:', {
                            code: error?.code,
                            message: error?.message,
                            event: e
                          });
                          setError(`Error playing video: ${error?.message || 'Please try recording again.'}`);
                        }}
                      />
                      {/* Timer Overlay */}
                      {isRecording && (
                        <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full flex items-center gap-2 z-10">
                          <Timer className="h-4 w-4 text-red-500 animate-pulse" />
                          <span className="font-mono">{formatTime(recordingTime)}</span>
                        </div>
                      )}
                      {/* Audio Level Indicator */}
                      {(isPreviewActive || isRecording) && !isPreviewMode && (
                        <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full flex items-center gap-2 z-10">
                          <Mic className={cn(
                            "h-4 w-4",
                            audioLevel > 50 ? "text-green-500" : "text-gray-500",
                            audioLevel > 50 && "animate-pulse"
                          )} />
                          <div className="w-16 h-1 bg-gray-700 rounded-full">
                            <div 
                              className="h-full bg-green-500 rounded-full transition-all duration-100"
                              style={{ width: `${Math.min(100, (audioLevel / 256) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {/* Countdown Overlay */}
                      {countdownValue !== null && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <span className="text-white text-8xl font-bold animate-pulse">
                            {countdownValue}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex justify-center gap-4 py-4 mt-auto">
                {!isRecording && !isPreviewMode && processingState === 'idle' && (
                  <div className="flex gap-4">
                    <Button 
                      onClick={startCountdown} 
                      size="lg"
                      className="h-12 px-6 rounded-full"
                      disabled={countdownValue !== null}
                    >
                      <Video className="mr-2 h-5 w-5" />
                      Start Recording
                    </Button>
                    <Button 
                      onClick={handleCancel} 
                      size="lg" 
                      variant="ghost"
                      className="h-12 px-6 rounded-full"
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                {isRecording && (
                  <div className="flex gap-4">
                    <Button 
                      onClick={togglePause} 
                      size="lg" 
                      variant="outline"
                      className="h-12 px-6 rounded-full"
                    >
                      <Pause className="mr-2 h-5 w-5" />
                      Pause
                    </Button>
                    <Button 
                      onClick={stopRecording} 
                      size="lg" 
                      variant="destructive"
                      className="h-12 px-6 rounded-full"
                    >
                      <Square className="mr-2 h-5 w-5" />
                      End Recording
                    </Button>
                    <Button 
                      onClick={handleCancel} 
                      size="lg" 
                      variant="ghost"
                      className="h-12 px-6 rounded-full"
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                {isPreviewMode && processingState === 'idle' && (
                  <div className="flex gap-4">
                    <Button 
                      onClick={handleSave} 
                      size="lg"
                      className="h-12 px-6 rounded-full"
                    >
                      Save Recording
                    </Button>
                    <Button 
                      onClick={handleRetake} 
                      size="lg" 
                      variant="outline"
                      className="h-12 px-6 rounded-full"
                    >
                      Record Again
                    </Button>
                    <Button 
                      onClick={handleCancel} 
                      size="lg" 
                      variant="ghost"
                      className="h-12 px-6 rounded-full"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

