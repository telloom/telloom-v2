// components/RecordingInterface.tsx
// This component provides the user interface for recording videos, including device selection and recording controls.
'use client';

import { useState, useRef, useEffect } from 'react';
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

export interface RecordingInterfaceProps {
  onComplete: (videoBlob: Blob) => Promise<void>;
  onCancel: () => void;
  onClose: () => void;
  onSave: (videoBlob: Blob) => Promise<void>;
}

interface MediaDevice {
  deviceId: string;
  label: string;
}

export function RecordingInterface({ onComplete, onCancel, onClose, onSave }: RecordingInterfaceProps) {
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    };
  }, []);

  const startPreview = async (videoDeviceId?: string, audioDeviceId?: string) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: videoDeviceId || selectedVideoDevice },
        audio: { deviceId: audioDeviceId || selectedAudioDevice }
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setIsPreviewActive(true);
      setError(null);
    } catch (err) {
      console.error('Error starting preview:', err);
      setError('Unable to start camera preview. Please check your device settings.');
    }
  };

  const startRecording = async () => {
    try {
      if (!isPreviewActive) {
        await startPreview();
      }

      if (!streamRef.current) {
        throw new Error('No media stream available');
      }

      // Clear any existing recorded video
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
        setRecordedVideoUrl(null);
      }
      setRecordedChunks([]);
      setRecordingTime(0);
      setIsPreviewMode(false);

      // Try to use the most compatible codec
      let mimeType = 'video/webm';
      if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
        mimeType = 'video/webm;codecs=h264';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
        mimeType = 'video/webm;codecs=vp8';
      }

      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType,
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedChunks((prev) => [...prev, event.data]);
        }
      };

      // Start the recording timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      mediaRecorder.start(1000); // Record in 1-second chunks
      setIsRecording(true);
      setError(null);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Unable to start recording. Please check your device settings.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setIsRecording(false);

      // Create preview when recording stops
      mediaRecorderRef.current.onstop = () => {
        try {
          // Stop the live stream first
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
          }

          // Create a new blob with proper MIME type
          const blob = new Blob(recordedChunks, { 
            type: mediaRecorderRef.current?.mimeType || 'video/webm'
          });
          
          // Create object URL
          const url = URL.createObjectURL(blob);
          setRecordedVideoUrl(url);
          setIsPreviewMode(true);
          
          // Switch video source to recorded video
          if (videoRef.current) {
            videoRef.current.srcObject = null;
            videoRef.current.src = url;
            videoRef.current.muted = false;
            
            // Play the preview
            videoRef.current.load(); // Force reload with new source
            videoRef.current.play()
              .then(() => {
                setIsPlayingPreview(true);
              })
              .catch((playError) => {
                console.error('Error playing preview:', playError);
                setError('Unable to play video preview. Please try recording again.');
              });
          }
        } catch (err) {
          console.error('Error creating video preview:', err);
          setError('Failed to create video preview. Please try recording again.');
        }
      };
    }
  };

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
    if (recordedChunks.length > 0) {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      try {
        await onComplete(blob);
        await onSave(blob);
      } catch (err) {
        console.error('Error saving video:', err);
        setError('Failed to save video. Please try again.');
      }
    }
  };

  const handleCancel = () => {
    stopRecording();
    setRecordedChunks([]);
    setRecordingTime(0);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
      setRecordedVideoUrl(null);
    }
    setIsPreviewMode(false);
    setIsPreviewActive(false);
    onCancel();
    onClose();
  };

  const handleRerecord = async () => {
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
      setRecordedVideoUrl(null);
    }
    setRecordedChunks([]);
    setRecordingTime(0);
    setIsPreviewMode(false);
    await startPreview();
  };

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

    // Check if file is a video
    if (!file.type.startsWith('video/')) {
      setError('Please upload a video file.');
      return;
    }

    // Check file size (e.g., max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      setError('File size should be less than 100MB.');
      return;
    }

    try {
      await onComplete(file);
      await onSave(file);
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload video file.');
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-md">
            {error}
          </div>
        )}

        {/* Device Selection */}
        <div className={cn("space-y-4", (isRecording || isPreviewMode) && "opacity-50 pointer-events-none")}>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="camera">Camera</Label>
              <Select
                value={selectedVideoDevice}
                onValueChange={(value) => {
                  setSelectedVideoDevice(value);
                  startPreview(value, selectedAudioDevice);
                }}
                disabled={isRecording || isPreviewMode}
              >
                <SelectTrigger>
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
              <Label htmlFor="microphone">Microphone</Label>
              <Select
                value={selectedAudioDevice}
                onValueChange={(value) => {
                  setSelectedAudioDevice(value);
                  startPreview(selectedVideoDevice, value);
                }}
                disabled={isRecording || isPreviewMode}
              >
                <SelectTrigger>
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

        {/* Video Preview with Timer Overlay */}
        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={!isPreviewMode}
            controls={isPreviewMode}
            controlsList="nodownload"
            className="w-full h-full object-cover"
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
          {isRecording && (
            <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full flex items-center gap-2 z-10">
              <Timer className="h-4 w-4 text-red-500 animate-pulse" />
              <span className="font-mono">{formatTime(recordingTime)}</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4">
          {!isRecording && !isPreviewMode && (
            <div className="flex gap-4">
              <Button onClick={startRecording} size="lg">
                <Video className="mr-2 h-5 w-5" />
                Start Recording
              </Button>
              <div className="relative">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-5 w-5" />
                  Upload Video
                </Button>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {isRecording && (
            <>
              <Button onClick={togglePause} variant="outline" size="lg">
                {isPaused ? (
                  <Circle className="mr-2 h-5 w-5 fill-current" />
                ) : (
                  <Square className="mr-2 h-5 w-5" />
                )}
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
              <Button onClick={handleComplete} size="lg">
                <Square className="mr-2 h-5 w-5" />
                Stop Recording
              </Button>
              <Button onClick={handleCancel} variant="ghost" size="lg">
                <X className="mr-2 h-5 w-5" />
                Cancel
              </Button>
            </>
          )}

          {isPreviewMode && (
            <>
              <Button onClick={togglePreviewPlayback} variant="outline" size="lg">
                {isPlayingPreview ? (
                  <>
                    <Pause className="mr-2 h-5 w-5" />
                    Pause Preview
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-5 w-5" />
                    Play Preview
                  </>
                )}
              </Button>
              <Button onClick={handleSave} size="lg">
                <Save className="mr-2 h-5 w-5" />
                Save Video
              </Button>
              <Button onClick={handleRerecord} variant="outline" size="lg">
                <RotateCcw className="mr-2 h-5 w-5" />
                Record Again
              </Button>
              <Button onClick={handleCancel} variant="ghost" size="lg">
                <X className="mr-2 h-5 w-5" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

