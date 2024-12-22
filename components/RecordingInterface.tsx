// components/RecordingInterface.tsx
// This component provides the user interface for recording videos, including device selection and recording controls.
'use client';

import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Video, X, Square, Circle } from 'lucide-react';

interface Prompt {
  id: string;
  promptText: string;
  promptType: string;
  isContextEstablishing: boolean;
  promptCategoryId: string;
  videos: any[];
}

export interface RecordingInterfaceProps {
  prompt: Prompt;
  onComplete: (videoBlob: Blob) => Promise<void>;
  onCancel: () => void;
  onClose: () => void;
  onSave: (videoBlob: Blob) => Promise<void>;
}

export function RecordingInterface({ prompt, onComplete, onCancel, onClose, onSave }: RecordingInterfaceProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedChunks((prev) => [...prev, event.data]);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const togglePause = () => {
    if (mediaRecorderRef.current) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
      } else {
        mediaRecorderRef.current.pause();
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
    onCancel();
    onClose();
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex justify-center gap-4">
          {!isRecording ? (
            <Button onClick={startRecording} size="lg">
              <Video className="mr-2 h-5 w-5" />
              Start Recording
            </Button>
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

