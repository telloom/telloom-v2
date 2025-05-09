// components/listener/ListenerPromptDisplayCard.tsx
// Displays a single prompt and its associated sharer response for a listener.

'use client';

import React from 'react';
import { useRouter } from 'next/navigation'; // Added useRouter
// Removed Image from next/image as AttachmentThumbnail will handle images
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Loader2, PlayCircle, Paperclip, Star, VideoOff } from 'lucide-react'; // Added VideoOff
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
// Original types from listener-topic-types might not have signedFileUrl directly on RpcTopicAttachment
// import type { ListenerTopicPrompt, ListenerPromptResponse } from '@/types/listener-topic-types'; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AttachmentThumbnail from '@/components/AttachmentThumbnail'; // Import AttachmentThumbnail

// Define types similar to Stateful... from ListenerTopicPageClient
// to ensure signedFileUrl is expected.
interface DisplayAttachment {
  id: string;
  fileUrl: string | null; // Original URL from DB
  fileName: string | null;
  fileType: string | null;
  title: string | null;
  description: string | null;
  dateCaptured: string | null; // Keep as string for simplicity here, parent converts
  yearCaptured: number | null;
  profileSharerId: string; // Changed from optional to required
  fileSize: number | null;
  promptResponseId: string | null;
  uploadedAt: string | null;
  updatedAt: string | null;
  // PersonTags: any[]; // Keeping 'any' for simplicity in card, parent handles actual type
}

interface DisplayPromptResponse {
  id: string;
  videoId: string | null;
  summary: string | null;
  responseNotes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  video_muxPlaybackId?: string | null;
  video_status?: string | null;
  attachments?: DisplayAttachment[];
  is_favorite?: boolean;
  video_duration?: number | null;
}

interface DisplayTopicPrompt {
  id: string;
  promptText: string;
  isContextEstablishing: boolean;
  sharerResponse: DisplayPromptResponse | null;
}

interface ListenerPromptDisplayCardProps {
  prompt: DisplayTopicPrompt; // Use the new DisplayTopicPrompt
  promptIndex: number; 
  sharerId: string; // Added sharerId for navigation
  onPlayVideo: (response: DisplayPromptResponse, promptText: string) => void; // Use DisplayPromptResponse
  onViewAttachment: (prompt: DisplayTopicPrompt, attachmentIndex: number) => void; // Use DisplayTopicPrompt
  gallerySignedUrls: Record<string, string | null>; // New prop for signed URLs
}

export function ListenerPromptDisplayCard({
  prompt,
  sharerId, // Destructure sharerId
  onPlayVideo,
  onViewAttachment,
  gallerySignedUrls,
}: ListenerPromptDisplayCardProps) {
  const router = useRouter(); // Initialize router
  const { sharerResponse } = prompt;

  const handleNavigateToPromptDetail = () => {
    if (sharerId && prompt.id) {
      router.push(`/role-listener/${sharerId}/prompts/${prompt.id}`);
    } else {
      console.warn('[ListenerPromptDisplayCard] Missing sharerId or prompt.id for navigation.');
    }
  };

  const handleWatchClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sharerResponse) {
      onPlayVideo(sharerResponse, prompt.promptText);
    }
  };

  const handleViewAllAttachmentsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewAttachment(prompt, 0); // Opens the dialog with the first attachment
  };

  const handleThumbnailClick = (e: React.MouseEvent, attachmentIndex: number) => {
    e.stopPropagation();
    onViewAttachment(prompt, attachmentIndex);
  };

  if (!sharerResponse) {
    return null;
  }

  const hasViewableAttachments = sharerResponse.attachments && sharerResponse.attachments.length > 0;
  const videoPlayable = sharerResponse.video_muxPlaybackId && sharerResponse.video_muxPlaybackId.trim() !== '';

  // DEBUGGING LOG: Inspect the props, especially attachment URLs
  // if (hasViewableAttachments && sharerResponse.attachments) {
  //   console.log(`[ListenerPromptDisplayCard] Prompt: "${prompt.promptText.substring(0,30)}..." - Rendering with attachments:`);
  //   sharerResponse.attachments.forEach((att, idx) => {
  //     console.log(`  Att ${idx}: ID=${att.id}, fileUrl=${att.fileUrl}, fileType=${att.fileType}, signedUrl: ${gallerySignedUrls[att.id!]}`);
  //   });
  // } else {
  //   console.log(`[ListenerPromptDisplayCard] Prompt: "${prompt.promptText.substring(0,30)}..." - No attachments or sharerResponse.attachments is undefined.`);
  // }
  // END DEBUGGING LOG

  return (
    <Card 
      className="border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55] transition-all duration-300 flex flex-col h-full group cursor-pointer"
      onClick={handleNavigateToPromptDetail} // Card click navigates to prompt detail
    >
      <CardHeader className="pb-2 pt-4 px-4">
        {/* TODO: Add "Start Here" badge if data becomes available */}
        {/* TODO: Add Checkmark icon top-right if data becomes available */}
        <CardTitle className="text-sm font-semibold leading-tight text-gray-700 group-hover:text-[#1B4332] min-h-[40px] line-clamp-3 md:line-clamp-2 lg:line-clamp-3">
          {prompt.promptText}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-3 pt-0 flex-grow flex flex-col justify-end">
        <div className="mt-auto space-y-2">
          {/* Attachment Thumbnails Section - MODIFIED */}
          {hasViewableAttachments && sharerResponse.attachments && sharerResponse.attachments.length > 0 && (
            <div className="flex items-center justify-end py-1.5 px-1 h-[44px]"> {/* Adjusted height for bigger thumbs (h-9 w-9 means ~36px + padding/border) */}
              {sharerResponse.attachments.slice(0, 4).map((att, index) => {
                const signedUrl = gallerySignedUrls[att.id!];
                const thumbnailAttachment = {
                  id: att.id!,
                  fileName: att.fileName || 'attachment',
                  fileType: att.fileType || 'application/octet-stream',
                  signedUrl: signedUrl,
                  dateCaptured: att.dateCaptured ? new Date(att.dateCaptured) : null, 
                };

                return (
                  <TooltipProvider key={att.id || index}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                          <button 
                              onClick={(e) => handleThumbnailClick(e, index)} // Updated onClick 
                              className={cn(
                                "relative focus:outline-none focus:ring-2 focus:ring-[#8fbc55] focus:ring-offset-1 rounded-full h-9 w-9 flex items-center justify-center overflow-hidden border-2 border-white hover:z-10", // Increased size to h-9 w-9, added relative and hover:z-10
                                index > 0 ? "-ml-3" : "" // Adjusted overlap for h-9 w-9, e.g., -ml-3 or -ml-4 might look better
                              )}
                              aria-label={`View attachment: ${att.title || att.fileName || 'attachment'}`}
                          >
                            <AttachmentThumbnail
                              attachment={thumbnailAttachment}
                              className="w-full h-full object-cover" 
                            />
                          </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p className="text-xs">{att.title || att.fileName}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
              {sharerResponse.attachments.length > 4 && (
                <div className={cn(
                  "relative flex items-center justify-center h-9 w-9 rounded-full bg-gray-200 text-gray-600 text-xs font-medium border-2 border-white hover:z-10", // Increased size to h-9 w-9, added relative and hover:z-10
                  sharerResponse.attachments.slice(0,4).length > 0 ? "-ml-3" : "" // Apply overlap if there are preceding items
                )}>
                  +{sharerResponse.attachments.length - 4}
                </div>
              )}
            </div>
          )}

          {/* Buttons Section - MODIFIED for horizontal layout */}
          <div className="flex items-center justify-between gap-2 pt-1">
            {videoPlayable ? (
              <Button
                onClick={handleWatchClick} // Updated onClick
                className="flex-1 bg-[#1B4332] text-white hover:bg-[#2A6244] rounded-full text-xs h-8 font-medium tracking-wide min-w-0"
                size="sm"
              >
                <PlayCircle className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                <span className="truncate">Watch</span>
              </Button>
            ) : (
              // Maintain some space if video is not playable but attachments might be
              <div className="flex-1 min-w-0 h-8 flex items-center justify-center text-xs text-gray-400">
                <VideoOff className="h-3.5 w-3.5 mr-1.5 flex-shrink-0"/> No Video
              </div>
            )}

            {hasViewableAttachments ? (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-8 px-3 rounded-full border-gray-300 hover:border-[#1B4332] hover:bg-gray-50 min-w-0 font-medium"
                onClick={handleViewAllAttachmentsClick} // Updated onClick
              >
                <Paperclip className="h-3 w-3 mr-1.5 flex-shrink-0" />
                <span className="truncate">View ({sharerResponse?.attachments?.length})</span>
              </Button>
            ) : (
              <div className="flex-1 min-w-0 h-8 text-xs text-gray-400 flex items-center justify-center border border-transparent rounded-full font-medium">
                No Attachments
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ListenerPromptDisplayCard; 