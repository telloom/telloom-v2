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
  targetSharerId?: string;
  roleContext: 'SHARER' | 'EXECUTOR';
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
    Video: Array<{
      id: string;
      muxPlaybackId: string;
    }> | null;
  }>;
}

export function TopicVideoCard({
  promptCategoryId,
  categoryName,
  targetSharerId,
  roleContext
}: TopicVideoCardProps) {
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
  const [attachmentCount, setAttachmentCount] = useState<number>(0);
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
      
      console.log('Fetching attachments metadata for category:', promptCategoryId);
      setAttachments([]);
      
      try {
        const supabase = createClient();
        await new Promise(resolve => setTimeout(resolve, 500));
        
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

        const chunkSize = 10;
        const responseIdChunks = [];
        for (let i = 0; i < responses.length; i += chunkSize) {
          responseIdChunks.push(responses.slice(i, i + chunkSize).map((r: { id: string }) => r.id));
        }

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
              .order('dateCaptured', { ascending: false, nullsFirst: false });

            if (attachmentError) {
              console.error('Error fetching attachments chunk:', attachmentError.message);
              continue;
            }

            if (attachmentData?.length) {
              allAttachments = [...allAttachments, ...attachmentData];
            }
          } catch (chunkError) {
            console.error('Error processing attachment chunk:', chunkError);
          }
        }

        console.log('Found attachments metadata:', allAttachments.length);

        // Convert to UIAttachments (without signedUrl/displayUrl for now)
        const uiAttachments = allAttachments.map((att: any) => toUIAttachment(att)) ?? [];
        setAttachments(uiAttachments);
        console.log('[TopicVideoCard fetchAttachments] Set raw uiAttachments state (sample):', uiAttachments.slice(0, 2));

      } catch (error) {
        if (error instanceof Error) {
          console.error('[TopicVideoCard] Unexpected error fetching attachments:', error.message);
        } else if ((error as PostgrestError).message) {
          console.error('[TopicVideoCard] Database error fetching attachments:', (error as PostgrestError).message);
        } else {
          console.error('[TopicVideoCard] Unknown error fetching attachments');
        }
        toast.error("Failed to load attachments.");
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
    let isMounted = true;

    const fetchAttachmentsCount = async () => {
      let count = 0;
      try {
        const supabase = createClient();
        await new Promise(resolve => setTimeout(resolve, 500));

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

        const { count: attachmentCountResult, error: countError } = await supabase
          .from('PromptResponseAttachment')
          .select('* ', { count: 'exact', head: true })
          .in('promptResponseId', responses.map((r: { id: string }) => r.id));

        if (countError) {
          console.error('Error fetching attachment count:', countError);
        } else {
          count = attachmentCountResult ?? 0;
        }
      } catch (error) {
        console.error('Error fetching attachments count:', error);
      } finally {
        if (isMounted) {
           setAttachmentCount(count);
        }
      }
    };

    fetchAttachmentsCount();

    return () => {
      isMounted = false;
    };
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
          p.PromptResponse?.[0]?.Video?.[0]?.muxPlaybackId
        );
        
        const regularPrompts = (prompts as PromptWithResponse[] || []).filter(p => 
          !p.isContextEstablishing && 
          p.PromptResponse?.[0]?.Video?.[0]?.muxPlaybackId
        );

        // Add context establishing videos first
        contextEstablishingPrompts.forEach(prompt => {
          if (prompt.PromptResponse?.[0]?.Video?.[0]?.muxPlaybackId) {
            videos.push({
              id: prompt.PromptResponse[0].Video[0].id,
              muxPlaybackId: prompt.PromptResponse[0].Video[0].muxPlaybackId,
              promptText: prompt.promptText
            });
          }
        });

        // Then add regular videos
        regularPrompts.forEach(prompt => {
          if (prompt.PromptResponse?.[0]?.Video?.[0]?.muxPlaybackId) {
            videos.push({
              id: prompt.PromptResponse[0].Video[0].id,
              muxPlaybackId: prompt.PromptResponse[0].Video[0].muxPlaybackId,
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

  // Handle navigation to the summary page
  const handleNavigateToSummary = () => {
    if (!promptCategoryId) {
      console.error("[TopicVideoCard] Missing promptCategoryId for navigation");
      return;
    }

    let path;
    if (roleContext === 'EXECUTOR') {
      if (!targetSharerId) {
        console.error("[TopicVideoCard] Missing targetSharerId in executor context for navigation");
        return;
      }
      path = `/role-executor/${targetSharerId}/topics/${promptCategoryId}/topic-summary`;
    } else {
      path = `/role-sharer/topics/${promptCategoryId}/topic-summary`;
    }

    console.log(`[TopicVideoCard] Navigating to summary: ${path}`);
    router.push(path);
  };

  const handleCardClick = () => {
    if (video?.muxPlaybackId && !showAttachments && !showVideo && !showUploader && !showPlaylist) {
      // If video exists and no other modal/view is active, navigate to summary
      handleNavigateToSummary();
    } else if (!video?.muxPlaybackId && !isLoading) {
      // Only show uploader if no video exists and not loading
      setShowUploader(true);
    }
    // Otherwise, do nothing (e.g., if a modal like attachments is already open)
  };

  const handleAttachmentsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Opening attachments dialog, fetching metadata if needed...');
    setShowAttachments(true);
    setCurrentAttachmentIndex(0);
  };

  const handleAttachmentSave = async (updatedData: Partial<UIAttachment> & { id: string }) => {
    setAttachments(prevAttachments =>
      prevAttachments.map(att => {
        if (att.id === updatedData.id) {
          // Handle dateCaptured specifically if it's in updatedData and might be a string
          let newDateCaptured = att.dateCaptured; // Keep original by default
          if (Object.prototype.hasOwnProperty.call(updatedData, 'dateCaptured')) {
              const dialogDate = updatedData.dateCaptured;
              if (dialogDate instanceof Date) {
                newDateCaptured = dialogDate;
              } else if (typeof dialogDate === 'string') {
                const parsedDate = new Date(dialogDate);
                newDateCaptured = !isNaN(parsedDate.getTime()) ? parsedDate : null;
              } else {
                newDateCaptured = null; // If dialogDate is null or undefined
              }
          }
          return { ...att, ...updatedData, dateCaptured: newDateCaptured };
        }
        return att;
      })
    );
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
                Upload Topic Video
              </div>
            </Button>
          )}
          
          {playlistVideos.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentVideoIndex(0);
                setShowPlaylist(true);
                setShowCompletionMessage(false);
              }}
              className="rounded-full border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55]"
            >
              <div className="flex items-center text-sm">
                <Play className="h-4 w-4 mr-2" />
                Watch Full Playlist ({playlistVideos.length})
              </div>
            </Button>
          )}
          
          {attachmentCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAttachmentsClick}
              className="rounded-full border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55]"
            >
              <div className="flex items-center text-sm">
                <Paperclip className="h-4 w-4 mr-2" />
                View Attachments ({attachmentCount})
              </div>
            </Button>
          )}
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
          isOpen={showAttachments}
          onClose={() => setShowAttachments(false)}
          attachment={
            attachments.length > 0 ? (() => {
              const currentUiAttachment = attachments[currentAttachmentIndex];
              if (!currentUiAttachment) return null;

              let processedDateCaptured: Date | null = null;
              if (currentUiAttachment.dateCaptured) {
                if (currentUiAttachment.dateCaptured instanceof Date) {
                  processedDateCaptured = currentUiAttachment.dateCaptured;
                } else if (typeof currentUiAttachment.dateCaptured === 'string') {
                  const parsedDate = new Date(currentUiAttachment.dateCaptured);
                  if (!isNaN(parsedDate.getTime())) {
                    processedDateCaptured = parsedDate;
                  }
                }
              }
              return {
                ...currentUiAttachment,
                dateCaptured: processedDateCaptured,
              };
            })() : null
          }
          onNext={handleNext}
          onPrevious={handlePrevious}
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
      </div>

      {/* Upload Popup */}
      <div onClick={(e) => e.stopPropagation()}>
        <Dialog open={showUploader} onOpenChange={setShowUploader}>
          <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Upload Topic Video</DialogTitle>
              <DialogDescription>
                Upload a video summarizing this topic. This will replace any existing topic video.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-grow min-h-0">
              <TopicVideoUploader
                promptCategoryId={promptCategoryId}
                onUploadSuccess={handleUploadSuccess}
                categoryName={categoryName}
                targetSharerId={targetSharerId}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
} 