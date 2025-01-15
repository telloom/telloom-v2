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
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  children
}: VideoPopupProps) {
  // Add cleanup on close
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-6 m-4 overflow-hidden" aria-describedby="video-dialog-description">
        <DialogHeader>
          <DialogTitle>{promptText}</DialogTitle>
          <DialogDescription id="video-dialog-description">
            {videoId ? "Watch and respond to the video prompt." : "Record your video response."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center p-4 relative flex-1 min-h-0 overflow-auto">
          {/* Navigation buttons */}
          {hasPrevious && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-6 top-1/2 -translate-y-1/2 z-10"
              onClick={onPrevious}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}
          {hasNext && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-6 top-1/2 -translate-y-1/2 z-10"
              onClick={onNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}

          {/* Content area */}
          <div className="flex items-center justify-center w-full">
            {children || (videoId && (
              <div className="relative w-full max-w-[800px]" style={{ width: 'min(60vw, calc(55vh * 16/9))' }}>
                <div className="w-full">
                  <div className="aspect-video bg-black rounded-md overflow-hidden relative">
                    <div className="absolute inset-0">
                      <MuxPlayer playbackId={videoId} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
