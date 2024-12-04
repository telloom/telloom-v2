// components/VideoPopup.tsx
// This component displays a popup with video playback controls and navigation buttons.

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef } from "react"

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
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.play();
    }
  }, [isOpen, videoId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{promptText}</DialogTitle>
        </DialogHeader>
        <div className="aspect-video relative">
          <video
            ref={videoRef}
            src={`https://stream.mux.com/${videoId}`}
            className="w-full h-full"
            controls
          />
          <div className="absolute top-1/2 left-0 right-0 transform -translate-y-1/2 flex justify-between px-4">
            <Button
              variant="outline"
              size="icon"
              onClick={onPrevious}
              disabled={!hasPrevious}
              className="bg-white/80 hover:bg-white"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous video</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={onNext}
              disabled={!hasNext}
              className="bg-white/80 hover:bg-white"
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

