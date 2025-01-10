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
  promptText?: string;
  onComplete?: () => void;
  onUploadSuccess?: () => void;
}

export function UploadPopup({
  open,
  onClose,
  promptId,
  promptText = "Upload a video response to the prompt",
  onComplete,
  onUploadSuccess
}: UploadPopupProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pr-14 relative">
          <DialogTitle className="text-lg font-semibold text-left pr-8">
            {promptText}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Record or upload a video response to share your story.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <UploadInterface
            promptId={promptId}
            onUploadSuccess={onUploadSuccess}
            onComplete={onComplete}
            promptText={promptText}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}