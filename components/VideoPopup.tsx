// components/VideoPopup.tsx
// This component provides a modal dialog for video recording/playback.
'use client';

import React, { useCallback, useState, useEffect, useRef } from 'react';
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
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  onVideoEnd
}: VideoPopupProps) {
  const actualMuxPlayerRef = useRef<any>(null);
  const [playerReady, setPlayerReady] = useState(false);

  useEffect(() => {
    if (open && videoId && playerReady && actualMuxPlayerRef.current) {
      // Try to play the video
      actualMuxPlayerRef.current.play?.();
    }
  }, [open, videoId, playerReady]);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
    }
  };

  const handleContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const dialogHeaderContent = () => (
    <div className='flex items-center justify-between w-full'>
      <div className="flex-1 min-w-0 pr-8">
        <DialogTitle className="whitespace-normal break-words text-left">{promptText}</DialogTitle>
        <DialogDescription id="video-dialog-description" className="text-left sr-only">
          {/* Screen reader description, visually empty when videoId is present */}
          {videoId && !children ? "Video player" : "Record your video response."}
        </DialogDescription>
      </div>
      {showProgress && currentVideo && totalVideos && (
        <div className="bg-[#8fbc55] text-[#1B4332] px-3 py-1 rounded-full text-xs font-semibold ml-2 sm:ml-4 shrink-0">
          {currentVideo}/{totalVideos}
        </div>
      )}
    </div>
  );

  const PlayerAreaContentComponent = () => {
    if (children && !videoId) {
      return <div className="p-4 flex-grow w-full flex items-center justify-center">{children}</div>;
    }

    if (showCompletionMessage) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-4 text-center">
          <CheckCircle2 size={48} className="text-green-500 mb-4" />
          <p className="text-lg font-semibold">Video marked as watched!</p>
          <p className="text-sm text-muted-foreground">You can now close this window.</p>
        </div>
      );
    }

    if (videoId && !showCompletionMessage) {
      return (
        // This container defines the aspect ratio for the MuxPlayer.
        <div
          className="w-full bg-black relative rounded-lg overflow-hidden"
          style={{
            aspectRatio: '16/9', // Enforce 16:9 aspect ratio
            maxHeight: '70vh' // Explicitly constrain the max height of this aspect ratio box
          }}
          key={`mux-player-aspect-container-${videoId}`}
        >
          <MuxPlayer
            ref={actualMuxPlayerRef}
            key={`mux-player-${videoId}`}
            playbackId={videoId}
            autoFocus={true} 
            autoplay={true}
            playsinline={false} 
            onPlayerReady={() => {
              setPlayerReady(true);
              console.log('[VideoPopup MUXPLAYER] MuxPlayer onPlayerReady. Ref:', actualMuxPlayerRef.current);
            }}
            onPlay={() => console.log(`[VideoPopup MUXPLAYER] onPlay event for ${videoId}`)}
            onPause={() => console.log(`[VideoPopup MUXPLAYER] onPause event for ${videoId}`)}
            onEnded={onVideoEnd}
            // Player fills its constrained aspect-ratio defined parent container.
            style={{ 
              display: 'block', 
              width: '100%', 
              height: '100%', // Fill the parent which has aspectRatio and maxHeight
              position: 'absolute', 
              top: 0, 
              left: 0 
            }}
          />
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center min-h-[200px] text-muted-foreground p-4">
        No video content available.
      </div>
    );
  };
  
  const navigationButtons = (
    // Positioned absolutely over the player aspect ratio container
    <>
      {hasPrevious && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/60 text-white rounded-full p-2"
          onClick={(e) => {
            e.stopPropagation();
            onPrevious?.();
          }}
          aria-label="Previous video"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
      )}
      {hasNext && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/60 text-white rounded-full p-2"
          onClick={(e) => {
            e.stopPropagation();
            onNext?.();
          }}
          aria-label="Next video"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      )}
    </>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={true}>
      <DialogContent
        className={cn(
          "w-[95vw] max-w-3xl flex flex-col bg-white rounded-lg shadow-xl p-0", // Changed max-w-5xl to max-w-3xl
          "max-h-[90vh] sm:max-h-[85vh]", // Max height, allows shrinking
        )}
        aria-describedby="video-dialog-description"
      >
        <DialogHeader className="p-3 sm:p-4 relative min-h-[60px] sm:min-h-[70px]">
          {dialogHeaderContent()}
          {/* The default X button from DialogContent should be visible */}
        </DialogHeader>
        
        {/* Scrollable main content area - padding removed */}
        <div 
          className="flex-1 flex flex-col items-center justify-center min-h-0 overflow-y-auto"
          onClick={handleContentClick}
        >
          {/* Wrapper to control max-width of player and center it */}
          <div className="w-full max-w-3xl relative"> {/* max-w- controls video width on large screens, adjust as needed */}
            <PlayerAreaContentComponent />
            {/* Navigation buttons are placed here to overlay the PlayerAreaContentComponent */}
            {videoId && !children && !showCompletionMessage && navigationButtons}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
