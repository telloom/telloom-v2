// components/RecordingInterface.tsx
// This component provides the user interface for recording videos, including device selection and recording controls.
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Video, X, Square, Circle, Upload, Timer, Camera, Mic } from 'lucide-react';
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

      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp8,opus'
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

      mediaRecorder.start();
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
    if (recordedChunks.length > 0) {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      await onComplete(blob);
      await onSave(blob);
    }
  };

  const handleCancel = () => {
    stopRecording();
    setRecordedChunks([]);
    setRecordingTime(0);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsPreviewActive(false);
    onCancel();
    onClose();
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
        <div className={cn("space-y-4", isRecording && "opacity-50 pointer-events-none")}>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="camera">Camera</Label>
              <Select
                value={selectedVideoDevice}
                onValueChange={(value) => {
                  setSelectedVideoDevice(value);
                  startPreview(value, selectedAudioDevice);
                }}
                disabled={isRecording}
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
                disabled={isRecording}
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
            muted
            className="w-full h-full object-cover"
          />
          {isRecording && (
            <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full flex items-center gap-2">
              <Timer className="h-4 w-4 text-red-500 animate-pulse" />
              <span className="font-mono">{formatTime(recordingTime)}</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4">
          {!isRecording ? (
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
          ) : (
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
                Stop & Save
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

