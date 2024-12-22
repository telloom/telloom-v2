// components/VideoPopup.tsx
// This component displays a popup with video playback controls and navigation buttons.

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect } from "react"
import MuxPlayer from '@mux/mux-player-react'

interface VideoPopupProps {
  isOpen: boolean;
  onClose: () => void;
  promptText: string;
  videoId: string;
  onNext: () => void;
  onPrevious: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
}

export function VideoPopup({
  isOpen,
  onClose,
  promptText,
  videoId,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious
}: VideoPopupProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{promptText}</DialogTitle>
          <DialogDescription>
            Video response to the prompt. Use the arrow buttons or keyboard arrow keys to navigate between responses.
          </DialogDescription>
        </DialogHeader>
        <div className="aspect-video relative">
          <MuxPlayer
            streamType="on-demand"
            playbackId={videoId}
            autoPlay
            metadata={{
              video_id: videoId,
              video_title: promptText,
            }}
            className="w-full h-full rounded-lg overflow-hidden"
            accentColor="#8fbc55"
          />
          <div className="absolute top-1/2 left-0 right-0 transform -translate-y-1/2 flex justify-between px-4 pointer-events-none">
            <Button
              variant="outline"
              size="icon"
              onClick={onPrevious}
              disabled={!hasPrevious}
              className="bg-white/90 hover:bg-[#8fbc55] hover:border-[#8fbc55] pointer-events-auto transition-all duration-200 hover:scale-105"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous video</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={onNext}
              disabled={!hasNext}
              className="bg-white/90 hover:bg-[#8fbc55] hover:border-[#8fbc55] pointer-events-auto transition-all duration-200 hover:scale-105"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next video</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

