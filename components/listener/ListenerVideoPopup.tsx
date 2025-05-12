// components/listener/ListenerVideoPopup.tsx
// LISTENER-SPECIFIC: Provides a modal dialog for video playback.
'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MuxPlayer } from '../MuxPlayer';
import { cn } from '@/lib/utils';

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
  onVideoEnd?: () => void; // Added to align with VideoPopup
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
  onVideoEnd, // Added
}: ListenerVideoPopupProps) {
  const actualMuxPlayerRef = useRef<any>(null);
  const [playerReady, setPlayerReady] = useState(false);

  useEffect(() => {
    console.log(`[ListenerVideoPopup AUTOPLAY useEffect] Fired. open: ${open}, videoId: ${!!videoId}, playerReady: ${playerReady}, ref_exists: ${!!actualMuxPlayerRef.current}`);
    if (open && videoId && playerReady && actualMuxPlayerRef.current) {
      console.log('[ListenerVideoPopup AUTOPLAY useEffect] Conditions met. Attempting to play...');
      actualMuxPlayerRef.current.play?.();
    } else {
      if (!open) console.log('[ListenerVideoPopup AUTOPLAY useEffect] Condition not met: open is false');
      if (!videoId) console.log('[ListenerVideoPopup AUTOPLAY useEffect] Condition not met: videoId is missing');
      if (!playerReady) console.log('[ListenerVideoPopup AUTOPLAY useEffect] Condition not met: playerReady is false');
      if (!actualMuxPlayerRef.current) console.log('[ListenerVideoPopup AUTOPLAY useEffect] Condition not met: actualMuxPlayerRef.current is null');
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
        <DialogDescription id="listener-video-dialog-description" className="text-left sr-only">
          Video player
        </DialogDescription>
      </div>
      {/* No progress indicator needed for listener popup */}
    </div>
  );

  const PlayerAreaContentComponent = () => {
    // Listener always has a videoId for playback
    return (
      <div
        className="w-full bg-black relative rounded-lg overflow-hidden"
        style={{
          aspectRatio: '16/9',
          maxHeight: '70vh',
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
            console.log('[ListenerVideoPopup MUXPLAYER] MuxPlayer onPlayerReady. Player should be ready now. Ref:', actualMuxPlayerRef.current);
          }}
          onPlay={() => console.log(`[ListenerVideoPopup MUXPLAYER] onPlay event for ${videoId}`)}
          onPause={() => console.log(`[ListenerVideoPopup MUXPLAYER] onPause event for ${videoId}`)}
          onEnded={onVideoEnd}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />
      </div>
    );
  };

  const navigationButtons = (
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
          "w-[95vw] max-w-3xl flex flex-col bg-white rounded-lg shadow-xl p-0",
          "max-h-[90vh] sm:max-h-[85vh]",
        )}
        aria-describedby="listener-video-dialog-description"
      >
        <DialogHeader className="p-3 sm:p-4 relative min-h-[60px] sm:min-h-[70px]">
          {dialogHeaderContent()}
        </DialogHeader>
        
        <div
          className="flex-1 flex flex-col items-center justify-center min-h-0 overflow-y-auto"
          onClick={handleContentClick}
        >
          <div className="w-full max-w-3xl relative">
            <PlayerAreaContentComponent />
            {navigationButtons}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 