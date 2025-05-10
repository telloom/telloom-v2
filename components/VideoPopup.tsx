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
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RotateCcw, X } from 'lucide-react';
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
        className="w-full max-w-5xl h-[95vh] sm:h-[90vh] flex flex-col p-3 md:p-4 lg:p-6 overflow-hidden rounded-lg shadow-xl"
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
              <div className="bg-[#8fbc55] text-[#1B4332] px-4 py-1.5 rounded-full text-sm font-semibold ml-2 shrink-0">
                {currentVideo}/{totalVideos}
              </div>
            )}
          </div>
        </DialogHeader>
        <DialogClose className="absolute right-3 top-3 md:right-4 md:top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-20">
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </DialogClose>
        <div className="flex-1 min-h-0 flex items-center justify-center p-1 sm:p-2 relative">
          {/* Navigation buttons */}
          {hasPrevious && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-10 bg-black/30 hover:bg-black/50 text-white rounded-full p-2"
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
              className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-10 bg-black/30 hover:bg-black/50 text-white rounded-full p-2"
              onClick={(e) => {
                e.stopPropagation();
                onNext?.();
              }}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}

          {/* Content area */}
          <div className="flex items-center justify-center w-full h-full">
            {children || (videoId && !showCompletionMessage && (
              <div className="relative aspect-video bg-black rounded-md overflow-hidden w-auto max-w-full h-auto max-h-full">
                <div className="absolute inset-0">
                  <MuxPlayer
                    playbackId={videoId}
                    onEnded={onVideoEnd}
                  />
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
