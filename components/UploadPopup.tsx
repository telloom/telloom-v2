// components/UploadPopup.tsx
// This component provides a modal dialog for video upload

'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { UploadInterface } from '@/components/UploadInterface';

export interface UploadPopupProps {
  promptId: string;
  onClose: () => void;
  open: boolean;
}

export function UploadPopup({ promptId, onClose, open }: UploadPopupProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="p-4 pr-14 relative">
          <DialogTitle className="text-lg font-semibold text-left pr-8">
            {promptText || "Upload a video response to the prompt"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Record or upload a video response to share your story.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center p-4 relative overflow-hidden">
          <div className="flex items-center justify-center">
            <UploadInterface
              onClose={onClose}
              onComplete={onComplete}
              promptId={promptId}
              promptText={promptText}
              onUploadSuccess={onUploadSuccess}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}