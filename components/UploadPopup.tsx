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
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" aria-describedby="upload-popup-description">
        <DialogHeader>
          <DialogTitle>Upload Video</DialogTitle>
          <DialogDescription id="upload-popup-description">Record or upload a video response to share with your family.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto">
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