// components/VideoPopup.tsx
// This component provides a modal dialog for both video recording and playback
'use client';

import React, { useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { MuxPlayer } from './MuxPlayer';

interface VideoPopupProps {
  open: boolean;
  onClose: () => void;
  promptText: string;
  videoId?: string;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
  children?: React.ReactNode;
  showProgress?: boolean;
  currentVideo?: number;
  totalVideos?: number;
  showCompletionMessage?: boolean;
  onRestart?: () => void;
  onVideoEnd?: () => void;
}

export function VideoPopup({
  open,
  onClose,
  promptText,
  videoId,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
  children,
  showProgress = false,
  currentVideo,
  totalVideos,
  showCompletionMessage = false,
  onRestart,
  onVideoEnd
}: VideoPopupProps) {
  // Add cleanup on close
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  const handleContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-5xl h-[90vh] flex flex-col p-6 m-4 overflow-hidden" 
        aria-describedby="video-dialog-description"
        onClick={handleContentClick}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{promptText}</DialogTitle>
              <DialogDescription id="video-dialog-description">
                {videoId ? "Watch and respond to the video prompt." : "Record your video response."}
              </DialogDescription>
            </div>
            {showProgress && currentVideo && totalVideos && (
              <div className="bg-[#8fbc55] text-[#1B4332] px-4 py-1.5 rounded-full text-sm font-semibold">
                {currentVideo}/{totalVideos}
              </div>
            )}
          </div>
        </DialogHeader>
        <div className="flex items-center justify-center p-4 relative flex-1 min-h-0 overflow-auto">
          {/* Navigation buttons */}
          {hasPrevious && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-6 top-1/2 -translate-y-1/2 z-10"
              onClick={(e) => {
                e.stopPropagation();
                onPrevious?.();
              }}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}
          {hasNext && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-6 top-1/2 -translate-y-1/2 z-10"
              onClick={(e) => {
                e.stopPropagation();
                onNext?.();
              }}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}

          {/* Content area */}
          <div className="flex items-center justify-center w-full">
            {children || (videoId && !showCompletionMessage && (
              <div className="relative w-full max-w-[800px] video-popup-player-width">
                <div className="w-full">
                  <div className="aspect-video bg-black rounded-md overflow-hidden relative">
                    <div className="absolute inset-0">
                      <MuxPlayer 
                        playbackId={videoId} 
                        onEnded={onVideoEnd}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {showCompletionMessage && (
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-4">You&apos;ve watched all responses!</h3>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRestart?.();
                  }}
                  className="rounded-full bg-[#1B4332] hover:bg-[#1B4332]/90"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Start Over
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
