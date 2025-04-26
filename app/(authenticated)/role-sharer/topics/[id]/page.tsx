"use client";

export const runtime = 'nodejs';

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordingInterface } from '@/components/RecordingInterface';
import { VideoPopup } from '@/components/VideoPopup';
import { UploadInterface } from '@/components/UploadInterface';
import { ArrowLeft, Video as VideoIcon, Play, CheckCircle2, LayoutGrid, Table as TableIcon, Upload, Paperclip, Loader2 } from 'lucide-react';
import { Attachment, AttachmentDialog } from '@/components/AttachmentDialog';
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import dynamic from 'next/dynamic';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { ErrorBoundary } from 'react-error-boundary';
import { cn } from "@/lib/utils";
import AttachmentThumbnail from '@/components/AttachmentThumbnail';
import { MuxPlayer } from '@/components/MuxPlayer';
import { TopicVideoCard } from '@/components/TopicVideoCard';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, AlertCircle } from "lucide-react";
import type { Database, Json } from '@/lib/database.types';
import { PersonTag } from '@/types/models';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Dynamically import AttachmentUpload only on the client
const AttachmentUpload = dynamic(() => import('@/components/AttachmentUpload'), {
  ssr: false,
  loading: () => <div className="p-4 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>,
});

// Define concrete types based on Database definitions
type ProfileSharer = Database['public']['Tables']['ProfileSharer']['Row'];
type TopicPromptCategory = Database['public']['Tables']['PromptCategory']['Row'] & {
    Prompt?: TopicPrompt[];
};
type TopicPrompt = Database['public']['Tables']['Prompt']['Row'] & {
    PromptResponse?: TopicPromptResponse[];
};
type TopicPromptResponse = Database['public']['Tables']['PromptResponse']['Row'] & {
    PromptResponseAttachment?: TopicPromptResponseAttachment[];
    Video?: TopicVideo;
};
type TopicPromptResponseAttachment = Database['public']['Tables']['PromptResponseAttachment']['Row'];
type TopicVideo = Database['public']['Tables']['Video']['Row'] & {
    VideoTranscript?: any[];
};
type User = import('@supabase/supabase-js').User;

// Define UIAttachment interface locally
interface LocalUIAttachment extends Omit<TopicPromptResponseAttachment, 'dateCaptured' | 'uploadedAt' | 'updatedAt'> {
  dateCaptured: Date | null;
  uploadedAt: Date | null;
  updatedAt: Date | null;
  signedUrl: string | null;
  displayUrl: string | null;
  PersonTags?: PersonTag[];
}

// Helper function to convert DB attachment to UI Attachment
const toLocalUIAttachment = (dbAttachment: TopicPromptResponseAttachment): LocalUIAttachment => {
  // Ensure nested tags are correctly extracted
  const tags: PersonTag[] = (dbAttachment as any).PromptResponseAttachmentPersonTag?.map(
    (joinEntry: any) => joinEntry.PersonTag
  ).filter((tag: PersonTag | null): tag is PersonTag => tag !== null) ?? [];

  return {
    id: dbAttachment.id,
    promptResponseId: dbAttachment.promptResponseId,
    profileSharerId: dbAttachment.profileSharerId,
    fileName: dbAttachment.fileName || 'Untitled',
    fileType: dbAttachment.fileType,
    fileUrl: dbAttachment.fileUrl,
    fileSize: dbAttachment.fileSize,
    title: dbAttachment.title,
    description: dbAttachment.description,
    dateCaptured: dbAttachment.dateCaptured ? new Date(dbAttachment.dateCaptured) : null,
    uploadedAt: dbAttachment.uploadedAt ? new Date(dbAttachment.uploadedAt) : null,
    updatedAt: dbAttachment.updatedAt ? new Date(dbAttachment.updatedAt) : null,
    yearCaptured: dbAttachment.yearCaptured,
    signedUrl: null,
    displayUrl: dbAttachment.fileUrl,
    PersonTags: tags,
  };
};


interface TopicPageContentProps {
  promptCategory: TopicPromptCategory | null;
  viewMode: 'table' | 'grid';
  sortByStatus: boolean;
  isVideoPopupOpen: boolean;
  isRecordingPopupOpen: boolean;
  isUploadPopupOpen: boolean;
  isAttachmentUploadOpen: boolean;
  selectedPrompt: TopicPrompt | null;
  selectedPromptResponse: TopicPromptResponse | null;
  setViewMode: (mode: 'table' | 'grid') => void;
  setSortByStatus: (status: boolean) => void;
  setSelectedPrompt: (prompt: TopicPrompt | null) => void;
  setSelectedPromptResponse: (response: TopicPromptResponse | null) => void;
  setIsVideoPopupOpen: (open: boolean) => void;
  setIsRecordingPopupOpen: (open: boolean) => void;
  setIsUploadPopupOpen: (open: boolean) => void;
  setIsAttachmentUploadOpen: (open: boolean) => void;
  handleVideoComplete: (blob: Blob) => Promise<string>;
  onRecordingSaved: (videoId: string) => void;
  handleCloseRecording: () => void;
  handleCloseUpload: () => void;
  refreshData: () => Promise<void>;
  router: ReturnType<typeof useRouter>;
  gallerySignedUrls: Record<string, string>;
  areUrlsLoading: boolean;
  galleryAttachments: LocalUIAttachment[];
  setSelectedAttachment: (attachment: LocalUIAttachment | null) => void;
  setCurrentAttachmentIndex: (index: number) => void;
  selectedAttachment: LocalUIAttachment | null;
  currentAttachmentIndex: number;
  handleAttachmentSave: (updatedAttachment: LocalUIAttachment) => Promise<void>;
  handleAttachmentDelete: (attachmentId: string) => Promise<void>;
  handleUploadFinished: (videoId: string, playbackId: string) => Promise<void>;
  targetSharerId: string;
  sharerProfileData?: ProfileSharer | null;
  handleNextAttachment?: () => void;
  handlePreviousAttachment?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
  handleDownloadAttachment?: (attachment: LocalUIAttachment) => Promise<void>;
}

// Simple error logging utility
const logError = (error: any, context: string) => {
  console.error(`[${context}] Error:`, {
    message: error?.message,
    stack: error?.stack,
    cause: error?.cause,
    name: error?.name,
    ...(error?.response && {
      status: error.response.status,
      statusText: error.response.statusText,
      data: error.response.data
    })
  });
};

// Error boundary fallback
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error | string; resetErrorBoundary: () => void }) => {
  const errorMessage = error instanceof Error ? error.message : error;
  return (
    <div className="container mx-auto py-8">
      <Card className="p-6 border-2 border-red-500 shadow-[6px_6px_0_0_#ef4444]">
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{errorMessage}</p>
          <Button className="mt-4" onClick={resetErrorBoundary}>
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

// --- Skeleton Components ---
const LocalPromptCardSkeleton: React.FC = () => (
  <Card className="border-2 border-[#1B4332]/30 shadow-[6px_6px_0_0_#8fbc55]/30 h-[280px] md:h-[250px] flex flex-col bg-white/50 animate-pulse">
    <CardHeader className="pb-0 flex-none pt-4 px-4 md:pt-6 md:px-6">
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-5/6 mt-1" />
    </CardHeader>
    <div className="flex-grow" />
    <div className="px-4 pb-4 md:px-6 md:pb-6 space-y-3">
      <div className="flex justify-end h-9 items-center">
        <div className="flex -space-x-2">
          <Skeleton className="h-9 w-9 rounded-full border-2 border-white" />
          <Skeleton className="h-9 w-9 rounded-full border-2 border-white" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 rounded-full flex-1" />
        <Skeleton className="h-9 rounded-full flex-1" />
      </div>
    </div>
  </Card>
);

const LocalPromptTableRowSkeleton: React.FC = () => (
  <TableRow className="border-b border-[#1B4332]/30 hover:bg-transparent animate-pulse">
    <TableCell>
      <Skeleton className="h-4 w-3/4" />
    </TableCell>
    <TableCell className="text-center">
      <Skeleton className="h-6 w-6 rounded-full inline-block" />
    </TableCell>
    <TableCell className="text-right">
      <div className="flex items-center justify-end gap-2 h-9">
         <div className="flex -space-x-2">
          <Skeleton className="h-9 w-9 rounded-full border-2 border-white" />
        </div>
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
    </TableCell>
  </TableRow>
);
// --- End Skeleton Components ---

// EXPORT the component
export const TopicPageContent: React.FC<TopicPageContentProps> = ({
  promptCategory,
  viewMode,
  sortByStatus,
  isVideoPopupOpen,
  isRecordingPopupOpen,
  isUploadPopupOpen,
  isAttachmentUploadOpen,
  selectedPrompt,
  selectedPromptResponse,
  setViewMode,
  setSortByStatus,
  setSelectedPrompt,
  setSelectedPromptResponse,
  setIsVideoPopupOpen,
  setIsRecordingPopupOpen,
  setIsUploadPopupOpen,
  setIsAttachmentUploadOpen,
  handleVideoComplete,
  onRecordingSaved,
  handleCloseRecording,
  handleCloseUpload,
  refreshData,
  router,
  gallerySignedUrls,
  areUrlsLoading,
  galleryAttachments,
  setSelectedAttachment,
  setCurrentAttachmentIndex,
  selectedAttachment,
  currentAttachmentIndex,
  handleAttachmentSave,
  handleAttachmentDelete,
  handleUploadFinished,
  targetSharerId,
  sharerProfileData,
  handleNextAttachment,
  handlePreviousAttachment,
  hasNext,
  hasPrevious,
  handleDownloadAttachment
}) => {
  // Add diagnostic log for promptCategory
  console.log('[DIAGNOSTIC] TopicPageContent rendering with promptCategory:',
    promptCategory ? {
      id: promptCategory.id,
      category: promptCategory.category,
      promptsCount: promptCategory.Prompt?.length || 0
    } : null
  );

  const [overflowingPrompts, setOverflowingPrompts] = useState<Set<string>>(new Set());
  const promptRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  // Log the received targetSharerId
  useEffect(() => {
    console.log(`[TopicPageContent] Rendering with targetSharerId prop: ${targetSharerId}`);
  }, [targetSharerId]);

  // Check for prompt text overflow for tooltip display
  useEffect(() => {
    Object.entries(promptRefs.current).forEach(([promptId, element]) => {
      if (element && element.scrollHeight > element.clientHeight) {
        setOverflowingPrompts(prev => new Set([...Array.from(prev), promptId]));
      }
    });
  }, [promptCategory]);

  // Render gallery thumbnails
  const renderGallery = useCallback((promptResponse: TopicPromptResponse | null) => {
    try {
      if (
        !promptResponse?.id ||
        !Array.isArray(promptResponse?.PromptResponseAttachment) ||
        promptResponse.PromptResponseAttachment.length === 0
      ) {
        return null;
      }

      const attachments = promptResponse.PromptResponseAttachment;
      const viewableAttachments = attachments.filter(att =>
        att.fileType.startsWith('image/') || att.fileType === 'application/pdf'
      );

      if (viewableAttachments.length === 0) return null;

      // *** CRITICAL CHECK ***: If URLs are still loading, return the loader.
      if (areUrlsLoading) {
        console.log(`[RENDER_GALLERY Response ID: ${promptResponse.id}] URLs are loading, rendering loader.`);
        return (
          <div className="flex items-center justify-start space-x-2 h-9 w-full pl-2">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        );
      }

      console.log(`[RENDER_GALLERY Response ID: ${promptResponse.id}] Rendering gallery. URLs loaded.`);

      // If URLs are loaded, proceed to render thumbnails
      return (
        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
          {viewableAttachments.map((attachment, index) => {
            const signedUrl = gallerySignedUrls[attachment.id];
            if (!signedUrl) {
              console.warn(`[RENDER_GALLERY Attachment ID: ${attachment.id}] Missing signed URL in gallerySignedUrls map after loading!`);
            }
            const displayUrl = signedUrl || attachment.fileUrl;
            console.log(`[RENDER_GALLERY Attachment ID: ${attachment.id}] signedUrl: ${!!signedUrl}, displayUrl used: ${displayUrl}`);

            const uiAttachment: LocalUIAttachment = {
              ...toLocalUIAttachment(attachment),
              signedUrl: signedUrl || null,
              displayUrl: displayUrl
            };

            if (typeof uiAttachment.dateCaptured === 'string') {
                try {
                    uiAttachment.dateCaptured = new Date(uiAttachment.dateCaptured);
                } catch (dateError) {
                    console.error('Error parsing dateCaptured string:', dateError);
                    uiAttachment.dateCaptured = null;
                }
            }

            // FIX: Pass required props to AttachmentThumbnail, potentially using 'any' temporarily
            const thumbnailProps: any = {
                id: uiAttachment.id,
                fileUrl: uiAttachment.fileUrl,
                fileName: uiAttachment.fileName,
                fileType: uiAttachment.fileType,
                signedUrl: uiAttachment.signedUrl,
                displayUrl: uiAttachment.displayUrl,
            };

            return (
              <div
                key={attachment.id}
                className="relative w-9 h-9 hover:z-10 cursor-pointer -ml-2 first:ml-0 border-2 border-white rounded-full overflow-hidden shadow"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log(`[RENDER_GALLERY] Thumbnail clicked. Finding attachment ID: ${attachment.id} in gallery state.`);
                  // --- FIX: Find the LATEST version from the galleryAttachments state array ---
                  const latestAttachmentFromState = galleryAttachments.find(ga => ga.id === attachment.id);

                  if (latestAttachmentFromState) {
                    const dialogIndex = galleryAttachments.findIndex(ga => ga.id === attachment.id); // Index remains the same
                    // --- FIX: Use the object directly from the state array ---
                    setSelectedAttachment(latestAttachmentFromState);
                    setCurrentAttachmentIndex(dialogIndex);
                    console.log(`[RENDER_GALLERY] Found latest state version for ID: ${attachment.id}. Setting selectedAttachment.`);
                  } else {
                    console.warn(`Could not find attachment ${attachment.id} in galleryAttachments state for dialog.`);
                    // Fallback logic (unchanged)
                    if (galleryAttachments.length > 0) {
                        setSelectedAttachment(galleryAttachments[0]);
                        setCurrentAttachmentIndex(0);
                    } else {
                        setSelectedAttachment(null);
                    }
                  }
                }}
              >
                <AttachmentThumbnail
                  attachment={thumbnailProps} // Pass the typed (or 'any') object
                  size="lg"
                  className="w-full h-full object-cover"
                />
              </div>
            );
          })}
        </div>
      );
    } catch (error) {
      console.error('Error rendering gallery:', error);
      return <div className="text-red-500 text-xs">Error loading gallery</div>;
    }
  }, [gallerySignedUrls, areUrlsLoading, galleryAttachments, setSelectedAttachment, setCurrentAttachmentIndex]);

  const handleDialogSave = useCallback(async (dialogAttachment: Attachment) => {
    const originalUiAttachment = galleryAttachments.find(att => att.id === dialogAttachment.id);

    if (!originalUiAttachment) {
      console.error(`[handleDialogSave] Original LocalUIAttachment not found for id: ${dialogAttachment.id}`);
      toast.error("Save failed: Could not find original attachment data.");
      return;
    }

    const updatedUiAttachment: LocalUIAttachment = {
      ...originalUiAttachment,
      title: dialogAttachment.title,
      description: dialogAttachment.description,
      dateCaptured: dialogAttachment.dateCaptured ? new Date(dialogAttachment.dateCaptured) : null,
    };

    await handleAttachmentSave(updatedUiAttachment);
  }, [galleryAttachments, handleAttachmentSave]);

  // Render
  if (!promptCategory) {
    console.log('[DIAGNOSTIC] TopicPageContent returning null due to missing promptCategory');
    return null;
  }

  const completedCount = promptCategory.Prompt?.filter((p: TopicPrompt) => p.PromptResponse?.length > 0)?.length || 0;
  const totalCount = promptCategory.Prompt?.length || 0;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Sort
  const sortedPrompts = [...(promptCategory?.Prompt || [])].sort(
    (a: TopicPrompt, b: TopicPrompt) => {
      if (a.isContextEstablishing && !b.isContextEstablishing) return -1;
      if (!a.isContextEstablishing && b.isContextEstablishing) return 1;
      if (sortByStatus) {
        const aHasResponse = a?.PromptResponse?.[0]?.Video?.muxPlaybackId ? 1 : 0;
        const bHasResponse = b?.PromptResponse?.[0]?.Video?.muxPlaybackId ? 1 : 0;
        return bHasResponse - aHasResponse;
      }
      return 0;
    }
  );

  // This function is now the one passed to RecordingInterface's onSave prop
  const handleSaveForRecordingInterface = async (blob: Blob): Promise<string> => {
    if (!selectedPrompt || !targetSharerId) {
      toast.error('Error: No prompt selected or sharer context missing.');
      throw new Error('Missing context for recording.');
    }
    setIsRecordingPopupOpen(false);

    const recordingToast = toast.loading('Processing your recording...');

    try {
      console.log(`[handleSaveForRecordingInterface] Calling handleVideoComplete prop for prompt: ${selectedPrompt.id}, sharer: ${targetSharerId}`);
      // Call the prop from TopicPage which handles Mux upload and returns videoId
      const videoId = await handleVideoComplete(blob);

      if (videoId) {
        toast.success('Recording successfully sent for processing!', { id: recordingToast });
        // --- Trigger polling *after* getting videoId ---
        onRecordingSaved(videoId);
        // ---------------------------------------------
        return videoId; // Return the videoId to satisfy RecordingInterface's onSave type
      } else {
        // This case might not be reachable if handleVideoComplete throws on failure
        throw new Error('Video processing failed to return an ID.');
      }
    } catch (error) {
      console.error('Error handling recording save:', error);
      toast.error(`Recording failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: recordingToast });
      throw error; // Rethrow the error so RecordingInterface might handle it too
    } finally {
      setSelectedPrompt(null); // Still reset the prompt selection
    }
  };

  return (
    <div className="py-6 px-4 md:px-6 md:py-8 space-y-4">
      {/* Header */}
      <div>
        {/* 
        <Button
          variant="ghost"
          onClick={() => router.push('/role-sharer/topics')}
          className="-ml-2 text-gray-600 hover:text-gray-900 rounded-full"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Topics
        </Button>
        */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-1">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {promptCategory?.category || 'Topic'}
            </h1>
            <p className="text-gray-600 mt-1">{promptCategory?.description}</p>
          </div>
          <div className="flex items-center gap-3 mt-1 sm:mt-0">
            <div className="bg-[#8fbc55] text-[#1B4332] px-4 py-1.5 rounded-full text-lg font-semibold">
              {completedCount}/{totalCount}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
              className="ml-1"
            >
              {viewMode === 'grid' ? (
                <TableIcon className="h-4 w-4" />
              ) : (
                <LayoutGrid className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <div className="mt-2">
          <Progress
            value={progressPercentage}
            className="h-2 bg-[#E5E7EB] [&>[role=progressbar]]:bg-[#8fbc55]"
          />
        </div>
      </div>

      {/* FIX: Add categoryName prop back */}
      <TopicVideoCard
        promptCategoryId={promptCategory.id}
        categoryName={promptCategory.category}
      />

      {/* Content */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {sortedPrompts.map((prompt: TopicPrompt) => {
            if (!prompt?.id) return null;
            const hasResponse = prompt?.PromptResponse?.[0]?.Video?.muxPlaybackId;
            const rawResponse = hasResponse ? prompt.PromptResponse[0] : null;
            const promptResponse: TopicPromptResponse | null = rawResponse
              ? {
                  id: rawResponse.id,
                  profileSharerId: rawResponse.profileSharerId,
                  summary: rawResponse.summary || '',
                  responseNotes: rawResponse.responseNotes || '',
                  createdAt: rawResponse.createdAt,
                  Video: rawResponse.Video,
                  videoId: rawResponse.videoId,
                  promptId: rawResponse.promptId,
                  privacyLevel: rawResponse.privacyLevel || 'private',
                  updatedAt: rawResponse.updatedAt,
                  airtableRecordId: rawResponse.airtableRecordId || null,
                  search_vector: rawResponse.search_vector || null,
                  PromptResponseAttachment: (rawResponse.PromptResponseAttachment || []).map(
                    (att: any): TopicPromptResponseAttachment => ({
                      id: att.id,
                      promptResponseId: rawResponse.id,
                      profileSharerId: rawResponse.profileSharerId,
                      fileUrl: att.fileUrl,
                      fileType: att.fileType,
                      fileName: att.fileName,
                      fileSize: att.fileSize || null,
                      title: att.title || null,
                      description: att.description || null,

                      uploadedAt: att.uploadedAt ? new Date(att.uploadedAt).toISOString() : null,
                      updatedAt: att.updatedAt ? new Date(att.updatedAt).toISOString() : null,
                      dateCaptured: att.dateCaptured ? new Date(att.dateCaptured).toISOString() : null,
                      yearCaptured: att.yearCaptured || null,
                    })
                  )
                }
              : null;


            return (
              areUrlsLoading ? (
                <LocalPromptCardSkeleton key={`skeleton-${prompt.id}`} />
              ) : (
              <Card
                key={prompt.id}
                className={cn(
                  "border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55] transition-all duration-300 h-[280px] md:h-[250px] flex flex-col bg-white",
                  hasResponse && "cursor-pointer"
                )}
                onClick={(e) => {
                  if (
                    e.target instanceof HTMLElement &&
                    !e.target.closest('button') &&
                    hasResponse
                  ) {
                    router.push(`/role-sharer/prompts/${prompt.id}`);
                  }
                }}
              >
                 <CardHeader className="pb-0 flex-none pt-4 px-4 md:pt-6 md:px-6">
                  <div className="flex flex-col">
                    <div className="flex items-start justify-between">
                      <div>
                        {prompt.isContextEstablishing && (
                          <div className="mb-1">
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-[#8fbc55] text-[#1B4332] rounded-full">
                              Start Here
                            </span>
                          </div>
                        )}
                        <CardTitle className="text-base leading-tight font-medium text-[#1B4332] group relative">
                          <span
                            className="line-clamp-4"
                            ref={(el) => {
                              if (el) {
                                promptRefs.current[prompt.id] = el;
                              }
                            }}
                          >
                            {prompt.promptText}
                          </span>
                          {overflowingPrompts.has(prompt.id) && (
                            <div className="absolute left-0 top-full z-50 hidden group-hover:block w-full">
                              <div className="bg-white border-2 border-[#1B4332] rounded-lg p-4 shadow-[4px_4px_0_0_#8fbc55] mt-2 max-w-[300px] text-sm whitespace-normal break-words">
                                <div className="absolute -top-2 left-4 w-4 h-4 bg-white border-l-2 border-t-2 border-[#1B4332] transform rotate-45" />
                                {prompt.promptText}
                              </div>
                            </div>
                          )}
                        </CardTitle>
                      </div>
                      {hasResponse && (
                        <CheckCircle2 className="h-5 w-5 text-[#8fbc55] flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                 <div className="flex-grow" />
                <div className="px-4 pb-4 md:px-6 md:pb-6 space-y-3">
                  <div className="flex justify-end h-9 items-center">
                     {renderGallery(promptResponse)}
                   </div>
                  {/* Buttons */}
                  <div className="flex gap-2">
                    {hasResponse ? (
                      <>
                        <Button
                          onClick={(e) => {
                             e.stopPropagation();
                            setSelectedPrompt(prompt);
                            setIsVideoPopupOpen(true);
                          }}
                          size="sm"
                          className="bg-[#1B4332] hover:bg-[#1B4332]/90 rounded-full flex-1 text-sm font-medium"
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Watch
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('[DEBUG] Paperclip button clicked, setting selectedPromptResponse and isAttachmentUploadOpen');
                            setSelectedPromptResponse(promptResponse);
                            setIsAttachmentUploadOpen(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full flex-1 text-sm font-medium"
                        >
                          <Paperclip className="mr-1 h-4 w-4" />
                          {promptResponse?.PromptResponseAttachment?.length || 0}
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1">
                          <TooltipProvider delayDuration={100}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span tabIndex={0} className="block w-full">
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                    }}
                                    variant="outline"
                                    size="sm"
                                    className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full w-full text-sm font-medium"
                                    disabled
                                    aria-disabled="true"
                                  >
                                    <VideoIcon className="mr-2 h-4 w-4" />
                                    Record
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Feature coming soon</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="flex-1">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPrompt(prompt);
                              setIsUploadPopupOpen(true);
                            }}
                            variant="outline"
                            size="sm"
                            className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full w-full text-sm font-medium"
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Card>
              )
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55]">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-[#1B4332]">
                <TableHead className="font-bold">Prompt</TableHead>
                <TableHead
                  className="font-bold text-center cursor-pointer hover:text-[#8fbc55]"
                  onClick={() => setSortByStatus(!sortByStatus)}
                >
                  Status {sortByStatus ? '↓' : '↑'}
                </TableHead>
                <TableHead className="font-bold text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPrompts.map((prompt: TopicPrompt) => {
                if (!prompt?.id) return null;
                if (areUrlsLoading) {
                  return <LocalPromptTableRowSkeleton key={`skeleton-${prompt.id}`} />;
                }

                const hasResponse = prompt?.PromptResponse?.[0]?.Video?.muxPlaybackId;
                const rawResponse = hasResponse ? prompt.PromptResponse[0] : null;
                const promptResponse: TopicPromptResponse | null = rawResponse
                  ? {
                      id: rawResponse.id,
                      profileSharerId: rawResponse.profileSharerId,
                      summary: rawResponse.summary || '',
                      responseNotes: rawResponse.responseNotes || '',
                      createdAt: rawResponse.createdAt,
                      Video: rawResponse.Video,
                      videoId: rawResponse.videoId,
                      promptId: rawResponse.promptId,
                      privacyLevel: rawResponse.privacyLevel || 'private',
                      updatedAt: rawResponse.updatedAt,
                      airtableRecordId: rawResponse.airtableRecordId || null,
                      search_vector: rawResponse.search_vector || null,
                      PromptResponseAttachment: (rawResponse.PromptResponseAttachment || []).map(
                        (att: any): TopicPromptResponseAttachment => ({
                          id: att.id,
                          promptResponseId: rawResponse.id,
                          profileSharerId: rawResponse.profileSharerId,
                          fileUrl: att.fileUrl,
                          fileType: att.fileType,
                          fileName: att.fileName,
                          fileSize: att.fileSize || null,
                          title: att.title || null,
                          description: att.description || null,

                          uploadedAt: att.uploadedAt ? new Date(att.uploadedAt).toISOString() : null,
                          updatedAt: att.updatedAt ? new Date(att.updatedAt).toISOString() : null,
                          dateCaptured: att.dateCaptured ? new Date(att.dateCaptured).toISOString() : null,
                          yearCaptured: att.yearCaptured || null,
                        })
                      )
                    }
                  : null;

                return (
                  <TableRow
                    key={prompt.id}
                    className={cn(
                      "hover:bg-gray-50/50 border-b border-[#1B4332] last:border-0",
                      hasResponse && "cursor-pointer"
                    )}
                    onClick={(e) => {
                      if (
                        e.target instanceof HTMLElement &&
                        !e.target.closest('button') &&
                        hasResponse
                      ) {
                        router.push(`/role-sharer/prompts/${prompt.id}`);
                      }
                    }}
                  >
                    <TableCell className="font-medium">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        {prompt.isContextEstablishing && (
                          <span className="inline-flex shrink-0 px-2 py-0.5 text-xs font-medium bg-[#8fbc55] text-[#1B4332] rounded-full w-fit">
                            Start Here
                          </span>
                        )}
                        <span className="flex-1">{prompt.promptText}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {hasResponse ? (
                        <CheckCircle2 className="h-6 w-6 text-[#8fbc55] inline-block" />
                      ) : (
                        <div className="h-6 w-6" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2 h-9">
                        {hasResponse ? (
                          <>
                            {renderGallery(promptResponse)}
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log('[DEBUG] Paperclip button clicked, setting selectedPromptResponse and isAttachmentUploadOpen');
                                setSelectedPromptResponse(promptResponse);
                                setIsAttachmentUploadOpen(true);
                              }}
                              variant="outline"
                              size="sm"
                              className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full h-9"
                            >
                              <Paperclip className="mr-1 h-4 w-4" />
                              {promptResponse?.PromptResponseAttachment?.length || 0}
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPrompt(prompt);
                                setIsVideoPopupOpen(true);
                              }}
                              size="sm"
                              className="bg-[#1B4332] hover:bg-[#1B4332]/90 rounded-full h-9"
                            >
                              <Play className="mr-2 h-4 w-4" />
                              Watch
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="flex-1">
                              <TooltipProvider delayDuration={100}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span tabIndex={0} className="block w-full">
                                      <Button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                        }}
                                        variant="outline"
                                        size="sm"
                                        className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full w-full text-sm font-medium"
                                        disabled
                                        aria-disabled="true"
                                      >
                                        <VideoIcon className="mr-2 h-4 w-4" />
                                        Record
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Feature coming soon</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <div className="flex-1">
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPrompt(prompt);
                                  setIsUploadPopupOpen(true);
                                }}
                                variant="outline"
                                size="sm"
                                className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full w-full text-sm font-medium"
                              >
                                <Upload className="mr-2 h-4 w-4" />
                                Upload
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Recording Popup - Pass the new handleSaveForRecordingInterface */}
      {isRecordingPopupOpen && selectedPrompt && (
        <VideoPopup
          open={isRecordingPopupOpen}
          onClose={handleCloseRecording}
          promptText={selectedPrompt.promptText}
          videoId=""
        >
          <RecordingInterface
            promptId={selectedPrompt.id}
            onClose={handleCloseRecording}
            onSave={handleSaveForRecordingInterface} // Pass the function that returns Promise<string>
          />
        </VideoPopup>
      )}

      {/* Upload Popup */}
      {isUploadPopupOpen && selectedPrompt && (
        <VideoPopup
          key={`upload-${selectedPrompt.id}`}
          open={isUploadPopupOpen}
          onClose={handleCloseUpload}
          promptText={selectedPrompt.promptText}
          videoId=""
        >
          <UploadInterface
            key={`upload-interface-${selectedPrompt.id}-${isUploadPopupOpen}`}
            promptId={selectedPrompt.id}
            onUploadSuccess={handleUploadFinished}
            promptText={selectedPrompt.promptText}
            targetSharerId={targetSharerId}
          />
        </VideoPopup>
      )}

      {/* Video Playback Popup (for watchers) */}
      {selectedPrompt && isVideoPopupOpen && selectedPrompt.PromptResponse?.[0]?.Video?.muxPlaybackId && (
        <VideoPopup
          open={isVideoPopupOpen}
          onClose={() => {
            setIsVideoPopupOpen(false);
            setSelectedPrompt(null);
          }}
          promptText={selectedPrompt.promptText}
          videoId={selectedPrompt.PromptResponse[0].Video.muxPlaybackId}
        />
      )}

      {/* Attachment Upload Dialog */}
      {selectedPromptResponse && (
        <AttachmentUpload
          promptResponseId={selectedPromptResponse.id}
          isOpen={isAttachmentUploadOpen}
          onClose={() => {
            setIsAttachmentUploadOpen(false);
            setSelectedPromptResponse(null);
          }}
           onUploadSuccess={refreshData}
           targetSharerId={targetSharerId}
        />
      )}

      {/* Attachment View/Edit Dialog */}
      {selectedAttachment && galleryAttachments.length > 0 && (
        <AttachmentDialog
          isOpen={!!selectedAttachment}
          onClose={() => setSelectedAttachment(null)}
          attachment={{
             id: selectedAttachment.id,
             fileUrl: selectedAttachment.fileUrl,
             fileType: selectedAttachment.fileType,
             fileName: selectedAttachment.fileName,
             title: selectedAttachment.title,
             description: selectedAttachment.description,
             dateCaptured: selectedAttachment.dateCaptured,
             yearCaptured: selectedAttachment.yearCaptured,
             PersonTags: selectedAttachment.PersonTags || [],
             profileSharerId: selectedAttachment.profileSharerId,
          }}
          onSave={handleDialogSave}
          onDelete={handleAttachmentDelete}
          onNext={handleNextAttachment}
          onPrevious={handlePreviousAttachment}
          hasNext={hasNext}
          hasPrevious={hasPrevious}
          onDownload={handleDownloadAttachment ? () => handleDownloadAttachment(selectedAttachment) : undefined}
        />
      )}
    </div>
  );
};

export default function TopicPage() {
  const router = useRouter();
  const supabase = createClient();
  
  // Use hooks to get params and searchParams
  const params = useParams();
  const searchParams = useSearchParams();
  const topicId = params.id as string; // Cast as string
  const sharerIdFromParams = searchParams.get('sharerId'); // Use .get()

  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [sortByStatus, setSortByStatus] = useState<boolean>(false);
  const [selectedPrompt, setSelectedPrompt] = useState<TopicPrompt | null>(null);
  const [selectedPromptResponse, setSelectedPromptResponse] = useState<TopicPromptResponse | null>(null);
  const [isVideoPopupOpen, setIsVideoPopupOpen] = useState<boolean>(false);
  const [isRecordingPopupOpen, setIsRecordingPopupOpen] = useState<boolean>(false);
  const [isUploadPopupOpen, setIsUploadPopupOpen] = useState<boolean>(false);
  const [isAttachmentUploadOpen, setIsAttachmentUploadOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<LocalUIAttachment | null>(null);
  const [currentAttachmentIndex, setCurrentAttachmentIndex] = useState<number>(0);
  const [galleryAttachments, setGalleryAttachments] = useState<LocalUIAttachment[]>([]);
  const [gallerySignedUrls, setGallerySignedUrls] = useState<Record<string, string>>({});
  const [areUrlsLoading, setAreUrlsLoading] = useState<boolean>(false);

  const [targetSharerId, setTargetSharerId] = useState<string | null>(null);
  const [sharerProfileData, setSharerProfileData] = useState<ProfileSharer | null>(null);
  const [promptCategory, setPromptCategory] = useState<TopicPromptCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Polling state
  const [pollingVideoId, setPollingVideoId] = useState<string | null>(null);
  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const POLLING_INTERVAL_MS = 5000; // Check every 5 seconds
  const POLLING_TIMEOUT_MS = 120000; // Stop after 2 minutes

  // --- Navigation and Download Handlers (for Sharer) ---
  const handleNextAttachment = useCallback(() => {
    setCurrentAttachmentIndex((prevIndex) => {
      const nextIndex = prevIndex + 1;
      if (nextIndex < galleryAttachments.length) {
        setSelectedAttachment(galleryAttachments[nextIndex]);
        return nextIndex;
      } else {
        setSelectedAttachment(galleryAttachments[0]);
        return 0;
      }
    });
  }, [galleryAttachments]);

  const handlePreviousAttachment = useCallback(() => {
    setCurrentAttachmentIndex((prevIndex) => {
      const prevIdx = prevIndex - 1;
      if (prevIdx >= 0) {
        setSelectedAttachment(galleryAttachments[prevIdx]);
        return prevIdx;
      } else {
        const lastIndex = galleryAttachments.length - 1;
        setSelectedAttachment(galleryAttachments[lastIndex]);
        return lastIndex;
      }
    });
  }, [galleryAttachments]);

  const hasNext = useMemo(() => galleryAttachments.length > 1, [galleryAttachments.length]);
  const hasPrevious = useMemo(() => galleryAttachments.length > 1, [galleryAttachments.length]);

  const handleDownloadAttachment = useCallback(async (attachmentToDownload: LocalUIAttachment) => {
    if (!attachmentToDownload?.fileUrl) {
      toast.error("Cannot download: file information missing.");
      return;
    }
    console.log(`[TopicPage] Downloading attachment: ${attachmentToDownload.fileName}`);
    const downloadToast = toast.loading("Preparing download...");
    try {
      const filePath = attachmentToDownload.fileUrl;
      const { data, error } = await supabase.storage
        .from('attachments')
        .download(filePath);

      if (error) throw error;

      if (data) {
        const url = URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.download = attachmentToDownload.fileName || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("Download started!", { id: downloadToast });
      }
    } catch (error) {
      console.error('[TopicPage] Error downloading file:', error);
      toast.error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: downloadToast });
    }
  }, [supabase.storage]);

  const fetchAllSignedUrls = useCallback(async (attachments: TopicPromptResponseAttachment[], p_sharer_id: string) => {
      if (!p_sharer_id) {
          console.warn('[fetchAllSignedUrls] Aborting: p_sharer_id is missing.');
          setAreUrlsLoading(false);
          return;
        }
      if (!attachments || attachments.length === 0) {
        console.log('[fetchAllSignedUrls] No attachments provided or empty array.');
        setGalleryAttachments([]);
        setGallerySignedUrls({});
        setAreUrlsLoading(false);
        return;
      }

      console.log(`[fetchAllSignedUrls] Starting fetch for ${attachments.length} attachments, sharerId: ${p_sharer_id}`);
      setAreUrlsLoading(true);
      const newSignedUrls: Record<string, string> = {};
      const allUiAttachments: LocalUIAttachment[] = [];
      let fetchedCount = 0;
      let errorCount = 0;

      const urlPromises = attachments.map(async (attachment) => {
          const filePath = attachment.fileUrl;

          // *** ADDED DEBUGGING ***
          console.log(`[fetchAllSignedUrls - Sharer] Processing attachment ID: ${attachment.id}, raw fileUrl from DB: '${filePath}'`);

          if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
               console.warn(`[fetchAllSignedUrls] Invalid or empty filePath for attachment ID ${attachment.id}:`, filePath);
               return { attachment, signedUrl: null, error: 'Invalid file path' };
          }

           try {
                // *** FIX: Remove prepending p_sharer_id. Assume filePath contains the correct relative path. ***
                const fullStoragePath = filePath; 
               // *** ADDED DEBUGGING ***
                console.log(`[fetchAllSignedUrls - Sharer] Using storage path: '${fullStoragePath}' for signing.`);

               const { data: signedUrlData, error: signError } = await supabase.storage
                  .from('attachments')
                  .createSignedUrl(fullStoragePath, 3600);

              if (signError) {
                  console.error(`[fetchAllSignedUrls] Error creating signed URL for ${fullStoragePath}:`, signError);
                  return { attachment, signedUrl: null, error: signError.message };
              }
              if (!signedUrlData?.signedUrl) {
                   console.warn(`[fetchAllSignedUrls] No signed URL returned for ${fullStoragePath}, though no error reported.`);
                   return { attachment, signedUrl: null, error: 'No signed URL returned' };
              }

              console.log(`[fetchAllSignedUrls] Successfully got signed URL for attachment ${attachment.id}`);
              return { attachment, signedUrl: signedUrlData.signedUrl, error: null };
          } catch (err) {
              console.error(`[fetchAllSignedUrls] Unexpected error signing URL for attachment ${attachment.id}:`, err);
              return { attachment, signedUrl: null, error: err instanceof Error ? err.message : 'Unknown signing error' };
          }
      });

      const results = await Promise.allSettled(urlPromises);

       results.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
              const { attachment, signedUrl, error } = result.value;
              const uiAttachment = {
                 ...toLocalUIAttachment(attachment),
                 signedUrl: signedUrl,
                 displayUrl: signedUrl || attachment.fileUrl
              };
              allUiAttachments.push(uiAttachment);

              if (signedUrl) {
                  newSignedUrls[attachment.id] = signedUrl;
                  fetchedCount++;
              } else {
                   console.warn(`[fetchAllSignedUrls] Failed to get signed URL for attachment ${attachment.id}. Error: ${error || 'Unknown reason'}`);
                   errorCount++;
              }
          } else if (result.status === 'rejected') {
              console.error('[fetchAllSignedUrls] Promise rejected:', result.reason);
              errorCount++;
          }
      });

      console.log(`[fetchAllSignedUrls] Finished fetching. Success: ${fetchedCount}, Failures: ${errorCount}, Total Processed: ${allUiAttachments.length}`);
      setGallerySignedUrls(prev => ({ ...prev, ...newSignedUrls }));
      setGalleryAttachments(allUiAttachments);
      setAreUrlsLoading(false);

    }, [supabase]);

    const fetchData = useCallback(async (p_topic_id: string, p_sharer_id: string) => {
      if (!p_sharer_id) {
        console.warn("[fetchData] Attempted to fetch data without a valid p_sharer_id. Aborting.");
        setError("Cannot load data: Sharer context is missing.");
        setLoading(false);
        return;
    }
    if (!p_topic_id) {
        console.warn("[fetchData] Attempted to fetch data without a valid p_topic_id. Aborting.");
        setError("Cannot load data: Topic context is missing.");
        setLoading(false);
        return;
    }

    console.log(`[fetchData] Fetching data for topicId: ${p_topic_id}, sharerId: ${p_sharer_id}`);
    setLoading(true);
    setError(null);

    try {
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
       if (authError || !currentUser) {
          setError("Authentication issue occurred during data fetch.");
          setLoading(false);
          return;
       }

      const { data, error: rpcError } = await supabase.rpc('get_prompt_category_with_details', {
        p_category_id: p_topic_id,
        p_sharer_id: p_sharer_id
      });

      if (rpcError) {
        console.error('Error fetching prompt category data via RPC:', rpcError);
        throw new Error(`Failed to load topic data: ${rpcError.message}`);
      }

      if (!data) {
          console.warn(`[fetchData] No data returned for topic ${p_topic_id} and sharer ${p_sharer_id}. Setting empty state.`);
          setPromptCategory(null);
          setGalleryAttachments([]);
      } else {
          console.log(`[fetchData] Successfully fetched data for topic ${p_topic_id}. Processing...`);
          setPromptCategory(data as TopicPromptCategory);

          const allAttachmentsRaw = data.Prompt?.flatMap((p: TopicPrompt) => p.PromptResponse?.flatMap(pr => pr.PromptResponseAttachment || []) || []) || [];

           if (allAttachmentsRaw.length > 0) {
              console.log(`[fetchData] Found ${allAttachmentsRaw.length} raw attachments. Fetching signed URLs.`);
              await fetchAllSignedUrls(allAttachmentsRaw, p_sharer_id);
           } else {
              console.log("[fetchData] No attachments found for this topic/sharer.");
              setGalleryAttachments([]);
              setGallerySignedUrls({});
              setAreUrlsLoading(false);
           }
      }

    } catch (err) {
      console.error('[fetchData] Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during data fetch.');
      setPromptCategory(null);
      setGalleryAttachments([]);
      setGallerySignedUrls({});
    } finally {
      setLoading(false);
      console.log('[fetchData] Fetching complete.');
    }
  }, [supabase, fetchAllSignedUrls]);

   const initialize = useCallback(async () => {
     setLoading(true);
     setError(null);
     console.log('[TopicPage] Initializing...');

     try {
       const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
       if (authError || !authUser) {
         console.error('Authentication error or no user found:', authError);
         setError('Authentication failed. Please log in.');
         router.push('/login');
          return;
        }
       setUser(authUser);
       console.log('[TopicPage] User authenticated:', authUser.id);

       let effectiveSharerId: string | null = null;
       // Use sharerIdFromParams obtained from useSearchParams hook
       if (sharerIdFromParams) {
           console.log(`[TopicPage] Executor context. Using sharerId: ${sharerIdFromParams}`);
           effectiveSharerId = sharerIdFromParams;
       } else {
           console.log('[TopicPage] Sharer context. Fetching Sharer ID via direct query.');
           // Fetch Sharer ID using a direct query instead of missing RPC
           const { data: ownSharerData, error: sharerFetchError } = await supabase
            .from('ProfileSharer')
            .select('id') // Select only the ID
            .eq('profileId', authUser.id) // Match the authenticated user's ID
            .maybeSingle(); // Expect 0 or 1 result

           if (sharerFetchError) {
             console.error('Error fetching own sharer ID via query:', sharerFetchError);
             setError('Could not determine your Sharer profile.');
             setLoading(false);
              return;
            }
            if (!ownSharerData?.id) {
              console.error('Could not find ProfileSharer record for user:', authUser.id);
              setError('Could not determine your Sharer profile.');
              setLoading(false);
              return;
            }
           effectiveSharerId = ownSharerData.id;
           console.log('[TopicPage] Found own Sharer ID via query:', effectiveSharerId);
       }

       if (!effectiveSharerId) {
          console.error('[TopicPage] Failed to determine targetSharerId after checks.');
          setError('Could not identify the target Sharer.');
          setLoading(false);
          return;
       }

       console.log(`[TopicPage] Setting targetSharerId: ${effectiveSharerId}`);
       setTargetSharerId(effectiveSharerId);

       // Use topicId obtained from useParams hook
       console.log(`[TopicPage] Fetching initial data for topicId: ${topicId} and sharerId: ${effectiveSharerId}`);
       await fetchData(topicId, effectiveSharerId);

     } catch (err) {
       console.error('[TopicPage] Unexpected error during initialization:', err);
       setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
     } finally {
        console.log('[TopicPage] Initialization complete.');
        setLoading(false);
     }
     // Ensure hooks used inside are listed as dependencies if needed, 
     // though params/searchParams are stable references from hooks
   }, [topicId, sharerIdFromParams, supabase, router, fetchData]); 

   const refreshData = useCallback(async () => {
     if (targetSharerId) {
       console.log(`[refreshData] Refreshing data for topicId: ${topicId}, sharerId: ${targetSharerId}`);
       await fetchData(topicId, targetSharerId);
     } else {
         console.warn("[refreshData] Cannot refresh data, targetSharerId is not set.");
         setError("Cannot refresh data: Sharer context lost.");
     }
   }, [topicId, targetSharerId, fetchData]);

  useEffect(() => {
    initialize();
  }, [initialize]);


  // Ensure handleVideoComplete remains as it was (handling Mux upload)
  const handleVideoComplete = useCallback(async (blob: Blob): Promise<string> => {
    if (!selectedPrompt || !targetSharerId) {
        throw new Error("Cannot complete video: No prompt selected or Sharer context missing.");
    }

    console.log(`[handleVideoComplete] Initiating video processing for prompt ${selectedPrompt.id}, sharer ${targetSharerId}`);

    // Step 1: Request the signed upload URL from our backend
    let uploadUrl: string | null = null;
    let videoId: string | null = null;

    try {
      const urlResponse = await fetch('/api/mux/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          promptId: selectedPrompt.id,
          targetSharerId: targetSharerId, // Send the target sharer ID
        }),
      });

      if (!urlResponse.ok) {
        const errorResult = await urlResponse.json();
        throw new Error(errorResult.error || `Failed to get upload URL: ${urlResponse.statusText}`);
      }

      const urlResult = await urlResponse.json();
      uploadUrl = urlResult.uploadUrl;
      videoId = urlResult.videoId;

      if (!uploadUrl || !videoId) {
        throw new Error('Invalid response from upload URL endpoint.');
      }

      console.log(`[handleVideoComplete] Received Mux upload URL and videoId: ${videoId}`);

    } catch (error) {
      console.error('[handleVideoComplete] Error getting upload URL:', error);
      throw error; // Rethrow to be caught by handleRecordingComplete
    }

    // Step 2: Upload the blob directly to Mux using the signed URL
    try {
      const muxUploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: {
          // Mux often infers content type, but specifying it can be safer
          'Content-Type': blob.type || 'video/webm', 
        },
      });

      if (!muxUploadResponse.ok) {
        // Attempt to get error details from Mux response if possible
        let errorText = `Mux upload failed: ${muxUploadResponse.statusText}`;
        try {
           const muxError = await muxUploadResponse.text(); // Mux might return plain text errors
           errorText += ` - ${muxError}`;
        } catch (_) { /* Ignore if parsing fails */ }
        throw new Error(errorText);
      }

      console.log(`[handleVideoComplete] Successfully uploaded blob to Mux for videoId: ${videoId}`);
      return videoId; // Return the videoId on successful Mux upload

    } catch (error) {
      console.error('[handleVideoComplete] Error uploading to Mux:', error);
      // Optional: Attempt to delete the video record if Mux upload fails?
      // await supabase.from('Video').delete().eq('id', videoId);
      throw error; // Rethrow to be caught by handleRecordingComplete
    }
  }, [selectedPrompt, targetSharerId, supabase]);

  const handleCloseRecording = useCallback(() => {
    setIsRecordingPopupOpen(false);
    setSelectedPrompt(null);
  }, []);

  const handleCloseUpload = useCallback(() => {
    setIsUploadPopupOpen(false);
    setSelectedPrompt(null);
  }, []);

  // --- Polling Logic ---
  const stopPolling = useCallback(() => {
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    setPollingVideoId(null);
  }, [pollingIntervalId]);

  const checkVideoStatus = useCallback(async (videoIdToCheck: string) => {
    if (!promptCategory) return false; // Need data to check against

    console.log(`[Polling] Checking status for videoId: ${videoIdToCheck}`);
    
    for (const prompt of promptCategory.Prompt || []) {
      const response = prompt.PromptResponse?.[0];
      if (response?.Video?.id === videoIdToCheck) {
        console.log(`[Polling] Found video record. Status: ${response.Video.status}, PlaybackId: ${response.Video.muxPlaybackId}`);
        return response.Video.status === 'READY' && !!response.Video.muxPlaybackId;
      }
    }
    console.log(`[Polling] Video record not found in current data for ID: ${videoIdToCheck}`);
    return false; // Video not found in current data
  }, [promptCategory]);

  const startPollingVideoStatus = useCallback((videoId: string) => {
    console.log(`[Polling] Starting polling for videoId: ${videoId}`);
    stopPolling(); // Stop any previous polling
    setPollingVideoId(videoId);

    const intervalId = setInterval(async () => {
      console.log(`[Polling] Interval check for ${videoId}`);
      await refreshData(); // Fetch latest data
      // Check status *after* refresh completes
      // Need a slight delay or use effect based on promptCategory update
      setTimeout(async () => {
         const isReady = await checkVideoStatus(videoId);
         if (isReady) {
           console.log(`[Polling] Video ${videoId} is ready! Stopping polling.`);
           toast.success("Video is processed and ready!");
           stopPolling();
         }
      }, 500); // Small delay to allow state update after refresh

    }, POLLING_INTERVAL_MS);

    setPollingIntervalId(intervalId);

    // Set a timeout to stop polling eventually
    pollingTimeoutRef.current = setTimeout(() => {
      console.warn(`[Polling] Timeout reached for videoId: ${videoId}. Stopping polling.`);
      toast.warning("Video processing is taking longer than expected. It might still become available shortly.", { duration: 10000 });
      stopPolling();
    }, POLLING_TIMEOUT_MS);

  }, [stopPolling, refreshData, checkVideoStatus]);

  // Update handleUploadFinished to potentially start polling as well
  // For consistency, although UploadInterface might already handle delay
  const handleUploadFinished = useCallback(async (videoId: string, playbackId: string) => {
    if (!targetSharerId) {
        toast.error("Failed to finalize upload: Sharer context missing.");
        return;
    }
    // Start polling for the uploaded video
    startPollingVideoStatus(videoId);
    // Keep the initial success message or move it to when polling succeeds
    // toast.success("Video upload finalized!"); // Optional: Keep or remove
    await refreshData(); // Initial refresh is still good
  }, [refreshData, targetSharerId, startPollingVideoStatus]);

  const handleAttachmentSave = useCallback(async (updatedAttachment: LocalUIAttachment) => {
    if (!updatedAttachment?.id || !targetSharerId) {
        toast.error("Save failed: Invalid data or Sharer context missing.");
        return;
    }
    console.log(`[handleAttachmentSave] Saving attachment ID: ${updatedAttachment.id} for sharer ${targetSharerId}`);
    const savingToast = toast.loading("Saving attachment details...");
    try {
        const dataToUpdate: Partial<TopicPromptResponseAttachment> = {
            title: updatedAttachment.title,
            description: updatedAttachment.description,
            dateCaptured: updatedAttachment.dateCaptured instanceof Date
                ? updatedAttachment.dateCaptured.toISOString()
                : null,
        };
         const { error: updateError } = await supabase
             .from('PromptResponseAttachment')
             .update(dataToUpdate)
             .eq('id', updatedAttachment.id);
         if (updateError) throw new Error(`Failed to save: ${updateError.message}`);
         setGalleryAttachments(prev => prev.map(att => att.id === updatedAttachment.id ? updatedAttachment : att));
         if (selectedAttachment?.id === updatedAttachment.id) setSelectedAttachment(updatedAttachment);
         toast.success("Attachment saved!", { id: savingToast });
    } catch (error) {
        console.error('[handleAttachmentSave] Error:', error);
        toast.error(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: savingToast });
    }
  }, [supabase, targetSharerId, selectedAttachment, galleryAttachments]);

  const handleAttachmentDelete = useCallback(async (attachmentId: string) => {
    if (!attachmentId || !targetSharerId) {
      toast.error("Delete failed: Invalid ID or Sharer context missing.");
      return;
    }
    console.log(`[handleAttachmentDelete] Deleting attachment ID: ${attachmentId} for sharer ${targetSharerId}`);
    const deletingToast = toast.loading("Deleting attachment...");
    try {
        const attachmentToDelete = galleryAttachments.find(att => att.id === attachmentId);
        let storageError = null;
        if (attachmentToDelete?.fileUrl) {
            const storagePath = `${targetSharerId}/${attachmentToDelete.fileUrl}`;
            const { error } = await supabase.storage.from('attachments').remove([storagePath]);
            if (error) {
                 console.error(`Storage deletion error for ${storagePath}:`, error);
                 storageError = error;
            }
        }
        const { error: dbError } = await supabase.from('PromptResponseAttachment').delete().eq('id', attachmentId);
        if (dbError) throw new Error(`Database delete failed: ${dbError.message}`);
        let toastMessage = "Attachment deleted.";
        if (storageError) {
           toastMessage += " (Storage cleanup failed)";
           toast.warning(toastMessage, { id: deletingToast });
        } else {
           toast.success(toastMessage, { id: deletingToast });
        }
        if (selectedAttachment?.id === attachmentId) setSelectedAttachment(null);
        await refreshData();
    } catch (error) {
        console.error('[handleAttachmentDelete] Error:', error);
        toast.error(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: deletingToast });
    } finally {
        if (selectedAttachment?.id === attachmentId) setSelectedAttachment(null);
    }
  }, [supabase, targetSharerId, galleryAttachments, selectedAttachment, refreshData]);

  // FIX: Create a wrapper for onSave prop of AttachmentDialog
  const handleDialogSaveWrapper = useCallback(async (dialogAttachment: Attachment) => {
    // Find the original full attachment data from state using the ID
    const originalUiAttachment = galleryAttachments.find(att => att.id === dialogAttachment.id);

    if (!originalUiAttachment) {
      toast.error("Save failed: Could not find original attachment data.");
      return;
    }

    // Create the updated LocalUIAttachment by merging changes from the dialog
    const updatedUiAttachment: LocalUIAttachment = {
      ...originalUiAttachment, // Start with the full original object
      title: dialogAttachment.title, // Update changed fields
      description: dialogAttachment.description,
      dateCaptured: dialogAttachment.dateCaptured ? new Date(dialogAttachment.dateCaptured) : null,
      // Add any other fields potentially changed by the dialog if the Attachment type includes them
    };

    // Call the main save handler which expects the full LocalUIAttachment
    await handleAttachmentSave(updatedUiAttachment);
  }, [galleryAttachments, handleAttachmentSave]);

  // Cleanup polling on unmount
  useEffect(() => {
     return () => {
        stopPolling();
     };
  }, [stopPolling]);

  // --- Render Logic ---

  if (loading && !promptCategory) {
      console.log('[TopicPage] Rendering initial loading state.');
    return (
          <div className="flex justify-center items-center h-screen">
              <Loader2 className="h-12 w-12 animate-spin text-gray-500" />
          </div>
    );
  }

  if (error) {
    console.log('[TopicPage] Rendering error state:', error);
    return (
        <div className="container mx-auto px-4 py-8 text-center">
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
             <Button onClick={() => window.location.reload()} className="mt-4">Retry</Button>
        </div>
    );
  }

   if (!targetSharerId) {
       console.log('[TopicPage] Rendering missing Sharer context state.');
       return (
           <div className="container mx-auto px-4 py-8 text-center">
               <Alert variant="destructive">
                   <AlertCircle className="h-4 w-4" />
                   <AlertTitle>Error</AlertTitle>
                   <AlertDescription>Could not determine the Sharer context for this page.</AlertDescription>
               </Alert>
           </div>
       );
   }

  if (!promptCategory && !loading) {
      console.log('[TopicPage] Rendering no data found state.');
      return (
           <div className="container mx-auto px-4 py-8 text-center">
               <Alert>
                   <Info className="h-4 w-4" />
                   <AlertTitle>No Data Found</AlertTitle>
                   <AlertDescription>Could not find topic data for the specified sharer.</AlertDescription>
               </Alert>
           </div>
       );
   }

  console.log(`[TopicPage] Rendering TopicPageContent with targetSharerId: ${targetSharerId}`);
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
        {targetSharerId && (
            <TopicPageContent
                promptCategory={promptCategory}
                viewMode={viewMode}
                sortByStatus={sortByStatus}
                isVideoPopupOpen={isVideoPopupOpen}
                isRecordingPopupOpen={isRecordingPopupOpen}
                isUploadPopupOpen={isUploadPopupOpen}
                isAttachmentUploadOpen={isAttachmentUploadOpen}
                selectedPrompt={selectedPrompt}
                selectedPromptResponse={selectedPromptResponse}
                setViewMode={setViewMode}
                setSortByStatus={setSortByStatus}
                setSelectedPrompt={setSelectedPrompt}
                setSelectedPromptResponse={setSelectedPromptResponse}
                setIsVideoPopupOpen={setIsVideoPopupOpen}
                setIsRecordingPopupOpen={setIsRecordingPopupOpen}
                setIsUploadPopupOpen={setIsUploadPopupOpen}
                setIsAttachmentUploadOpen={setIsAttachmentUploadOpen}
                handleVideoComplete={handleVideoComplete}
                onRecordingSaved={startPollingVideoStatus}
                handleCloseRecording={handleCloseRecording}
                handleCloseUpload={handleCloseUpload}
                refreshData={refreshData}
                router={router}
                gallerySignedUrls={gallerySignedUrls}
                areUrlsLoading={areUrlsLoading}
                galleryAttachments={galleryAttachments}
                setSelectedAttachment={setSelectedAttachment}
                setCurrentAttachmentIndex={setCurrentAttachmentIndex}
                selectedAttachment={selectedAttachment}
                currentAttachmentIndex={currentAttachmentIndex}
                handleAttachmentSave={handleAttachmentSave}
                handleAttachmentDelete={handleAttachmentDelete}
                handleUploadFinished={handleUploadFinished}
                targetSharerId={targetSharerId}
                sharerProfileData={sharerProfileData}
                handleNextAttachment={handleNextAttachment}
                handlePreviousAttachment={handlePreviousAttachment}
                hasNext={hasNext}
                hasPrevious={hasPrevious}
                handleDownloadAttachment={handleDownloadAttachment}
            />
        )}

        {selectedAttachment && (
             <AttachmentDialog
                 isOpen={!!selectedAttachment}
                 onClose={() => setSelectedAttachment(null)}
                 attachment={{
                      id: selectedAttachment.id,
                      fileUrl: selectedAttachment.fileUrl,
                      fileType: selectedAttachment.fileType,
                      fileName: selectedAttachment.fileName,
                      title: selectedAttachment.title,
                      description: selectedAttachment.description,
                      dateCaptured: selectedAttachment.dateCaptured,
                      yearCaptured: selectedAttachment.yearCaptured,
                      PersonTags: selectedAttachment.PersonTags || [],
                      profileSharerId: selectedAttachment.profileSharerId,
                   }}
                 onSave={handleDialogSaveWrapper}
                 onDelete={handleAttachmentDelete}
                 onNext={handleNextAttachment}
                 onPrevious={handlePreviousAttachment}
                 hasNext={hasNext}
                 hasPrevious={hasPrevious}
                 onDownload={() => selectedAttachment && handleDownloadAttachment(selectedAttachment)}
             />
        )}

    </ErrorBoundary>
  );
}