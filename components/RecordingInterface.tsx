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
import { Video, X, Square, Circle, Upload, Timer, Camera, Mic, RotateCcw, Save, Play, Pause, Maximize } from 'lucide-react';
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

// Define standard resolutions
interface ResolutionOption {
  label: string;
  width: number;
  height: number;
}

const STANDARD_RESOLUTIONS: ResolutionOption[] = [
  { label: '1080p', width: 1920, height: 1080 },
  { label: '720p', width: 1280, height: 720 },
  { label: '480p', width: 854, height: 480 },
  // Add lower resolutions if needed, e.g., 360p
  // { label: '360p', width: 640, height: 360 },
];

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
  const chunkRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [processingState, setProcessingState] = useState<'idle' | 'uploading' | 'processing' | 'ready' | 'error'>('idle');
  const [muxPlaybackId, setMuxPlaybackId] = useState<string | null>(null);
  const [supportedResolutions, setSupportedResolutions] = useState<ResolutionOption[]>([]);
  const [selectedResolution, setSelectedResolution] = useState<string>('');

  const audioLevelWidth = useMemo(() => {
    const width = Math.min(100, (audioLevel / 256) * 100);
    return `w-[${width}%]`;
  }, [audioLevel]);

  // Helper to find resolution object by label
  const findResolutionByLabel = useCallback((label: string): ResolutionOption | undefined => {
    return supportedResolutions.find(r => r.label === label) || STANDARD_RESOLUTIONS.find(r => r.label === label);
  }, [supportedResolutions]);

  // Function to check and update supported resolutions
  const updateSupportedResolutions = useCallback(async (videoDeviceId: string) => {
      if (!videoDeviceId) {
        setSupportedResolutions([]);
        setSelectedResolution('');
        return;
      }
      let tempStream: MediaStream | null = null;
      try {
        tempStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: videoDeviceId } }, audio: false });
        const videoTrack = tempStream.getVideoTracks()[0];
        const capabilities = videoTrack.getCapabilities ? videoTrack.getCapabilities() : null;
        const availableResolutions: ResolutionOption[] = [];
        if (capabilities?.width?.max && capabilities?.height?.max) {
          STANDARD_RESOLUTIONS.forEach(res => {
            if (capabilities.width!.max! >= res.width && capabilities.height!.max! >= res.height) {
              availableResolutions.push(res);
            }
          });
        } else {
          console.warn("Could not reliably determine max resolution, falling back to standard options.");
          availableResolutions.push(...STANDARD_RESOLUTIONS.filter(r => r.height <= 720));
        }
        availableResolutions.sort((a, b) => b.height - a.height);
        setSupportedResolutions(availableResolutions);

        // --- Default Resolution Logic --- 
        // Prioritize 1080p, then 720p, then highest available
        const default1080p = availableResolutions.find(r => r.height === 1080);
        const default720p = availableResolutions.find(r => r.height === 720);
        let defaultResolution = default1080p || default720p || availableResolutions[0]; // Fallback: 1080p -> 720p -> highest

        if (defaultResolution) {
          setSelectedResolution(defaultResolution.label);
        } else {
          setSelectedResolution('');
          setError("No suitable camera resolutions found."); // Add error if NO resolutions work
        }
      } catch (err) {
          console.error("Error getting video capabilities:", err);
          setError("Could not get camera capabilities.");
          setSupportedResolutions([]);
          setSelectedResolution('');
      } finally {
          tempStream?.getTracks().forEach(track => track.stop());
      }
    }, []);

  // Move audio visualization functions before startPreview and wrap them in useCallback
  const cleanupAudioVisualization = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null; // Clear ref
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(e => console.warn("Error closing AudioContext:", e)); // Close and handle potential error
      audioContextRef.current = null; // Clear ref
    }
    audioAnalyserRef.current = null; // Clear ref
    setAudioLevel(0); // Reset audio level state
  }, []);

  const setupAudioVisualization = useCallback((stream: MediaStream) => {
    // Ensure cleanup runs first if called consecutively
    cleanupAudioVisualization();
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256; // Use power of 2

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      audioAnalyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateAudioLevel = () => {
        if (!audioAnalyserRef.current) {
           animationFrameRef.current = null; // Stop loop if analyser is gone
           return;
        }
        try {
            audioAnalyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
            // Use Math.max to prevent negative values if dataArray is empty somehow
            setAudioLevel(Math.max(0, average));
            animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        } catch (error) {
            console.error("Error in audio visualization loop:", error);
            cleanupAudioVisualization(); // Stop visualization on error
        }
      };

      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);

    } catch (err) {
      console.error('Error setting up audio visualization:', err);
      cleanupAudioVisualization(); // Ensure cleanup on setup error
    }
  }, [cleanupAudioVisualization]);

  // --- Now define startPreview (and other functions that depend on audio helpers) ---
  const startPreview = useCallback(async (
    videoDeviceId?: string,
    audioDeviceId?: string,
    resolution?: ResolutionOption | null // Make resolution optional or allow null
  ) => {
     // Ensure videoDeviceId is provided
    if (!videoDeviceId) {
      console.warn("startPreview called without videoDeviceId");
      setError("No camera selected.");
      return;
    }
    try {
       // Call cleanupAudioVisualization directly here
       cleanupAudioVisualization();
       // ... cleanup logic for streamRef ...
       if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
       }

      const currentResolution = resolution || findResolutionByLabel(selectedResolution);

      // Define video constraints using the selected resolution
      const videoConstraints: MediaTrackConstraints = {
        deviceId: { exact: videoDeviceId }, // Use exact here
        aspectRatio: { exact: 16 / 9 },
        frameRate: { ideal: 30, min: 25 }
      };
      if (currentResolution) {
        videoConstraints.width = { ideal: currentResolution.width };
        videoConstraints.height = { ideal: currentResolution.height };
      } else {
        videoConstraints.width = { ideal: 1280 };
        videoConstraints.height = { ideal: 720 };
      }

       const audioConstraints: MediaTrackConstraints = {
         deviceId: audioDeviceId ? { exact: audioDeviceId } : undefined,
         echoCancellation: true,
         noiseSuppression: true,
         autoGainControl: true,
         sampleRate: 48000,
         sampleSize: 16
       };

      console.log("Attempting getUserMedia with constraints:", { video: videoConstraints, audio: audioConstraints });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: audioConstraints
      });

      streamRef.current = stream;
       // Call setupAudioVisualization directly here
       setupAudioVisualization(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.playsInline = true;
        await videoRef.current.play().catch(e => console.warn("Autoplay prevented:", e));
        videoRef.current.muted = true;
        videoRef.current.volume = 0;
      }

      setIsPreviewActive(true);
      setError(null);
    } catch (err) {
      console.error('Error starting preview:', err);
      setError('Unable to start camera preview. Please check your device settings and selected resolution.');
       // Also ensure cleanup on error
       cleanupAudioVisualization();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setIsPreviewActive(false);
    }
  // Correct dependencies: Now includes the memoized audio helpers
  }, [selectedResolution, findResolutionByLabel, setupAudioVisualization, cleanupAudioVisualization]);

   useEffect(() => {
    // ... initializeDevices ...
    const initializeDevices = async () => {
      // ... device detection ...
      try {
         // ... permission request ...
         await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
         const devices = await navigator.mediaDevices.enumerateDevices();
         // ... filtering devices ...
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

        let defaultAudioId: string | undefined = undefined;
        if (audioInputs.length > 0) {
            defaultAudioId = audioInputs[0].deviceId;
            setSelectedAudioDevice(defaultAudioId);
         }

        if (videoInputs.length > 0) {
          const defaultVideoId = videoInputs[0].deviceId;
          setSelectedVideoDevice(defaultVideoId);
          await updateSupportedResolutions(defaultVideoId);
          // Determine default resolution *after* updateSupportedResolutions sets state
          // We need to read the state *after* it has potentially been updated
          // This is tricky timing-wise. Let's read the state directly inside startPreview instead.
          // const resLabel = selectedResolution || (supportedResolutions.find(r => r.height <= 1080) || supportedResolutions[0])?.label;
          // const resolution = findResolutionByLabel(resLabel || '');
          // Call startPreview with undefined resolution, it will use the state default
          await startPreview(defaultVideoId, defaultAudioId, undefined);
        } else {
             setError("No video input devices found.");
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
      // Call cleanup directly here too for component unmount
      cleanupAudioVisualization();
    };
  // Update dependency array - make it empty to run only once on mount
  }, []);

  // Define stopRecording *before* startRecording
  const stopRecording = useCallback(() => {
    return new Promise<void>((resolve) => {
       if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
         console.log("Stop recording called but recorder is inactive.");
         // Ensure timer is cleared even if recorder is inactive
         if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
         }
         setIsRecording(false);
         setIsPaused(false);
         resolve();
         return;
      }

      mediaRecorderRef.current.onstop = async () => {
        try {
          // Stop all tracks properly
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
              track.stop();
            });
            // No need to remove tracks, just stop them and clear the ref later if needed
          }
          cleanupAudioVisualization(); // Cleanup audio viz on stop

          // Process chunks from the ref
          const finalChunks = [...chunkRef.current]; // Copy chunks from ref
          chunkRef.current = []; // Clear the ref

          if (finalChunks.length === 0) {
             console.warn("Recording stopped with no chunks saved.");
             // Reset state even if no blob is created
             setIsRecording(false);
             setIsPaused(false);
             setRecordingTime(0);
             if (videoRef.current) videoRef.current.srcObject = null; // Clear video element
             resolve();
             return;
          }

          // Create a single high-quality blob from the collected chunks
          const blob = new Blob(finalChunks, {
            type: mediaRecorderRef.current?.mimeType || 'video/webm'
          });

          // Update recordedChunks state *once* with the final array
          setRecordedChunks(finalChunks);

          // Store locally for best quality preview
          const url = URL.createObjectURL(blob);
          setRecordedVideoUrl(url);
          setIsRecording(false);
          setIsPaused(false); // Ensure paused state is reset
          setIsPreviewMode(true);

          // Configure video element for high-quality playback
          if (videoRef.current) {
            videoRef.current.srcObject = null; // Detach the live stream first
            videoRef.current.src = url;
            videoRef.current.muted = false; // Unmute for preview
            videoRef.current.volume = 1;
            await videoRef.current.load(); // Load the new source
          }

          resolve();
        } catch (err) {
          console.error('Error processing stopped recording:', err);
          setError('Failed to process video after stopping. Please try again.');
           // Reset state on error
          setIsRecording(false);
          setIsPaused(false);
          setRecordingTime(0);
          if (videoRef.current) videoRef.current.srcObject = null;
          resolve(); // Resolve the promise even on error
        } finally {
            // Chunks are already cleared from ref
            // Optional: Clear stream ref if preview needs restarting on retake
            // streamRef.current = null;
            // setIsPreviewActive(false);
        }
      };

      // Clear recording timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
         timerRef.current = null; // Clear ref
      }
      setRecordingTime(0); // Reset timer display immediately

      // Handle potential errors if stop() fails (though less common)
      try {
         mediaRecorderRef.current.stop();
      } catch (error) {
         console.error("Error calling mediaRecorder.stop():", error);
         setError("Error stopping the recording.");
         setIsRecording(false);
         setIsPaused(false);
         resolve(); // Still resolve
      }

    });
  // Dependencies for stopRecording: includes state setters and refs it interacts with
  }, [recordedChunks, cleanupAudioVisualization]);

  // Now define startRecording, which depends on the memoized stopRecording
  const startRecording = useCallback(async () => {
     const currentResolution = findResolutionByLabel(selectedResolution);
    if (!currentResolution) {
       setError("Please select a video resolution.");
       return;
    }

    try {
       // Ensure preview is active with the correct settings *before* recording
      if (!isPreviewActive || !streamRef.current) {
         console.log("Preview not active, starting preview before recording...");
         await startPreview(selectedVideoDevice, selectedAudioDevice, currentResolution);
         // Add a small delay to ensure the stream is fully ready
         await new Promise(resolve => setTimeout(resolve, 200));
       }

       if (!streamRef.current) {
         throw new Error('No media stream available after starting preview');
       }
      // Clean up any existing recordings
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
        setRecordedVideoUrl(null);
      }
      setRecordedChunks([]);
      chunkRef.current = [];
      setRecordingTime(0);
      setIsPreviewMode(false);

      // Prioritize H.264 (avc1), then VP9, then VP8 with Opus audio
      const codecs = [
        'video/webm;codecs=h264,opus',    // H.264 High Profile
        'video/webm;codecs=vp9,opus',     // VP9 Profile 0
        'video/webm;codecs=vp8,opus',     // VP8
        'video/webm',                     // Default WebM (likely VP8/VP9)
        'video/mp4;codecs=h264,aac',     // MP4 fallback (less common for recording)
      ];

      let mimeType = codecs.find(codec => MediaRecorder.isTypeSupported(codec)) || 'video/webm';
      console.log(`[RecordingInterface] Preferred mimeType found: ${mimeType}`);

      // Determine bitrate based on selected resolution
      let targetBitrate = 3000000; // Default to 3 Mbps (good for 720p)
      if (selectedResolution === '1080p') {
        targetBitrate = 5000000; // 5 Mbps for 1080p
      } else if (selectedResolution === '480p') {
        targetBitrate = 1500000; // 1.5 Mbps for 480p
      }
      console.log(`[RecordingInterface] Using resolution: ${selectedResolution}, target bitrate: ${targetBitrate}`);

      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType,
        videoBitsPerSecond: targetBitrate, // Use dynamic bitrate
        audioBitsPerSecond: 128000
      });

      // Log the actual mimeType being used by the browser
      console.log(`[RecordingInterface] MediaRecorder using actual mimeType: ${mediaRecorder.mimeType}`);

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // Push chunks to ref instead of setting state immediately
          chunkRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred. Please try again.');
        stopRecording(); // Use the memoized stopRecording
      };

      let startTime = performance.now();
      timerRef.current = setInterval(() => {
        const elapsedSeconds = Math.floor((performance.now() - startTime) / 1000);
        setRecordingTime(elapsedSeconds);
      }, 1000);

      mediaRecorder.start(1000);
      setIsRecording(true);
      setError(null);

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Unable to start recording. Please check your device settings.');
    }
  }, [
      isPreviewActive,
      selectedResolution,
      selectedVideoDevice,
      selectedAudioDevice,
      startPreview,
      recordedVideoUrl,
      stopRecording, // Now correctly depends on memoized version
      findResolutionByLabel
    ]);

  // Define handleComplete which uses stopRecording
  const handleComplete = useCallback(async () => {
    await stopRecording();
    // No need to do anything else here, stopRecording handles state updates
  }, [stopRecording]);

  // Update handlers for device/resolution changes
  const handleVideoDeviceChange = useCallback(async (deviceId: string) => {
    setSelectedVideoDevice(deviceId);
    // Stop current stream before getting new capabilities
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsPreviewActive(false); // Reset preview state
    await updateSupportedResolutions(deviceId); // This will find resolutions
    // Start preview *after* resolutions are updated and default is set
    const resLabel = selectedResolution || (supportedResolutions.find(r => r.height <= 1080) || supportedResolutions[0])?.label;
    const resolution = findResolutionByLabel(resLabel || '');
    await startPreview(deviceId, selectedAudioDevice, resolution);

  }, [updateSupportedResolutions, startPreview, selectedAudioDevice, selectedResolution, supportedResolutions, findResolutionByLabel]);

  const handleAudioDeviceChange = useCallback((deviceId: string) => {
    setSelectedAudioDevice(deviceId);
    // Restart preview with new audio device and current video/resolution
    const resolution = findResolutionByLabel(selectedResolution);
    startPreview(selectedVideoDevice, deviceId, resolution);
  }, [selectedVideoDevice, selectedResolution, startPreview, findResolutionByLabel]);

  const handleResolutionChange = useCallback((resolutionLabel: string) => {
    setSelectedResolution(resolutionLabel);
    const resolution = findResolutionByLabel(resolutionLabel);
    // Restart preview with new resolution and current devices
    startPreview(selectedVideoDevice, selectedAudioDevice, resolution);
  }, [selectedVideoDevice, selectedAudioDevice, startPreview, findResolutionByLabel]);

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

  // Update handleRetake to use startPreview correctly
  const handleRetake = useCallback(() => {
    setIsPreviewMode(false);
    setRecordedChunks([]);
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
      setRecordedVideoUrl(null);
    }
    // Restart preview with current selections
    const resolution = findResolutionByLabel(selectedResolution);
    startPreview(selectedVideoDevice, selectedAudioDevice, resolution);
  }, [selectedVideoDevice, selectedAudioDevice, selectedResolution, startPreview, recordedVideoUrl, findResolutionByLabel]);

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

        <div className="flex flex-col flex-1 min-h-0">
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
              {/* Device & Resolution Selectors - Keep rendered, but disable based on state */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                {/* Camera */}
                <div className="flex-1">
                  <Label htmlFor="camera" className="mb-1 block text-sm font-medium">Camera</Label>
                  <Select
                    value={selectedVideoDevice}
                    onValueChange={handleVideoDeviceChange}
                    disabled={isRecording || isPreviewMode || processingState !== 'idle'}
                  >
                    <SelectTrigger className="h-10 rounded-lg text-sm">
                      <Camera className="mr-2 h-4 w-4 flex-shrink-0" />
                      <SelectValue placeholder="Select camera" />
                    </SelectTrigger>
                    <SelectContent>
                      {videoDevices.map((device) => (
                        <SelectItem key={device.deviceId} value={device.deviceId} className="text-sm">
                          {device.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Microphone */}
                <div className="flex-1">
                  <Label htmlFor="microphone" className="mb-1 block text-sm font-medium">Microphone</Label>
                  <Select
                    value={selectedAudioDevice}
                    onValueChange={handleAudioDeviceChange}
                    disabled={isRecording || isPreviewMode || processingState !== 'idle'}
                  >
                    <SelectTrigger className="h-10 rounded-lg text-sm">
                      <Mic className="mr-2 h-4 w-4 flex-shrink-0" />
                      <SelectValue placeholder="Select microphone" />
                    </SelectTrigger>
                    <SelectContent>
                      {audioDevices.map((device) => (
                        <SelectItem key={device.deviceId} value={device.deviceId} className="text-sm">
                          {device.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Resolution */}
                <div className="flex-1">
                   <Label htmlFor="resolution" className="mb-1 block text-sm font-medium">Resolution</Label>
                   <Select
                     value={selectedResolution}
                     onValueChange={handleResolutionChange}
                     disabled={isRecording || isPreviewMode || processingState !== 'idle' || supportedResolutions.length === 0}
                   >
                     <SelectTrigger className="h-10 rounded-lg text-sm">
                       <Maximize className="mr-2 h-4 w-4 flex-shrink-0" />
                       <SelectValue placeholder={supportedResolutions.length === 0 ? "Detecting..." : "Select resolution"} />
                     </SelectTrigger>
                     <SelectContent>
                       {supportedResolutions.map((res) => (
                         <SelectItem key={res.label} value={res.label} className="text-sm">
                           {res.label} ({res.width}x{res.height})
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
              </div>

              {/* Video Preview Area */}
              <div className="flex flex-col items-center justify-center flex-1 min-h-0 w-full">
                <div className="relative w-full max-w-2xl aspect-video bg-black rounded-md overflow-hidden mx-auto">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={!isPreviewMode}
                    controls={isPreviewMode}
                    controlsList="nodownload"
                    className={cn(
                      "absolute inset-0 w-full h-full object-cover",
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
                    <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded-md text-xs flex items-center gap-1 z-10">
                      <Timer className="h-3 w-3 text-red-500 animate-pulse" />
                      <span className="font-mono">{formatTime(recordingTime)}</span>
                    </div>
                  )}
                  {/* Audio Level Indicator */}
                  {(isPreviewActive || isRecording) && !isPreviewMode && (
                    <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded-full flex items-center gap-1.5 z-10">
                      <Mic className={cn(
                        "h-3 w-3",
                        audioLevel > 50 ? "text-green-400" : "text-gray-400",
                        audioLevel > 50 && "animate-pulse"
                      )} />
                      <div className="w-12 h-1 bg-gray-600 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all duration-100"
                          style={{ width: `${Math.min(100, (audioLevel / 128) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {/* Countdown Overlay */}
                  {countdownValue !== null && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                      <span className="text-white text-6xl md:text-8xl font-bold animate-pulse">
                        {countdownValue}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Controls Section - Add margin top and minimum height */}
              <div className="flex flex-wrap justify-center gap-2 md:gap-4 mt-4 py-2 shrink-0 min-h-[60px]">
                {!isRecording && !isPreviewMode && processingState === 'idle' && (
                  <div className="flex gap-4">
                    <Button 
                      onClick={startCountdown} 
                      size="lg"
                      className="h-11 px-5 rounded-full text-sm"
                      disabled={countdownValue !== null || !selectedResolution || !selectedVideoDevice}
                    >
                      <Video className="mr-2 h-4 w-4" />
                      Start Recording
                    </Button>
                    <Button 
                      onClick={handleCancel} 
                      size="lg" 
                      variant="ghost"
                      className="h-11 px-5 rounded-full text-sm"
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
                      className="h-11 px-5 rounded-full text-sm"
                    >
                      {isPaused ? <Play className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}
                      {isPaused ? 'Resume' : 'Pause'}
                    </Button>
                    <Button 
                      onClick={handleComplete}
                      size="lg"
                      variant="destructive"
                      className="h-11 px-5 rounded-full text-sm bg-red-600 hover:bg-red-700"
                    >
                      <Square className="mr-2 h-4 w-4" />
                      End Recording
                    </Button>
                    <Button 
                      onClick={handleCancel} 
                      size="lg" 
                      variant="ghost"
                      className="h-11 px-5 rounded-full text-sm"
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
                      className="h-11 px-5 rounded-full text-sm"
                    >
                      Save Recording
                    </Button>
                    <Button 
                      onClick={handleRetake} 
                      size="lg" 
                      variant="outline"
                      className="h-11 px-5 rounded-full text-sm"
                    >
                      Record Again
                    </Button>
                    <Button 
                      onClick={handleCancel} 
                      size="lg" 
                      variant="ghost"
                      className="h-11 px-5 rounded-full text-sm"
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

