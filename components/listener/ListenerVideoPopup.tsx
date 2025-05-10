// components/listener/ListenerVideoPopup.tsx
// LISTENER-SPECIFIC: Provides a modal dialog ONLY for video playback.
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
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { MuxPlayer } from '../MuxPlayer';

// Interface Props adjusted for Listener playback only
interface ListenerVideoPopupProps {
  open: boolean;
  onClose: () => void;
  promptText: string; // Title/context for the video
  videoId: string; // Mux Playback ID is required for playback
  onNext?: () => void; // For playlist navigation
  onPrevious?: () => void; // For playlist navigation
  hasNext?: boolean;
  hasPrevious?: boolean;
  // Removed props related to recording/uploading/completion/restart
  // Removed children prop as it's not used for playback only
}

export function ListenerVideoPopup({
  open,
  onClose,
  promptText,
  videoId,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
}: ListenerVideoPopupProps) {

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  // Prevent clicks inside content from closing the dialog accidentally
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
                Watch the video response.
              </DialogDescription>
            </div>
            {/* Removed progress indicator as it was tied to playlist/recording */}
          </div>
        </DialogHeader>
        <DialogClose className="absolute right-3 top-3 md:right-4 md:top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-20">
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </DialogClose>
        <div className="flex-1 min-h-0 flex items-center justify-center p-1 sm:p-2 relative">
          {/* Navigation buttons for playlist */}
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

          {/* Video Player Area */}
          <div className="flex items-center justify-center w-full h-full">
            {videoId ? ( // Ensure videoId exists before rendering player
              <div className="relative aspect-video bg-black rounded-md overflow-hidden w-auto max-w-full h-auto max-h-full">
                <div className="absolute inset-0">
                  <MuxPlayer
                    playbackId={videoId} // Pass the videoId prop here
                  />
                </div>
              </div>
            ) : (
              // Optional: Add a placeholder or message if videoId is missing
              <div className="text-muted-foreground">Video not available.</div>
            )}
            {/* Removed completion message/restart button */}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 