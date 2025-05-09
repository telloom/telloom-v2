/**
 * File: components/listener/ListenerTopicVideoCard.tsx
 * Description: A component that displays a topic video with view functionality for Listeners.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from "@/components/ui/card";
import { createClient } from '@/utils/supabase/client';
// TopicVideoUploader is not needed for listeners
// import { TopicVideoUploader } from './TopicVideoUploader'; 
import { Button } from '../ui/button'; // Adjusted path
import { Paperclip, Play, Loader2 } from 'lucide-react'; // Removed Upload
import { VideoPopup } from '../VideoPopup'; // Adjusted path
// Dialog for uploader is not needed
// import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from './ui/dialog';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
// Use ListenerAttachmentDialog
import { ListenerAttachmentDialog, Attachment as ListenerAttachmentType } from './ListenerAttachmentDialog'; 
import { UIAttachment, toUIAttachment } from '@/types/component-interfaces';
import { PostgrestError } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth'; // Import useAuth

interface ListenerTopicVideoCardProps {
  promptCategoryId: string;
  categoryName: string;
  targetSharerId?: string; // Sharer whose topic is being viewed (ProfileSharer.id)
  roleContext: 'LISTENER'; // Explicitly for listener
}

interface TopicVideo {
  id: string;
  muxPlaybackId: string;
}

interface PlaylistVideo {
  id: string; // Video.id
  muxPlaybackId: string;
  promptText: string;
}

// Interface for the expected return type of get_listener_playlist_videos RPC
interface RpcPlaylistVideo {
    video_id: string;
    mux_playback_id: string;
    prompt_text: string;
}

export function ListenerTopicVideoCard({
  promptCategoryId,
  categoryName,
  targetSharerId, // This will be the profileSharerId from the listener's page context
  roleContext // Should always be 'LISTENER'
}: ListenerTopicVideoCardProps): JSX.Element {
  console.log('[LTVC] Rendering with promptCategoryId:', promptCategoryId, 'categoryName:', categoryName, 'targetSharerId:', targetSharerId);
  const { user } = useAuth(); // Get current authenticated user
  const listenerProfileId = user?.id; // This is Profile.id of the listener
  const [video, setVideo] = useState<TopicVideo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [playlistLoading, setPlaylistLoading] = useState(true);
  const [attachmentsCountLoading, setAttachmentsCountLoading] = useState(true);
  const [showVideo, setShowVideo] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false); // For potential inline attachments display
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [playlistVideos, setPlaylistVideos] = useState<PlaylistVideo[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  const [attachmentCount, setAttachmentCount] = useState<number>(0);
  const supabase = createClient();
  const router = useRouter(); // Keep for now, though navigation might be removed/changed

  // State for Attachment Dialog
  const [isAttachmentDialogOpen, setIsAttachmentDialogOpen] = useState(false);
  const [attachmentsForDialog, setAttachmentsForDialog] = useState<ListenerAttachmentType[]>([]);
  const [currentAttachmentIndexInDialog, setCurrentAttachmentIndexInDialog] = useState(0);
  const [isLoadingDialogAttachments, setIsLoadingDialogAttachments] = useState(false);

  useEffect(() => {
    const fetchVideoData = async () => {
      console.log('[LTVC fetchVideoData] Fetching for promptCategoryId:', promptCategoryId, 'Sharer:', targetSharerId);
      setIsLoading(true); 
      try {
        const supabaseClient = createClient();
        const { data: videoData, error: videoError } = await supabaseClient
          .from('TopicVideo')
          .select('id, muxPlaybackId')
          .eq('promptCategoryId', promptCategoryId)
          .eq('profileSharerId', targetSharerId) // Ensure topic video is for the correct sharer
          .maybeSingle();

        if (videoError) {
          console.error('[LTVC fetchVideoData] Error fetching topic video data:', videoError.message);
        } else {
          console.log('[LTVC fetchVideoData] Received videoData:', videoData);
          setVideo(videoData);
        }
      } catch (error) {
        console.error('[LTVC fetchVideoData] Exception fetching topic video data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (targetSharerId) {
        fetchVideoData();
    }
  }, [promptCategoryId, targetSharerId]);

  // This function is for a potential INLINE display of attachments within the card.
  // It was incorrectly modified before. It should NOT use the dialog's RPC or complex logic.
  const fetchAttachmentsForInlineDisplay = async () => {
    // This function is a placeholder if inline display within the card is ever needed for listeners.
    // It should not perform the same fetch as the dialog.
    if (!targetSharerId || !listenerProfileId || !showAttachments) return;
    console.log('[LTVC fetchAttachmentsForInlineDisplay] Placeholder for inline attachments. No data fetch occurs here.');
    // If actual inline attachments were needed, new state and logic would go here.
    // For example: setIsLoadingInlineAttachments(true), fetch data, setIsLoadingInlineAttachments(false)
  };

  useEffect(() => {
    // This effect triggers when showAttachments becomes true, for potential inline display.
    if (showAttachments && targetSharerId && listenerProfileId) {
      fetchAttachmentsForInlineDisplay(); 
    }
  }, [promptCategoryId, showAttachments, targetSharerId, listenerProfileId]); 

  useEffect(() => {
    let isMounted = true;
    const fetchAttachmentsCountViaRpc = async () => {
      if (!targetSharerId || !listenerProfileId) {
        console.warn('[LTVC fetchAttachmentsCountViaRpc] Missing targetSharerId or listenerProfileId. Skipping fetch.');
        if(isMounted) {
          setAttachmentCount(0);
          setAttachmentsCountLoading(false);
        }
        return;
      }
      console.log('[LTVC fetchAttachmentsCountViaRpc] Fetching for promptCategoryId:', promptCategoryId, 'Sharer:', targetSharerId, 'Listener:', listenerProfileId);
      setAttachmentsCountLoading(true);
      let count = 0;
      try {
        const supabaseClient = createClient();
        const { data, error } = await supabaseClient.rpc('get_listener_attachments_count', {
          p_prompt_category_id: promptCategoryId,
          p_sharer_id: targetSharerId, // This is ProfileSharer.id
          p_listener_id: listenerProfileId // This is Profile.id
        });

        console.log('[LTVC fetchAttachmentsCountViaRpc] RPC Response - Data:', data, 'Error:', error);

        if (error) {
          console.error('[LTVC fetchAttachmentsCountViaRpc] Error calling RPC:', error);
          toast.error('Error fetching attachment count.');
        } else {
          count = Number(data) || 0; // Assuming RPC returns a single number
        }
      } catch (rpcError) {
        console.error('[LTVC fetchAttachmentsCountViaRpc] Exception calling RPC:', rpcError);
        toast.error('Exception fetching attachment count.');
      } finally {
        if (isMounted) {
           console.log('[LTVC fetchAttachmentsCountViaRpc] Setting attachmentCount to:', count);
           setAttachmentCount(count);
           setAttachmentsCountLoading(false);
        }
      }
    };

    if (targetSharerId && listenerProfileId) {
        const timeoutId = setTimeout(() => {
            if (isMounted) {
                fetchAttachmentsCountViaRpc();
            }
        }, 0);
        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    } else {
        // If no targetSharerId or listenerProfileId, set loading to false and count to 0
        setAttachmentCount(0);
        setAttachmentsCountLoading(false);
    }
  }, [promptCategoryId, targetSharerId, listenerProfileId]);

  useEffect(() => {
    const fetchPlaylistVideosViaRpc = async () => {
      if (!targetSharerId || !listenerProfileId) {
        console.warn('[LTVC fetchPlaylistVideosViaRpc] Missing targetSharerId or listenerProfileId. Skipping fetch.');
        setPlaylistVideos([]);
        setPlaylistLoading(false);
        return;
      }
      console.log('[LTVC fetchPlaylistVideosViaRpc] Fetching for promptCategoryId:', promptCategoryId, 'Sharer:', targetSharerId, 'Listener:', listenerProfileId);
      setPlaylistLoading(true);
      try {
        const supabaseClient = createClient();
        const { data: rpcData, error: rpcError } = await supabaseClient.rpc('get_listener_playlist_videos', {
          p_prompt_category_id: promptCategoryId,
          p_sharer_id: targetSharerId, // This is ProfileSharer.id
          p_listener_id: listenerProfileId // This is Profile.id
        });

        console.log('[LTVC fetchPlaylistVideosViaRpc] RPC Response - Data:', rpcData, 'Error:', rpcError);

        if (rpcError) {
          console.error('[LTVC fetchPlaylistVideosViaRpc] Error calling RPC:', rpcError);
          toast.error('Error fetching playlist videos.');
          setPlaylistVideos([]);
        } else {
          const videos: PlaylistVideo[] = (rpcData as RpcPlaylistVideo[] || []).map(item => ({
            id: item.video_id,
            muxPlaybackId: item.mux_playback_id,
            promptText: item.prompt_text
          }));
          console.log('[LTVC fetchPlaylistVideosViaRpc] Final videos array:', videos);
          setPlaylistVideos(videos);
        }
      } catch (error) {
        console.error('[LTVC fetchPlaylistVideosViaRpc] Exception calling RPC:', error);
        toast.error('Exception fetching playlist videos.');
        setPlaylistVideos([]);
      } finally {
        setPlaylistLoading(false);
      }
    };

    if (targetSharerId && listenerProfileId) {
        fetchPlaylistVideosViaRpc();
    } else {
        setPlaylistVideos([]);
        setPlaylistLoading(false);
    }
  }, [promptCategoryId, targetSharerId, listenerProfileId]);

  const handleCardClick = () => {
    if (video?.muxPlaybackId && !showAttachments && !showVideo && !showPlaylist) {
      setShowVideo(true); 
    }
  };

  const handleViewAllAttachmentsClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('[LTVC handleViewAllAttachmentsClick] Clicked! State before set: isAttachmentDialogOpen=', isAttachmentDialogOpen);
    console.log(`[LTVC handleViewAllAttachmentsClick] Params check: targetSharerId=${targetSharerId}, promptCategoryId=${promptCategoryId}, listenerProfileId=${listenerProfileId}`);

    if (!targetSharerId || !promptCategoryId || !listenerProfileId) {
      toast.error("Cannot load attachments: Sharer, Topic or Listener ID missing.");
      console.error('[LTVC handleViewAllAttachmentsClick] Missing critical IDs. Aborting.');
      setIsLoadingDialogAttachments(false);
      setIsAttachmentDialogOpen(prev => false);
      return;
    }

    setIsLoadingDialogAttachments(true);
    setAttachmentsForDialog([]);
    setCurrentAttachmentIndexInDialog(0);
    setIsAttachmentDialogOpen(prev => true);
    console.log('[LTVC handleViewAllAttachmentsClick] States set: isAttachmentDialogOpen should be true now.');

    try {
      const { data, error } = await supabase.rpc('get_listener_topic_attachments_for_dialog', {
        p_prompt_category_id: promptCategoryId,
        p_sharer_id: targetSharerId,
        p_listener_id: listenerProfileId
      });

      if (error) {
        console.error('[LTVC] RPC error fetching attachments for DIALOG:', error);
        toast.error('Failed to load attachments for the dialog.');
        setAttachmentsForDialog([]); 
      } else {
        console.log('[LTVC handleViewAllAttachmentsClick] RPC success. Fetched attachments for DIALOG:', data);
        setAttachmentsForDialog(data || []);
      }
    } catch (err) {
      const PGError = err as PostgrestError;
      console.error('Error fetching attachments for dialog:', PGError);
      toast.error(PGError.message || 'An unexpected error occurred while loading attachments.');
      setAttachmentsForDialog([]);
    } finally {
      setIsLoadingDialogAttachments(false);
    }
  };

  const handleCloseAttachmentDialog = () => {
    setIsAttachmentDialogOpen(prev => false);
    setAttachmentsForDialog([]);
    setCurrentAttachmentIndexInDialog(0);
  };

  const handleNextAttachmentInDialog = () => {
    console.log('[LTVC handleNextAttachmentInDialog] Called. Current index:', currentAttachmentIndexInDialog, 'Total attachments:', attachmentsForDialog.length);
    if (attachmentsForDialog.length > 0) {
      setCurrentAttachmentIndexInDialog((prevIndex) => {
        const newIndex = (prevIndex + 1) % attachmentsForDialog.length;
        console.log('[LTVC handleNextAttachmentInDialog] New index:', newIndex);
        return newIndex;
      });
    }
  };

  const handlePreviousAttachmentInDialog = () => {
    console.log('[LTVC handlePreviousAttachmentInDialog] Called. Current index:', currentAttachmentIndexInDialog, 'Total attachments:', attachmentsForDialog.length);
    if (attachmentsForDialog.length > 0) {
      setCurrentAttachmentIndexInDialog((prevIndex) => {
        const newIndex = (prevIndex - 1 + attachmentsForDialog.length) % attachmentsForDialog.length;
        console.log('[LTVC handlePreviousAttachmentInDialog] New index:', newIndex);
        return newIndex;
      });
    }
  };

  const handleAttachmentsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAttachments(true); 
    console.log('[LTVC handleAttachmentsClick] Original handler for inline display. showAttachments set to true.');
  };

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

  const handleDownloadAttachment = async (attachmentToDownload: ListenerAttachmentType) => {
    if (!attachmentToDownload || !attachmentToDownload.fileUrl || !attachmentToDownload.fileName) {
        toast.error("Attachment details are missing for download.");
        return;
    }
    try {
        const supabaseClient = createClient();
        const filePath = attachmentToDownload.fileUrl.includes('attachments/')
            ? attachmentToDownload.fileUrl.split('attachments/')[1]
            : attachmentToDownload.fileUrl;

        const { data, error } = await supabaseClient.storage
            .from('attachments')
            .download(filePath);

        if (error) throw error;

        if (data) {
            const url = URL.createObjectURL(data);
            const link = document.createElement('a');
            link.href = url;
            link.download = attachmentToDownload.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    } catch (error) {
        console.error('Error downloading file:', error);
        toast.error('Failed to download file');
    }
  };

  const handleVideoEnd = useCallback(() => {
    if (currentVideoIndex < playlistVideos.length - 1) {
      setCurrentVideoIndex(prev => prev + 1);
    } else {
      setShowCompletionMessage(true);
    }
  }, [currentVideoIndex, playlistVideos.length]);

  // Combined loading state for initial display
  const initialContentLoading = isLoading || playlistLoading || attachmentsCountLoading;

  console.log(`[LTVC Render DEBUG] Dialog state before return: isAttachmentDialogOpen=${isAttachmentDialogOpen}, attachmentsForDialog.length=${attachmentsForDialog.length}, isLoadingDialogAttachments=${isLoadingDialogAttachments}`);

  if (initialContentLoading) {
    return (
      <Card className="p-4 animate-pulse bg-gray-100">
        <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mt-2"></div>
        <div className="flex justify-center gap-3 mt-4">
            <div className="h-8 w-32 bg-gray-200 rounded-full"></div>
            <div className="h-8 w-40 bg-gray-200 rounded-full"></div>
        </div>
      </Card>
    );
  }

  console.log('[LTVC] Render - playlistVideos.length:', playlistVideos.length, 'attachmentCount:', attachmentCount);

  console.log('[LTVC ATTEMPTING TO RENDER DIALOG] isAttachmentDialogOpen:', isAttachmentDialogOpen); // New log here
  return (
    <Card 
      className={cn(
        "p-4 md:p-6 border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55]",
        // Card is clickable to play video if video exists and no other modal active
        video?.muxPlaybackId && !showAttachments && !showVideo && !showPlaylist && "cursor-pointer hover:shadow-[8px_8px_0_0_#8fbc55] transition-all duration-300"
      )}
      onClick={handleCardClick} // Modified to play video or do nothing
    >
      <div className="text-center space-y-3 md:space-y-4">
        <div>
          {/* Title can be more generic for listener, or use categoryName */}
          <h2 className="text-xl font-semibold tracking-tight mb-2">{categoryName} Summary</h2> 
          <p className="text-muted-foreground">
            Watch the summary video for this topic, or explore the playlist of individual prompt responses.
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
            // No "Upload" button for listener. Show a message if no topic video.
            <div className="text-sm text-muted-foreground py-2">
                No summary video available for this topic.
            </div>
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
              onClick={handleViewAllAttachmentsClick}
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

      {/* Video Popup (for single topic video) */}
      <div onClick={(e) => e.stopPropagation()}>
        <VideoPopup
          open={showVideo}
          onClose={() => setShowVideo(false)}
          promptText={categoryName} // Use categoryName as title
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

      {/* Listener Attachments Dialog */}
      {isAttachmentDialogOpen && (
        <ListenerAttachmentDialog
          isOpen={isAttachmentDialogOpen}
          onClose={handleCloseAttachmentDialog}
          attachment={attachmentsForDialog[currentAttachmentIndexInDialog] || null}
          onNext={handleNextAttachmentInDialog}
          onPrevious={handlePreviousAttachmentInDialog}
          hasNext={currentAttachmentIndexInDialog < attachmentsForDialog.length - 1}
          hasPrevious={currentAttachmentIndexInDialog > 0}
          onDownload={handleDownloadAttachment}
        />
      )}
    </Card>
  );
} 