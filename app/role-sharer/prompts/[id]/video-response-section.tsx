'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Video as VideoIcon, Play, Upload, Paperclip, Edit, Check, ImageOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { VideoPopup } from '@/components/VideoPopup';
import { RecordingInterface } from '@/components/RecordingInterface';
import { UploadPopup } from '@/components/UploadPopup';
import dynamic from 'next/dynamic';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import Image from 'next/image';
import { Dialog, DialogContent } from "@/components/ui/dialog";

// Dynamically import components that could cause hydration issues
const MuxPlayer = dynamic(
  () => import('@/components/MuxPlayer').then(mod => mod.MuxPlayer),
  { ssr: false }
);

const AttachmentUpload = dynamic(
  () => import('@/components/AttachmentUpload').then(mod => mod.default),
  { ssr: false }
);

interface VideoResponseSectionProps {
  promptId: string;
  response?: {
    id: string;
    summary?: string | null;
    video?: {
      id: string;
      muxPlaybackId: string;
      VideoTranscript?: {
        id: string;
        transcript: string;
      }[];
    } | null;
    PromptResponseAttachment?: {
      id: string;
      fileUrl: string;
      fileType: string;
      fileName: string;
      description?: string;
      dateCaptured?: string;
      yearCaptured?: number;
    }[];
  } | null;
}

function AttachmentPreview({ attachment }: { 
  attachment: {
    id: string;
    fileUrl: string;
    fileType: string;
    fileName: string;
    description?: string;
  }
}) {
  const [imageError, setImageError] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    async function getSignedUrl() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .storage
          .from('attachments')
          .createSignedUrl(attachment.fileName, 3600);

        if (data?.signedUrl) {
          setSignedUrl(data.signedUrl);
        }
      } catch (error) {
        console.error('Error getting signed URL:', error);
        setImageError(true);
      }
    }

    getSignedUrl();
  }, [attachment.fileName]);

  if (attachment.fileType.startsWith('image/')) {
    if (imageError) {
      return (
        <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
          <ImageOff className="h-6 w-6 text-gray-400" />
        </div>
      );
    }

    return (
      <div className="relative aspect-video w-full">
        <img
          src={signedUrl || attachment.fileUrl}
          alt={attachment.description || 'Attachment'}
          className="w-full h-full object-cover rounded-lg"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
      <span className="text-sm text-gray-500">{attachment.fileName}</span>
    </div>
  );
}

export function VideoResponseSection({ promptId, response }: VideoResponseSectionProps) {
  const [showRecordingInterface, setShowRecordingInterface] = useState(false);
  const [showUploadPopup, setShowUploadPopup] = useState(false);
  const [showAttachmentUpload, setShowAttachmentUpload] = useState(false);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [transcript, setTranscript] = useState(response?.video?.VideoTranscript?.[0]?.transcript || '');
  const [summary, setSummary] = useState(response?.summary || '');
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const imageAttachments = response?.PromptResponseAttachment?.filter(
    attachment => attachment.fileType.startsWith('image/')
  ) || [];

  const handleSaveTranscript = async () => {
    if (!response?.video?.VideoTranscript?.[0]?.id) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('VideoTranscript')
      .update({ transcript })
      .eq('id', response.video.VideoTranscript[0].id);

    if (error) {
      console.error('Error updating transcript:', error);
      toast.error('Failed to update transcript');
      return;
    }

    setIsEditingTranscript(false);
    toast.success('Transcript updated successfully');
  };

  const handleSaveSummary = async () => {
    if (!response?.id) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('PromptResponse')
      .update({ summary })
      .eq('id', response.id);

    if (error) {
      console.error('Error updating summary:', error);
      toast.error('Failed to update summary');
      return;
    }

    setIsEditingSummary(false);
    toast.success('Summary updated successfully');
  };

  const generateAISummary = async () => {
    // TODO: Implement AI summary generation
    toast.error('AI summary generation not implemented yet');
  };

  const handlePrevious = () => {
    if (selectedImageIndex === null || selectedImageIndex <= 0) return;
    setSelectedImageIndex(selectedImageIndex - 1);
  };

  const handleNext = () => {
    if (selectedImageIndex === null || selectedImageIndex >= imageAttachments.length - 1) return;
    setSelectedImageIndex(selectedImageIndex + 1);
  };

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (selectedImageIndex === null) return;
      
      if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'Escape') {
        setSelectedImageIndex(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageIndex]);

  if (!response?.video) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center gap-6 bg-gray-50">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Record Your Response</h3>
          <p className="text-sm text-gray-500">Share your story through video</p>
        </div>
        <div className="flex gap-4">
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
            onClose={() => setShowUploadPopup(false)}
          />
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-8" suppressHydrationWarning>
      {/* Video Player */}
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        {response.video.muxPlaybackId && (
          <div suppressHydrationWarning>
            <MuxPlayer playbackId={response.video.muxPlaybackId} />
          </div>
        )}
      </div>

      {/* Transcript Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Transcript</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (isEditingTranscript) {
                handleSaveTranscript();
              } else {
                setIsEditingTranscript(true);
              }
            }}
          >
            {isEditingTranscript ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Edit className="h-4 w-4 mr-2" />
            )}
            {isEditingTranscript ? 'Save' : 'Edit'}
          </Button>
        </div>
        <Textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          disabled={!isEditingTranscript}
          className="min-h-[100px]"
        />
      </div>

      {/* Summary Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Summary</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={generateAISummary}
            >
              Generate AI Summary
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (isEditingSummary) {
                  handleSaveSummary();
                } else {
                  setIsEditingSummary(true);
                }
              }}
            >
              {isEditingSummary ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Edit className="h-4 w-4 mr-2" />
              )}
              {isEditingSummary ? 'Save' : 'Edit'}
            </Button>
          </div>
        </div>
        <Textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          disabled={!isEditingSummary}
          className="min-h-[100px]"
        />
      </div>

      {/* Attachments Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Attachments</h3>
          <Button
            onClick={() => setShowAttachmentUpload(true)}
            variant="outline"
            className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full"
          >
            <Paperclip className="mr-2 h-4 w-4" />
            Add Attachment
          </Button>
        </div>
        
        {response?.PromptResponseAttachment && response.PromptResponseAttachment.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {response.PromptResponseAttachment.map((attachment, index) => (
              <div
                key={attachment.id}
                className="block hover:opacity-80 transition-opacity cursor-pointer"
                onClick={() => {
                  if (attachment.fileType.startsWith('image/')) {
                    setSelectedImageIndex(imageAttachments.findIndex(img => img.id === attachment.id));
                  } else {
                    window.open(attachment.fileUrl, '_blank');
                  }
                }}
              >
                <AttachmentPreview attachment={attachment} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No attachments yet</p>
        )}
      </div>

      {/* Image Gallery Dialog */}
      <Dialog 
        open={selectedImageIndex !== null} 
        onOpenChange={() => setSelectedImageIndex(null)}
      >
        <DialogContent className="max-w-4xl p-0 bg-black/90">
          {selectedImageIndex !== null && imageAttachments[selectedImageIndex] && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center justify-between p-4 z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevious();
                  }}
                  disabled={selectedImageIndex <= 0}
                  className="text-white hover:bg-white/20"
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  disabled={selectedImageIndex >= imageAttachments.length - 1}
                  className="text-white hover:bg-white/20"
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </div>
              <div className="relative aspect-[4/3] w-full">
                <img
                  src={imageAttachments[selectedImageIndex].fileUrl}
                  alt={imageAttachments[selectedImageIndex].description || 'Image'}
                  className="w-full h-full object-contain"
                />
              </div>
              {imageAttachments[selectedImageIndex].description && (
                <div className="p-4 text-white text-center">
                  {imageAttachments[selectedImageIndex].description}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {showAttachmentUpload && response.id && (
        <AttachmentUpload
          promptResponseId={response.id}
          isOpen={showAttachmentUpload}
          onClose={() => setShowAttachmentUpload(false)}
          onUploadSuccess={() => {
            setShowAttachmentUpload(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
} 