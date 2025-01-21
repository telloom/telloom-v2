/**
 * File: components/TopicVideoCard.tsx
 * Description: A component that displays a topic video with upload and view functionality
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { createClient } from '@/utils/supabase/client';
import { TopicVideoUploader } from './TopicVideoUploader';
import { Button } from './ui/button';
import { Paperclip, Play, Upload } from 'lucide-react';
import { VideoPopup } from './VideoPopup';
import { Dialog, DialogContent } from './ui/dialog';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AttachmentDialog } from './AttachmentDialog';
import { UIAttachment, toUIAttachment } from '@/types/component-interfaces';
import { PostgrestError } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface TopicVideoCardProps {
  promptCategoryId: string;
  categoryName: string;
}

interface TopicVideo {
  id: string;
  muxPlaybackId: string;
}

export function TopicVideoCard({ promptCategoryId, categoryName }: TopicVideoCardProps) {
  const [video, setVideo] = useState<TopicVideo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showVideo, setShowVideo] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [attachments, setAttachments] = useState<UIAttachment[]>([]);
  const [currentAttachmentIndex, setCurrentAttachmentIndex] = useState(0);
  const supabase = createClient();
  const router = useRouter();

  // Fetch video data
  useEffect(() => {
    const fetchVideoData = async () => {
      try {
        const { data: videoData, error: videoError } = await supabase
          .from('TopicVideo')
          .select('id, muxPlaybackId')
          .eq('promptCategoryId', promptCategoryId)
          .maybeSingle();

        if (videoError) throw videoError;
        setVideo(videoData);
      } catch (error) {
        const pgError = error as PostgrestError;
        console.error('Error fetching video data:', pgError.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideoData();
  }, [promptCategoryId, supabase]);

  // Fetch attachments when needed
  useEffect(() => {
    const fetchAttachments = async () => {
      if (!showAttachments) return;
      
      console.log('Fetching attachments for category:', promptCategoryId);
      
      try {
        // First get all prompts in this category
        const { data: prompts, error: promptError } = await supabase
          .from('Prompt')
          .select('id')
          .eq('promptCategoryId', promptCategoryId);

        if (promptError) {
          console.error('Error fetching prompts:', promptError.message);
          setAttachments([]);
          return;
        }

        if (!prompts?.length) {
          console.log('No prompts found for category');
          setAttachments([]);
          return;
        }

        console.log('Found prompts:', prompts.length);

        // Get all prompt responses for these prompts
        const { data: responses, error: responseError } = await supabase
          .from('PromptResponse')
          .select('id')
          .in('promptId', prompts.map(p => p.id));

        if (responseError) {
          console.error('Error fetching responses:', responseError.message);
          setAttachments([]);
          return;
        }

        if (!responses?.length) {
          console.log('No responses found for prompts');
          setAttachments([]);
          return;
        }

        console.log('Found responses:', responses.length);

        // Get all attachments for these responses
        const { data: attachmentData, error: attachmentError } = await supabase
          .from('PromptResponseAttachment')
          .select(`
            *,
            PromptResponseAttachmentPersonTag (
              PersonTag (
                id,
                name,
                relation,
                profileSharerId
              )
            )
          `)
          .in('promptResponseId', responses.map(r => r.id))
          .order('dateCaptured', { ascending: false, nullsLast: true });

        if (attachmentError) {
          console.error('Error fetching attachments:', attachmentError.message);
          setAttachments([]);
          return;
        }

        console.log('Found attachments:', attachmentData?.length ?? 0);

        // Convert to UIAttachments
        const uiAttachments = attachmentData?.map(att => toUIAttachment(att)) ?? [];
        setAttachments(uiAttachments);
      } catch (error) {
        if (error instanceof Error) {
          console.error('Unexpected error fetching attachments:', error.message);
        } else if ((error as PostgrestError).message) {
          console.error('Database error fetching attachments:', (error as PostgrestError).message);
        } else {
          console.error('Unknown error fetching attachments');
        }
        setAttachments([]);
      }
    };

    fetchAttachments();
  }, [promptCategoryId, showAttachments, supabase]);

  // Add a useEffect to fetch attachments count immediately
  useEffect(() => {
    const fetchAttachmentsCount = async () => {
      try {
        // First get all prompts in this category
        const { data: prompts, error: promptError } = await supabase
          .from('Prompt')
          .select('id')
          .eq('promptCategoryId', promptCategoryId);

        if (promptError) throw promptError;
        if (!prompts?.length) {
          setAttachments([]);
          return;
        }

        // Get all prompt responses for these prompts
        const { data: responses, error: responseError } = await supabase
          .from('PromptResponse')
          .select('id')
          .in('promptId', prompts.map(p => p.id));

        if (responseError) throw responseError;
        if (!responses?.length) {
          setAttachments([]);
          return;
        }

        // Get all attachments for these responses
        const { data: attachmentData, error: attachmentError } = await supabase
          .from('PromptResponseAttachment')
          .select(`
            *,
            PromptResponseAttachmentPersonTag (
              PersonTag (
                id,
                name,
                relation,
                profileSharerId
              )
            )
          `)
          .in('promptResponseId', responses.map(r => r.id))
          .order('dateCaptured', { ascending: false, nullsLast: true });

        if (attachmentError) throw attachmentError;

        // Convert to UIAttachments
        const uiAttachments = attachmentData?.map(att => toUIAttachment(att)) ?? [];
        setAttachments(uiAttachments);
      } catch (error) {
        console.error('Error fetching attachments count:', error);
        setAttachments([]);
      }
    };

    fetchAttachmentsCount();
  }, [promptCategoryId, supabase]);

  const handleUploadSuccess = async (playbackId: string) => {
    const { data: videoData, error: videoError } = await supabase
      .from('TopicVideo')
      .select('id, muxPlaybackId')
      .eq('promptCategoryId', promptCategoryId)
      .single();

    if (videoError) {
      console.error('Error fetching updated video:', videoError.message);
      return;
    }

    setVideo(videoData);
    setShowUploader(false);
  };

  const handleCardClick = () => {
    if (video?.muxPlaybackId) {
      router.push(`/role-sharer/topics/${promptCategoryId}/topic-summary`);
    }
  };

  const handleAttachmentsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Opening attachments dialog');
    setShowAttachments(true);
    setCurrentAttachmentIndex(0);
  };

  const handleAttachmentSave = async (updatedAttachment: UIAttachment) => {
    const newAttachments = [...attachments];
    const index = newAttachments.findIndex(a => a.id === updatedAttachment.id);
    if (index !== -1) {
      newAttachments[index] = updatedAttachment;
      setAttachments(newAttachments);
    }
  };

  const handleNext = () => {
    if (currentAttachmentIndex < attachments.length - 1) {
      setCurrentAttachmentIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentAttachmentIndex > 0) {
      setCurrentAttachmentIndex(prev => prev - 1);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <div>Loading...</div>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        "p-6 border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55]",
        video?.muxPlaybackId && "cursor-pointer hover:shadow-lg transition-shadow"
      )}
      onClick={handleCardClick}
    >
      <div className="text-center space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight mb-2">Topic Video</h2>
          <p className="text-muted-foreground">
            Create a summary video that captures the essence of this topic, incorporating responses from individual prompts.
          </p>
        </div>

        <div className="flex justify-center gap-3">
          {video?.muxPlaybackId ? (
            <Button
              variant="default"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowVideo(true);
              }}
              className="rounded-full bg-[#1B4332] hover:bg-[#1B4332]/90"
            >
              <div className="flex items-center text-sm">
                <Play className="h-4 w-4 mr-2" />
                Watch
              </div>
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowUploader(true);
              }}
              className="rounded-full bg-[#1B4332] hover:bg-[#1B4332]/90"
            >
              <div className="flex items-center text-sm">
                <Upload className="h-4 w-4 mr-2" />
                Upload Video
              </div>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleAttachmentsClick}
            className="rounded-full border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55]"
          >
            <div className="flex items-center text-sm">
              <Paperclip className="h-4 w-4" />
              <span className="ml-1 mr-2">{attachments.length}</span>
              All Topic Attachments
            </div>
          </Button>
        </div>
      </div>

      {/* Video Popup */}
      <VideoPopup
        open={showVideo}
        onClose={() => setShowVideo(false)}
        promptText={categoryName}
        videoId={video?.muxPlaybackId}
      />

      {/* Attachments Dialog */}
      <AttachmentDialog
        attachment={attachments[currentAttachmentIndex] || null}
        isOpen={showAttachments}
        onClose={() => setShowAttachments(false)}
        onNext={currentAttachmentIndex < attachments.length - 1 ? handleNext : undefined}
        onPrevious={currentAttachmentIndex > 0 ? handlePrevious : undefined}
        hasNext={currentAttachmentIndex < attachments.length - 1}
        hasPrevious={currentAttachmentIndex > 0}
        onSave={handleAttachmentSave}
        onDelete={async (attachmentId) => {
          try {
            const attachment = attachments.find(a => a.id === attachmentId);
            
            if (attachment?.fileUrl) {
              const filePath = attachment.fileUrl.includes('attachments/') 
                ? attachment.fileUrl.split('attachments/')[1]
                : attachment.fileUrl;
                
              // Delete from storage
              const { error: storageError } = await supabase
                .storage
                .from('attachments')
                .remove([filePath]);
                
              if (storageError) throw storageError;
            }

            // Delete from database
            const { error: dbError } = await supabase
              .from('PromptResponseAttachment')
              .delete()
              .eq('id', attachmentId);

            if (dbError) throw dbError;

            toast.success('Attachment deleted successfully');
            setShowAttachments(false);
            // Update local state
            setAttachments(prev => prev.filter(a => a.id !== attachmentId));
          } catch (error) {
            console.error('Error deleting attachment:', error);
            toast.error('Failed to delete attachment');
          }
        }}
        onDownload={async (attachment) => {
          try {
            const filePath = attachment.fileUrl.includes('attachments/') 
              ? attachment.fileUrl.split('attachments/')[1]
              : attachment.fileUrl;
            
            const { data, error } = await supabase.storage
              .from('attachments')
              .download(filePath);

            if (error) throw error;

            if (data) {
              const url = URL.createObjectURL(data);
              const link = document.createElement('a');
              link.href = url;
              link.download = attachment.fileName;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }
          } catch (error) {
            console.error('Error downloading file:', error);
            toast.error('Failed to download file');
          }
        }}
      />

      {/* Upload Popup */}
      <Dialog open={showUploader} onOpenChange={setShowUploader}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-6">
          <h2 className="text-xl font-semibold mb-4">
            Upload Video for {categoryName}
          </h2>
          <div className="flex-1 min-h-0 overflow-hidden">
            <TopicVideoUploader
              promptCategoryId={promptCategoryId}
              onUploadSuccess={handleUploadSuccess}
              categoryName={categoryName}
            />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 