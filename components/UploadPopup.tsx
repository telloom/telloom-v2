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
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface UploadPopupProps {
  open: boolean;
  onClose: () => void;
  promptText?: string;
  promptId?: string;
  onComplete?: (videoBlob: Blob) => void;
  onSave?: (videoBlob: Blob) => void;
  onUploadSuccess?: () => void;
}

export function UploadPopup({
  open,
  onClose,
  promptText,
  promptId,
  onComplete,
  onSave,
  onUploadSuccess
}: UploadPopupProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="p-4 pr-14 relative">
          <DialogTitle className="text-lg font-semibold text-left pr-8">
            {promptText || "Upload a video response to the prompt"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center p-4 relative overflow-hidden">
          <div className="flex items-center justify-center">
            <UploadInterface
              onClose={onClose}
              onComplete={onComplete}
              onSave={onSave}
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