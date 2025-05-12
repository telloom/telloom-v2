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

interface UploadPopupProps {
  open: boolean;
  onClose: () => void;
  promptId: string;
  onUploadSuccess: (playbackId: string) => Promise<void>;
  targetSharerId: string;
}

export function UploadPopup({
  open,
  onClose,
  promptId,
  onUploadSuccess,
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
          <UploadInterface
            promptId={promptId}
            onUploadSuccess={async (videoId, playbackId) => {
              if (onUploadSuccess) {
                await onUploadSuccess(playbackId);
              }
            }}
            targetSharerId={targetSharerId}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}