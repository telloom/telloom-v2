'use client';

import { Button } from "@/components/ui/button";
import { Video as VideoIcon, Play, Upload, Paperclip } from 'lucide-react';
import { VideoPopup } from '@/components/VideoPopup';
import { RecordingInterface } from '@/components/RecordingInterface';
import { UploadPopup } from '@/components/UploadPopup';
import AttachmentUpload from '@/components/AttachmentUpload';
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface PromptActionsProps {
  hasVideo: boolean;
  attachmentCount: number;
  promptId: string;
  responseId?: string;
  muxPlaybackId?: string;
  targetSharerId: string;
}

export function PromptActions({ hasVideo, attachmentCount, promptId, responseId, muxPlaybackId, targetSharerId }: PromptActionsProps) {
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
            open={showVideoPopup}
            onClose={() => setShowVideoPopup(false)}
            promptText="Watch your response"
            videoId={muxPlaybackId || ""}
          />
        )}

        {showAttachmentUpload && responseId && (
          <AttachmentUpload
            promptResponseId={responseId}
            targetSharerId={targetSharerId}
            isOpen={showAttachmentUpload}
            onClose={() => setShowAttachmentUpload(false)}
            onUploadSuccess={() => {}}
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
          onSave={async (blob: Blob) => {
            try {
              const supabase = createClient();
              const { data: { session }, error: sessionError } = await supabase.auth.getSession();
              if (sessionError || !session?.access_token) {
                throw new Error('Failed to get authorization token');
              }

              // Get upload URL from your API
              const response = await fetch('/api/mux/upload-url', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ promptId }),
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to get upload URL');
              }

              const { uploadUrl, videoId } = await response.json();
              if (!uploadUrl) {
                throw new Error('Failed to get upload URL');
              }

              // Upload the video
              await fetch(uploadUrl, {
                method: 'PUT',
                body: blob,
                headers: {
                  'Content-Type': 'video/webm'
                }
              });

              return videoId;
            } catch (error) {
              console.error('Error saving video:', error);
              throw error;
            }
          }}
        />
      )}

      {showUploadPopup && (
        <UploadPopup
          promptId={promptId}
          targetSharerId={targetSharerId}
          open={showUploadPopup}
          onClose={() => setShowUploadPopup(false)}
          promptText="Upload your response"
          onUploadSuccess={async (muxId: string) => {
            // Update state with the new muxId
            if (muxId) {
              setShowUploadPopup(false);
            }
          }}
        />
      )}
    </>
  );
} 