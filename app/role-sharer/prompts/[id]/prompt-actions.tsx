'use client';

import { Button } from "@/components/ui/button";
import { Video as VideoIcon, Play, Upload, Paperclip } from 'lucide-react';
import { VideoPopup } from '@/components/VideoPopup';
import { RecordingInterface } from '@/components/RecordingInterface';
import { UploadPopup } from '@/components/UploadPopup';
import { AttachmentUpload } from '@/components/AttachmentUpload';
import { useState } from 'react';

interface PromptActionsProps {
  hasVideo: boolean;
  attachmentCount: number;
  promptId: string;
  responseId?: string;
}

export function PromptActions({ hasVideo, attachmentCount, promptId, responseId }: PromptActionsProps) {
  const [showVideoPopup, setShowVideoPopup] = useState(false);
  const [showRecordingInterface, setShowRecordingInterface] = useState(false);
  const [showUploadPopup, setShowUploadPopup] = useState(false);
  const [showAttachmentUpload, setShowAttachmentUpload] = useState(false);

  if (hasVideo) {
    return (
      <>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowVideoPopup(true)}
            className="bg-[#1B4332] hover:bg-[#1B4332]/90 rounded-full"
          >
            <Play className="mr-2 h-4 w-4" />
            Watch
          </Button>
          <Button
            onClick={() => setShowAttachmentUpload(true)}
            variant="outline"
            className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full"
          >
            <Paperclip className="mr-2 h-4 w-4" />
            {attachmentCount} Attachments
          </Button>
        </div>

        {showVideoPopup && responseId && (
          <VideoPopup
            responseId={responseId}
            onClose={() => setShowVideoPopup(false)}
          />
        )}

        {showAttachmentUpload && responseId && (
          <AttachmentUpload
            responseId={responseId}
            onClose={() => setShowAttachmentUpload(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="flex gap-2">
        <Button
          onClick={() => setShowRecordingInterface(true)}
          variant="outline"
          className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full"
        >
          <VideoIcon className="mr-2 h-4 w-4" />
          Record
        </Button>
        <Button
          onClick={() => setShowUploadPopup(true)}
          variant="outline"
          className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full"
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload
        </Button>
      </div>

      {showRecordingInterface && (
        <RecordingInterface
          promptId={promptId}
          onClose={() => setShowRecordingInterface(false)}
        />
      )}

      {showUploadPopup && (
        <UploadPopup
          promptId={promptId}
          open={showUploadPopup}
          onClose={() => setShowUploadPopup(false)}
          onComplete={() => setShowUploadPopup(false)}
        />
      )}
    </>
  );
} 