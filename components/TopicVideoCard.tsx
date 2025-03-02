/**
 * File: components/TopicVideoCard.tsx
 * Description: A component that displays a topic video with upload and view functionality
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from "@/components/ui/card";
import { createClient } from '@/utils/supabase/client';
import { TopicVideoUploader } from './TopicVideoUploader';
import { Button } from './ui/button';
import { Paperclip, Play, Upload } from 'lucide-react';
import { VideoPopup } from './VideoPopup';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from './ui/dialog';
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

interface PlaylistVideo {
  id: string;
  muxPlaybackId: string;
  promptText: string;
}

interface PromptWithResponse {
  id: string;
  promptText: string;
  isContextEstablishing: boolean;
  PromptResponse: Array<{
    id: string;
    Video: {
      id: string;
      muxPlaybackId: string;
    } | null;
  }>;
}

export function TopicVideoCard({ promptCategoryId, categoryName }: TopicVideoCardProps) {
  const [video, setVideo] = useState<TopicVideo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showVideo, setShowVideo] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [attachments, setAttachments] = useState<UIAttachment[]>([]);
  const [currentAttachmentIndex, setCurrentAttachmentIndex] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [playlistVideos, setPlaylistVideos] = useState<PlaylistVideo[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  // Fetch video data
  useEffect(() => {
    const fetchVideoData = async () => {
      try {
        // Create a fresh Supabase client for this request
        const supabase = createClient();
        
        // Add a small delay to ensure auth is properly initialized
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data: videoData, error: videoError } = await supabase
          .from('TopicVideo')
          .select('id, muxPlaybackId')
          .eq('promptCategoryId', promptCategoryId)
          .maybeSingle();

        if (videoError) {
          console.error('Error fetching video data:', videoError.message);
        } else {
          setVideo(videoData);
        }
      } catch (error) {
        console.error('Error fetching video data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Call the function with a slight delay to ensure auth is ready
    const timer = setTimeout(() => {
      fetchVideoData();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [promptCategoryId]);

  // Fetch attachments when needed
  useEffect(() => {
    const fetchAttachments = async () => {
      if (!showAttachments) return;
      
      console.log('Fetching attachments for category:', promptCategoryId);
      
      try {
        // Create a fresh Supabase client for this request
        const supabase = createClient();
        
        // Add a small delay to ensure auth is properly initialized
        await new Promise(resolve => setTimeout(resolve, 500));
        
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
          .in('promptId', prompts.map((p: { id: string }) => p.id));

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

        // Split the response IDs into smaller chunks to avoid URL length limits
        const chunkSize = 10;
        const responseIdChunks = [];
        for (let i = 0; i < responses.length; i += chunkSize) {
          responseIdChunks.push(responses.slice(i, i + chunkSize).map((r: { id: string }) => r.id));
        }

        // Fetch attachments in chunks and combine results
        let allAttachments: any[] = [];
        
        for (const chunk of responseIdChunks) {
          try {
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
              .in('promptResponseId', chunk)
              .order('dateCaptured', { ascending: false, nullsLast: true });

            if (attachmentError) {
              console.error('Error fetching attachments chunk:', attachmentError.message);
              continue; // Continue with next chunk instead of failing completely
            }

            if (attachmentData?.length) {
              allAttachments = [...allAttachments, ...attachmentData];
            }
          } catch (chunkError) {
            console.error('Error processing attachment chunk:', chunkError);
            // Continue with next chunk
          }
        }

        console.log('Found attachments:', allAttachments.length);

        // Convert to UIAttachments
        const uiAttachments = allAttachments.map((att: any) => toUIAttachment(att)) ?? [];
        setAttachments(uiAttachments);
      } catch (error) {
        if (error instanceof Error) {
          console.error('Unexpected error fetching attachments:', error.message);
        } else if ((error as PostgrestError).message) {
          console.error('Database error fetching attachments:', (error as PostgrestError).message);
        } else {
          console.error('Unknown error fetching attachments');
        }
        // Don't clear attachments on error to prevent UI flashing
      }
    };

    // Call the function with a slight delay to ensure auth is ready
    const timer = setTimeout(() => {
      fetchAttachments();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [promptCategoryId, showAttachments]);

  // Add a useEffect to fetch attachments count immediately
  useEffect(() => {
    const fetchAttachmentsCount = async () => {
      try {
        // Create a fresh Supabase client for this request
        const supabase = createClient();
        
        // Add a small delay to ensure auth is properly initialized
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // First get all prompts in this category
        const { data: prompts, error: promptError } = await supabase
          .from('Prompt')
          .select('id')
          .eq('promptCategoryId', promptCategoryId);

        if (promptError) {
          console.error('Error fetching prompts:', promptError);
          setAttachments([]);
          return;
        }

        if (!prompts?.length) {
          setAttachments([]);
          return;
        }

        // Get all prompt responses for these prompts
        const { data: responses, error: responseError } = await supabase
          .from('PromptResponse')
          .select('id')
          .in('promptId', prompts.map((p: { id: string }) => p.id));

        if (responseError) {
          console.error('Error fetching responses:', responseError);
          setAttachments([]);
          return;
        }

        if (!responses?.length) {
          setAttachments([]);
          return;
        }

        // Split the response IDs into smaller chunks to avoid URL length limits
        const chunkSize = 10;
        const responseIdChunks = [];
        for (let i = 0; i < responses.length; i += chunkSize) {
          responseIdChunks.push(responses.slice(i, i + chunkSize).map((r: { id: string }) => r.id));
        }

        // Fetch attachments in chunks and combine results
        let allAttachments: any[] = [];
        
        for (const chunk of responseIdChunks) {
          try {
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
              .in('promptResponseId', chunk)
              .order('dateCaptured', { ascending: false, nullsLast: true });

            if (attachmentError) {
              console.error('Error fetching attachments chunk:', attachmentError);
              continue; // Continue with next chunk instead of failing completely
            }

            if (attachmentData?.length) {
              allAttachments = [...allAttachments, ...attachmentData];
            }
          } catch (chunkError) {
            console.error('Error processing attachment chunk:', chunkError);
            // Continue with next chunk
          }
        }

        // Convert to UIAttachments
        const uiAttachments = allAttachments.map((att: any) => toUIAttachment(att)) ?? [];
        setAttachments(uiAttachments);
      } catch (error) {
        console.error('Error fetching attachments count:', error);
        // Don't clear attachments on error to prevent UI flashing
        // Just keep the previous state
      }
    };

    // Call the function with a slight delay to ensure auth is ready
    const timer = setTimeout(() => {
      fetchAttachmentsCount();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [promptCategoryId]);

  // New useEffect to fetch playlist videos
  useEffect(() => {
    const fetchPlaylistVideos = async () => {
      try {
        // Create a fresh Supabase client for this request
        const supabase = createClient();
        
        // Add a small delay to ensure auth is properly initialized
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // First get all prompts in this category
        const { data: prompts, error: promptError } = await supabase
          .from('Prompt')
          .select(`
            id,
            promptText,
            isContextEstablishing,
            PromptResponse (
              id,
              Video (
                id,
                muxPlaybackId
              )
            )
          `)
          .eq('promptCategoryId', promptCategoryId)
          .order('isContextEstablishing', { ascending: false });

        if (promptError) {
          console.error('Error fetching prompts for playlist:', promptError);
          return;
        }

        // Filter and transform the data
        const videos: PlaylistVideo[] = [];
        const contextEstablishingPrompts = (prompts as PromptWithResponse[] || []).filter(p => 
          p.isContextEstablishing && 
          p.PromptResponse?.[0]?.Video?.muxPlaybackId
        );
        
        const regularPrompts = (prompts as PromptWithResponse[] || []).filter(p => 
          !p.isContextEstablishing && 
          p.PromptResponse?.[0]?.Video?.muxPlaybackId
        );

        // Add context establishing videos first
        contextEstablishingPrompts.forEach(prompt => {
          if (prompt.PromptResponse?.[0]?.Video?.muxPlaybackId) {
            videos.push({
              id: prompt.PromptResponse[0].Video.id,
              muxPlaybackId: prompt.PromptResponse[0].Video.muxPlaybackId,
              promptText: prompt.promptText
            });
          }
        });

        // Then add regular videos
        regularPrompts.forEach(prompt => {
          if (prompt.PromptResponse?.[0]?.Video?.muxPlaybackId) {
            videos.push({
              id: prompt.PromptResponse[0].Video.id,
              muxPlaybackId: prompt.PromptResponse[0].Video.muxPlaybackId,
              promptText: prompt.promptText
            });
          }
        });

        setPlaylistVideos(videos);
      } catch (error) {
        console.error('Error fetching playlist videos:', error);
        // Don't update state on error to prevent UI issues
      }
    };

    // Call the function with a slight delay to ensure auth is ready
    const timer = setTimeout(() => {
      fetchPlaylistVideos();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [promptCategoryId]);

  const handleUploadSuccess = async () => {
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
    // Don't navigate if any dialog is open
    if (showVideo || showAttachments || showUploader || showPlaylist) {
      return;
    }
    
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

  const handleVideoEnd = useCallback(() => {
    if (currentVideoIndex < playlistVideos.length - 1) {
      setCurrentVideoIndex(prev => prev + 1);
    } else {
      setShowCompletionMessage(true);
    }
  }, [currentVideoIndex, playlistVideos.length]);

  const handleNextVideo = useCallback(() => {
    if (currentVideoIndex < playlistVideos.length - 1) {
      setCurrentVideoIndex(prev => prev + 1);
    }
  }, [currentVideoIndex, playlistVideos.length]);

  const handlePreviousVideo = useCallback(() => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(prev => prev - 1);
    }
  }, [currentVideoIndex]);

  const handleRestartPlaylist = useCallback(() => {
    setCurrentVideoIndex(0);
    setShowCompletionMessage(false);
  }, []);

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
        "p-4 md:p-6 border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55]",
        video?.muxPlaybackId && !showAttachments && !showVideo && !showUploader && !showPlaylist && "cursor-pointer hover:shadow-lg transition-shadow"
      )}
      onClick={handleCardClick}
    >
      <div className="text-center space-y-3 md:space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight mb-2">Topic Video</h2>
          <p className="text-muted-foreground">
            Create a summary video that captures the essence of this topic, incorporating responses from individual prompts.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
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
                Topic Video
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
          
          {playlistVideos.length > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowPlaylist(true);
                setCurrentVideoIndex(0);
                setShowCompletionMessage(false);
              }}
              className="rounded-full bg-[#1B4332] hover:bg-[#1B4332]/90"
            >
              <div className="flex items-center text-sm whitespace-nowrap">
                <Play className="h-4 w-4 mr-2" />
                All Responses ({playlistVideos.length})
              </div>
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleAttachmentsClick}
            className="rounded-full border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55]"
          >
            <div className="flex items-center text-sm whitespace-nowrap">
              <Paperclip className="h-4 w-4" />
              <span className="ml-1 mr-2">{attachments.length}</span>
              All Topic Attachments
            </div>
          </Button>
        </div>
      </div>

      {/* Video Popup */}
      <div onClick={(e) => e.stopPropagation()}>
        <VideoPopup
          open={showVideo}
          onClose={() => setShowVideo(false)}
          promptText={categoryName}
          videoId={video?.muxPlaybackId}
        />
      </div>

      {/* Playlist Video Popup */}
      <div onClick={(e) => e.stopPropagation()}>
        <VideoPopup
          open={showPlaylist}
          onClose={() => {
            setShowPlaylist(false);
            setCurrentVideoIndex(0);
            setShowCompletionMessage(false);
          }}
          promptText={playlistVideos[currentVideoIndex]?.promptText || ''}
          videoId={playlistVideos[currentVideoIndex]?.muxPlaybackId}
          onNext={handleNextVideo}
          onPrevious={handlePreviousVideo}
          hasNext={currentVideoIndex < playlistVideos.length - 1}
          hasPrevious={currentVideoIndex > 0}
          onVideoEnd={handleVideoEnd}
          showProgress={true}
          currentVideo={currentVideoIndex + 1}
          totalVideos={playlistVideos.length}
          showCompletionMessage={showCompletionMessage}
          onRestart={handleRestartPlaylist}
        />
      </div>

      {/* Attachments Dialog */}
      <div onClick={(e) => e.stopPropagation()}>
        <AttachmentDialog
          attachment={attachments[currentAttachmentIndex] ? {
            id: attachments[currentAttachmentIndex].id,
            fileUrl: attachments[currentAttachmentIndex].fileUrl,
            displayUrl: attachments[currentAttachmentIndex].displayUrl,
            fileType: attachments[currentAttachmentIndex].fileType,
            fileName: attachments[currentAttachmentIndex].fileName,
            description: attachments[currentAttachmentIndex].description,
            dateCaptured: attachments[currentAttachmentIndex].dateCaptured instanceof Date 
              ? attachments[currentAttachmentIndex].dateCaptured.toISOString().split('T')[0]
              : attachments[currentAttachmentIndex].dateCaptured,
            yearCaptured: attachments[currentAttachmentIndex].yearCaptured,
            PersonTags: attachments[currentAttachmentIndex].PersonTags
          } : null}
          isOpen={showAttachments}
          onClose={() => setShowAttachments(false)}
          onNext={currentAttachmentIndex < attachments.length - 1 ? handleNext : undefined}
          onPrevious={currentAttachmentIndex > 0 ? handlePrevious : undefined}
          hasNext={currentAttachmentIndex < attachments.length - 1}
          hasPrevious={currentAttachmentIndex > 0}
          onSave={async (attachment) => {
            const updatedUIAttachment = {
              ...attachments[currentAttachmentIndex],
              description: attachment.description,
              dateCaptured: attachment.dateCaptured ? new Date(attachment.dateCaptured) : null,
              yearCaptured: attachment.yearCaptured,
              PersonTags: attachment.PersonTags
            };
            await handleAttachmentSave(updatedUIAttachment);
          }}
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
      </div>

      {/* Upload Popup */}
      <div onClick={(e) => e.stopPropagation()}>
        <Dialog open={showUploader} onOpenChange={setShowUploader}>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                Topic Video for {categoryName}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mb-4">
                Create a summary video that captures the essence of this topic.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-hidden">
              <TopicVideoUploader
                promptCategoryId={promptCategoryId}
                onUploadSuccess={handleUploadSuccess}
                categoryName={categoryName}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
} 