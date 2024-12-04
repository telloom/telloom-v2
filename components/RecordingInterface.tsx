// components/RecordingInterface.tsx
// This component provides the user interface for recording videos, including device selection and recording controls.
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Prompt } from '@/types/models';
import { Play, Pause, StopCircle, RotateCcw, Save, Mic, Upload } from 'lucide-react';

interface RecordingInterfaceProps {
  prompt: Prompt;
  onClose: () => void;
  onSave: (videoBlob: Blob | File) => void; // Updated type
}

export function RecordingInterface({ prompt, onClose, onSave }: RecordingInterfaceProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<{ video: MediaDeviceInfo[], audio: MediaDeviceInfo[] }>({ video: [], audio: [] });
  const [selectedVideo, setSelectedVideo] = useState<string>('default');
  const [selectedAudio, setSelectedAudio] = useState<string>('default');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null); // Added state

  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Added state


  useEffect(() => {
    const getDevices = async () => {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setDevices({
        video: devices.filter(device => device.kind === 'videoinput'),
        audio: devices.filter(device => device.kind === 'audioinput')
      });
    };

    getDevices();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [stream]);

  const startCamera = useCallback(async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      const constraints = {
        video: selectedVideo === 'default' ? true : { deviceId: { exact: selectedVideo } },
        audio: selectedAudio === 'default' ? true : { deviceId: { exact: selectedAudio } }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = mediaStream;
        await liveVideoRef.current.play();
      }

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(mediaStream);
      microphone.connect(analyser);
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkAudioActivity = () => {
        if (!audioContextRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        setIsAudioActive(average > 10);
        if (!isRecording) {
          requestAnimationFrame(checkAudioActivity);
        }
      };

      checkAudioActivity();
    } catch (err) {
      console.error("Error accessing the camera:", err);
    }
  }, [selectedVideo, selectedAudio, stream, isRecording]);

  useEffect(() => {
    if (selectedVideo && selectedAudio) {
      startCamera();
    }
  }, [selectedVideo, selectedAudio, startCamera]);

  const startCountdown = () => {
    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown((prevCount) => {
        if (prevCount === 1) {
          clearInterval(countdownInterval);
          startRecording();
          return null;
        }
        return prevCount ? prevCount - 1 : null;
      });
    }, 1000);
  };

  const startRecording = () => {
    if (!stream) return;

    chunksRef.current = [];
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    try {
      const options = {
        mimeType: 'video/webm;codecs=vp8,opus'
      };
      const mediaRecorder = new MediaRecorder(stream, options);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        
        if (previewVideoRef.current) {
          previewVideoRef.current.src = url;
          previewVideoRef.current.load();
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms for smoother recording
      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - (recordingStartTimeRef.current || 0)) / 1000));
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - (recordingStartTimeRef.current || 0)) / 1000));
      }, 1000);
    }
  };

  const resetRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsPaused(false);
    setRecordedBlob(null);
    setUploadedFile(null); // Clear uploaded file
    chunksRef.current = [];
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    setRecordingDuration(0);
    startCamera();
  };

  const handleSave = () => {
    if (recordedBlob) {
      onSave(recordedBlob);
    } else if (uploadedFile) {
      onSave(uploadedFile);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setRecordedBlob(null); // Clear any existing recorded blob
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-gray-900">Recording Prompt</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-lg text-gray-700">{prompt.promptText}</p>
        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative">
          {(previewUrl || uploadedFile) ? (
            <video
              ref={previewVideoRef}
              controls
              playsInline
              className="w-full h-full object-cover"
              src={previewUrl ?? undefined}
            />
          ) : (
            <video
              ref={liveVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}
          {!previewUrl && !uploadedFile && ( // Updated condition
            <div className={`absolute bottom-2 right-2 p-2 rounded-full ${isAudioActive ? 'bg-green-500' : 'bg-gray-300'}`}>
              <Mic className="h-4 w-4 text-white" />
            </div>
          )}
          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white text-6xl font-bold">
              {countdown}
            </div>
          )}
          {isRecording && (
            <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-md text-sm font-semibold">
              {formatTime(recordingDuration)}
            </div>
          )}
        </div>
        <div className="flex space-x-4">
          <Select onValueChange={setSelectedVideo} value={selectedVideo}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select camera" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default Camera</SelectItem>
              {devices.video.map(device => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${device.deviceId}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={setSelectedAudio} value={selectedAudio}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select microphone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default Microphone</SelectItem>
              {devices.audio.map(device => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${device.deviceId}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="video/*"
            className="hidden"
            aria-label="Upload video file"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="bg-white text-[#1B4332] border-[#1B4332] hover:bg-[#1B4332]/10"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Recording
          </Button>
          {!isRecording && !previewUrl && !uploadedFile && ( // Updated condition
            <Button onClick={startCountdown} className="bg-[#1B4332] hover:bg-[#1B4332]/90 text-white">
              <Play className="mr-2 h-4 w-4" />
              Start Recording
            </Button>
          )}
          {isRecording && !isPaused && (
            <Button onClick={pauseRecording} variant="outline">
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </Button>
          )}
          {isRecording && isPaused && (
            <Button onClick={resumeRecording} variant="outline">
              <Play className="mr-2 h-4 w-4" />
              Resume
            </Button>
          )}
          {isRecording && (
            <Button onClick={stopRecording} variant="destructive">
              <StopCircle className="mr-2 h-4 w-4" />
              Stop
            </Button>
          )}
          {(previewUrl || uploadedFile) && ( // Updated condition
            <Button onClick={handleSave} className="bg-[#1B4332] hover:bg-[#1B4332]/90 text-white">
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
          )}
          {(isRecording || previewUrl || uploadedFile) && ( // Updated condition
            <Button onClick={resetRecording} variant="ghost">
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          )}
        </div>
        <Button onClick={onClose} variant="ghost">Cancel</Button>
      </CardFooter>
    </Card>
  );
}

