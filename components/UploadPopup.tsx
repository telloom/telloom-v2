// components/UploadPopup.tsx
// This component provides a modal dialog for video upload

'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { UploadInterface } from '@/components/UploadInterface';

interface UploadPopupProps {
  open: boolean;
  onClose: () => void;
  promptText?: string;
  promptId?: string;
  onComplete?: (videoBlob: Blob) => void;
  onSave?: (videoBlob: Blob) => void;
}

export function UploadPopup({
  open,
  onClose,
  promptText,
  promptId,
  onComplete,
  onSave
}: UploadPopupProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pr-14">
          <DialogTitle>
            {promptText || "Upload a video response to the prompt"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 flex items-center justify-center p-4 relative min-h-0">
          <div className="w-full h-full rounded-lg overflow-hidden flex items-center justify-center">
            <UploadInterface
              onClose={onClose}
              onComplete={onComplete}
              onSave={onSave}
              promptId={promptId}
              promptText={promptText}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}