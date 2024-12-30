// components/VideoPopup.tsx
// This component provides a modal dialog for both video recording and playback
'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import VideoPlayer from './VideoPlayer';

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
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full h-[90vh] max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 shrink-0">
          <DialogTitle className="text-lg font-semibold">{promptText}</DialogTitle>
          <DialogDescription className="sr-only">
            Video playback for the prompt: {promptText}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 flex items-center justify-center p-4 relative min-h-0">
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
          <div className="w-full h-full rounded-lg overflow-hidden bg-black flex items-center justify-center">
            {children || (videoId && <VideoPlayer playbackId={videoId} />)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
