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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from 'lucide-react'; // Removed RotateCcw as restart isn't needed for simple playback
import { MuxPlayer } from '../MuxPlayer'; // Adjusted path assuming MuxPlayer is in parent dir

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
        className="max-w-5xl h-[90vh] flex flex-col p-6 m-4 overflow-hidden"
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
        <div className="flex items-center justify-center p-4 relative flex-1 min-h-0 overflow-auto">
          {/* Navigation buttons for playlist */}
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

          {/* Video Player Area */}
          <div className="flex items-center justify-center w-full">
            {videoId ? ( // Ensure videoId exists before rendering player
              <div className="relative w-full max-w-[800px]" style={{ width: 'min(60vw, calc(55vh * 16/9))' }}>
                <div className="w-full">
                  <div className="aspect-video bg-black rounded-md overflow-hidden relative">
                    <div className="absolute inset-0">
                      <MuxPlayer
                        playbackId={videoId} // Pass the videoId prop here
                        // Removed onEnded prop if not needed for simple playback or playlist handled differently
                      />
                    </div>
                  </div>
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