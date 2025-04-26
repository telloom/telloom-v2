// components/UploadPopup.tsx
// This component provides a modal dialog for video upload

'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { UploadInterface } from './UploadInterface';
import { MuxPlayer } from './MuxPlayer';

interface UploadPopupProps {
  open: boolean;
  onClose: () => void;
  promptText: string;
  promptId: string;
  onUploadSuccess: (muxId: string) => Promise<void>;
  showSuccessView?: boolean;
  muxPlaybackId?: string;
  targetSharerId: string;
}

export function UploadPopup({
  open,
  onClose,
  promptText,
  promptId,
  onUploadSuccess,
  showSuccessView = false,
  muxPlaybackId,
  targetSharerId
}: UploadPopupProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-6 m-4 overflow-hidden" aria-describedby="upload-dialog-description">
        <DialogHeader>
          <DialogTitle>Upload Video</DialogTitle>
          <DialogDescription id="upload-dialog-description">
            Record or upload a video response to share with your family.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center p-4 relative flex-1 min-h-0 overflow-auto">
          {showSuccessView && muxPlaybackId ? (
            <div className="flex flex-col items-center justify-center flex-1 min-h-0">
              <div className="relative w-full max-w-[800px]" style={{ width: 'min(60vw, calc(55vh * 16/9))' }}>
                <div className="w-full">
                  <div className="aspect-video bg-black rounded-md overflow-hidden relative">
                    <div className="absolute inset-0">
                      <MuxPlayer playbackId={muxPlaybackId} />
                    </div>
                  </div>
                  <div className="text-sm text-[#16A34A] bg-[#DCFCE7] p-3 rounded-md text-center mt-4 w-full">
                    Video uploaded and processed successfully! You can close this popup when you're done reviewing your video.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <UploadInterface
              promptId={promptId}
              onUploadSuccess={async (videoId, playbackId) => {
                if (onUploadSuccess) {
                  await onUploadSuccess(playbackId);
                }
              }}
              promptText={promptText}
              targetSharerId={targetSharerId}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}