"use client";

export const runtime = 'nodejs';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordingInterface } from '@/components/RecordingInterface';
import { VideoPopup } from '@/components/VideoPopup';
import { UploadInterface } from '@/components/UploadInterface';
import { ArrowLeft, Video as VideoIcon, Play, CheckCircle2, LayoutGrid, Table as TableIcon, Upload, Paperclip } from 'lucide-react';
import { PromptCategory, Prompt, PromptResponse } from '@/types/models';
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
import { AttachmentDialog } from '@/components/AttachmentDialog';
import { MuxPlayer } from '@/components/MuxPlayer';
import { UIAttachment, toUIAttachment } from '@/types/component-interfaces';
import { TopicVideoCard } from '@/components/TopicVideoCard';
import { useAuth } from '@/hooks/useAuth';

// Add diagnostic log for useAuth import
console.log('[DIAGNOSTIC] useAuth imported:', typeof useAuth);

const AttachmentUpload = dynamic(() => import('@/components/AttachmentUpload'), {
  loading: () => <p>Loading...</p>
});

interface TopicPageContentProps {
  promptCategory: PromptCategory | null;
  viewMode: 'table' | 'grid';
  sortByStatus: boolean;
  isVideoPopupOpen: boolean;
  isRecordingPopupOpen: boolean;
  isUploadPopupOpen: boolean;
  isAttachmentUploadOpen: boolean;
  selectedPrompt: Prompt | null;
  selectedPromptResponse: PromptResponse | null;
  setViewMode: (mode: 'table' | 'grid') => void;
  setSortByStatus: (status: boolean) => void;
  setSelectedPrompt: (prompt: Prompt | null) => void;
  setSelectedPromptResponse: (response: PromptResponse | null) => void;
  setIsVideoPopupOpen: (open: boolean) => void;
  setIsRecordingPopupOpen: (open: boolean) => void;
  setIsUploadPopupOpen: (open: boolean) => void;
  setIsAttachmentUploadOpen: (open: boolean) => void;
  handleVideoComplete: (blob: Blob) => Promise<string>;
  handleCloseRecording: () => void;
  handleCloseUpload: () => void;
  refreshData: () => Promise<void>;
  router: ReturnType<typeof useRouter>;
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

// Main content component
const TopicPageContent: React.FC<TopicPageContentProps> = ({
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
  handleCloseRecording,
  handleCloseUpload,
  refreshData,
  router
}) => {
  // Add diagnostic log for promptCategory
  console.log('[DIAGNOSTIC] TopicPageContent rendering with promptCategory:', 
    promptCategory ? {
      id: promptCategory.id,
      category: promptCategory.category,
      promptsCount: promptCategory.prompts?.length || 0
    } : null
  );

  const [selectedAttachment, setSelectedAttachment] = useState<{
    attachment: any;
    attachments: any[];
    currentIndex: number;
  } | null>(null);
  const [overflowingPrompts, setOverflowingPrompts] = useState<Set<string>>(new Set());
  const promptRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const [gallerySignedUrls, setGallerySignedUrls] = useState<Record<string, string>>({});

  // Define fetchSignedUrls at component level
  const fetchSignedUrls = useCallback(async (promptResponse: PromptResponse | null) => {
    if (!promptResponse?.PromptResponseAttachment?.length) return;

    const supabase = createClient();
    const newSignedUrls: Record<string, string> = {};

    for (const attachment of promptResponse.PromptResponseAttachment) {
      if (!attachment.fileUrl) continue;

      try {
        const filePath = attachment.fileUrl.includes('attachments/') 
          ? attachment.fileUrl.split('attachments/')[1]
          : attachment.fileUrl;

        const { data, error } = await supabase
          .storage
          .from('attachments')
          .createSignedUrl(filePath, 3600);

        if (!error && data?.signedUrl) {
          newSignedUrls[attachment.id] = data.signedUrl;
        }
      } catch (error) {
        console.error('Error getting signed URL:', error);
      }
    }

    setGallerySignedUrls(prev => ({
      ...prev,
      ...newSignedUrls
    }));
  }, []);

  // Check for prompt text overflow for tooltip display
  useEffect(() => {
    Object.entries(promptRefs.current).forEach(([promptId, element]) => {
      if (element && element.scrollHeight > element.clientHeight) {
        setOverflowingPrompts(prev => new Set([...Array.from(prev), promptId]));
      }
    });
  }, [promptCategory]);

  // Whenever we have a selectedPromptResponse, convert its raw attachments to UIAttachments
  useEffect(() => {
    console.log('[DEBUG] selectedPromptResponse effect triggered:', { 
      hasAttachments: !!selectedPromptResponse?.PromptResponseAttachment, 
      isAttachmentUploadOpen,
      attachmentCount: selectedPromptResponse?.PromptResponseAttachment?.length || 0
    });
    
    // Only set selectedAttachment if we're not opening the upload dialog
    if (selectedPromptResponse?.PromptResponseAttachment && !isAttachmentUploadOpen) {
      const rawAttachments = selectedPromptResponse.PromptResponseAttachment;
      const uiAttachments: UIAttachment[] = rawAttachments.map((att) => toUIAttachment(att));
      setSelectedAttachment({
        attachment: uiAttachments[0],
        attachments: uiAttachments,
        currentIndex: 0
      });
      console.log('[DEBUG] Setting selectedAttachment with', uiAttachments.length, 'attachments');

      // Then fetch the signed URLs for them
      void fetchSignedUrls(selectedPromptResponse);
    } else if (!isAttachmentUploadOpen && !selectedPromptResponse?.PromptResponseAttachment) {
      console.log('[DEBUG] Clearing selectedAttachment');
      setSelectedAttachment(null);
    } else {
      console.log('[DEBUG] Not changing selectedAttachment state');
    }
  }, [selectedPromptResponse, fetchSignedUrls, isAttachmentUploadOpen]);

  // Fetch signed URLs when selectedPromptResponse changes
  useEffect(() => {
    if (selectedPromptResponse) {
      void fetchSignedUrls(selectedPromptResponse);
    }
  }, [selectedPromptResponse, fetchSignedUrls]);

  // Fetch signed URLs for all prompts
  useEffect(() => {
    const fetchAllSignedUrls = async () => {
      if (!promptCategory?.prompts) return;

      const supabase = createClient();
      const newSignedUrls: Record<string, string> = {};

      for (const prompt of promptCategory.prompts) {
        const response = prompt.PromptResponse?.[0];
        if (!response?.PromptResponseAttachment?.length) continue;

        for (const attachment of response.PromptResponseAttachment) {
          if (!attachment.fileUrl) continue;

          try {
            const filePath = attachment.fileUrl.includes('attachments/') 
              ? attachment.fileUrl.split('attachments/')[1]
              : attachment.fileUrl;

            const { data, error } = await supabase
              .storage
              .from('attachments')
              .createSignedUrl(filePath, 3600);

            if (!error && data?.signedUrl) {
              newSignedUrls[attachment.id] = data.signedUrl;
            }
          } catch (error) {
            console.error('Error getting signed URL:', error);
          }
        }
      }

      setGallerySignedUrls(newSignedUrls);
    };

    void fetchAllSignedUrls();
  }, [promptCategory?.prompts]);

  // Render gallery
  const renderGallery = useCallback((promptResponse: PromptResponse | null) => {
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

      return (
        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
          {viewableAttachments.map((attachment, index) => {
            const signedUrl = gallerySignedUrls[attachment.id];
            const displayUrl = signedUrl || attachment.fileUrl;

            return (
              <div
                key={attachment.id}
                className="relative w-9 h-9 hover:z-10 cursor-pointer last:mr-0 mr-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedAttachment({
                    attachment: {
                      ...toUIAttachment(attachment),
                      signedUrl: gallerySignedUrls[attachment.id],
                      displayUrl: gallerySignedUrls[attachment.id] || attachment.fileUrl
                    },
                    attachments: viewableAttachments.map(att => ({
                      ...toUIAttachment(att),
                      signedUrl: gallerySignedUrls[att.id],
                      displayUrl: gallerySignedUrls[att.id] || att.fileUrl
                    })),
                    currentIndex: index
                  });
                }}
              >
                <AttachmentThumbnail
                  attachment={{
                    id: attachment.id,
                    fileUrl: displayUrl,
                    fileName: attachment.fileName,
                    fileType: attachment.fileType,
                    description: attachment.description,
                    dateCaptured: attachment.dateCaptured ? new Date(attachment.dateCaptured) : null,
                    yearCaptured: attachment.yearCaptured,
                    signedUrl
                  }}
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
      return null;
    }
  }, [gallerySignedUrls]);

  // Handle upload success
  const handleUploadSuccess = useCallback(async (playbackId: string) => {
    // Show success toast
    toast.success('Video uploaded successfully!');
    
    // Close the popup immediately
    setIsUploadPopupOpen(false);
    setSelectedPrompt(null);
    
    // Refresh data to update the UI
    await refreshData();
  }, [refreshData, setIsUploadPopupOpen, setSelectedPrompt]);

  // Render
  if (!promptCategory) {
    console.log('[DIAGNOSTIC] TopicPageContent returning null due to missing promptCategory');
    return null;
  }

  const completedCount = promptCategory.prompts?.filter((p: Prompt) => p.PromptResponse?.length > 0)?.length || 0;
  const totalCount = promptCategory.prompts?.length || 0;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Sort
  const sortedPrompts = [...(promptCategory?.prompts || [])].sort(
    (a: Prompt, b: Prompt) => {
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

  return (
    <div className="container mx-auto py-6 px-4 md:px-6 md:py-8 space-y-6 md:space-y-8">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          onClick={() => router.push('/role-sharer/topics')}
          className="-ml-2 text-gray-600 hover:text-gray-900 rounded-full"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Topics
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {promptCategory?.category || 'Topic'}
            </h1>
            <p className="text-gray-600 mt-2">{promptCategory?.description}</p>
          </div>
          <div className="flex items-center gap-4 mt-2 sm:mt-0">
            <div className="bg-[#8fbc55] text-[#1B4332] px-4 py-1.5 rounded-full text-lg font-semibold">
              {completedCount}/{totalCount}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
              className="ml-2"
            >
              {viewMode === 'grid' ? (
                <TableIcon className="h-4 w-4" />
              ) : (
                <LayoutGrid className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <div className="mt-4">
          <Progress
            value={progressPercentage}
            className="h-2 bg-[#E5E7EB] [&>[role=progressbar]]:bg-[#8fbc55]"
          />
        </div>
      </div>

      {/* Topic Video Card */}
      <TopicVideoCard
        promptCategoryId={promptCategory.id}
        categoryName={promptCategory.category}
      />

      {/* Content */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {sortedPrompts.map((prompt: Prompt) => {
            if (!prompt?.id) return null;
            const hasResponse = prompt?.PromptResponse?.[0]?.Video?.muxPlaybackId;
            const rawResponse = hasResponse ? prompt.PromptResponse[0] : null;
            const promptResponse = rawResponse
              ? {
                  id: rawResponse.id,
                  profileSharerId: rawResponse.profileSharerId,
                  summary: rawResponse.summary || '',
                  responseNotes: rawResponse.summary || '',
                  transcription: rawResponse.Video?.VideoTranscript?.[0]?.transcript || '',
                  dateRecorded: null,
                  createdAt: rawResponse.createdAt,
                  Video: rawResponse.Video
                    ? {
                        id: rawResponse.Video.id,
                        muxPlaybackId: rawResponse.Video.muxPlaybackId,
                        muxAssetId: rawResponse.Video.muxAssetId || rawResponse.Video.muxPlaybackId,
                        VideoTranscript: rawResponse.Video.VideoTranscript
                          ? [
                              {
                                id: rawResponse.Video.VideoTranscript[0]?.id || '',
                                transcript:
                                  rawResponse.Video.VideoTranscript[0]?.transcript || ''
                              }
                            ]
                          : []
                      }
                    : null,
                  PromptResponseAttachment: (rawResponse.PromptResponseAttachment || []).map(
                    (att: any) => ({
                      id: att.id,
                      promptResponseId: rawResponse.id,
                      profileSharerId: rawResponse.profileSharerId,
                      fileUrl: att.fileUrl,
                      fileType: att.fileType,
                      fileName: att.fileName,
                      fileSize: att.fileSize || null,
                      title: att.title || null,
                      description: att.description || null,
                      estimatedYear: att.estimatedYear || null,
                      uploadedAt: new Date(att.uploadedAt),
                      dateCaptured: att.dateCaptured ? new Date(att.dateCaptured) : null,
                      yearCaptured: att.yearCaptured || null,
                      PromptResponseAttachmentPersonTag: att.PromptResponseAttachmentPersonTag || [],
                      PersonTags: att.PersonTags || []
                    })
                  )
                }
              : null;

            return (
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
                    window.location.href = `/role-sharer/prompts/${prompt.id}`;
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
                  <div className="flex justify-end">{renderGallery(promptResponse)}</div>
                  {/* Buttons */}
                  <div className="flex gap-2">
                    {hasResponse ? (
                      <>
                        <Button
                          onClick={() => {
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
                        <Button
                          onClick={() => {
                            setSelectedPrompt(prompt);
                            setIsRecordingPopupOpen(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full flex-1 text-sm font-medium"
                        >
                          <VideoIcon className="mr-2 h-4 w-4" />
                          Record
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedPrompt(prompt);
                            setIsUploadPopupOpen(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full flex-1 text-sm font-medium"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Upload
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
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
              {sortedPrompts.map((prompt) => {
                if (!prompt?.id) return null;
                const hasResponse = prompt?.PromptResponse?.[0]?.Video?.muxPlaybackId;
                const rawResponse = hasResponse ? prompt.PromptResponse[0] : null;
                const promptResponse = rawResponse
                  ? {
                      id: rawResponse.id,
                      profileSharerId: rawResponse.profileSharerId,
                      summary: rawResponse.summary || '',
                      responseNotes: rawResponse.summary || '',
                      transcription: rawResponse.Video?.VideoTranscript?.[0]?.transcript || '',
                      dateRecorded: null,
                      createdAt: rawResponse.createdAt,
                      Video: rawResponse.Video
                        ? {
                            id: rawResponse.Video.id,
                            muxPlaybackId: rawResponse.Video.muxPlaybackId,
                            muxAssetId:
                              rawResponse.Video.muxAssetId || rawResponse.Video.muxPlaybackId,
                            VideoTranscript: rawResponse.Video.VideoTranscript
                              ? [
                                  {
                                    id: rawResponse.Video.VideoTranscript[0]?.id || '',
                                    transcript:
                                      rawResponse.Video.VideoTranscript[0]?.transcript || ''
                                  }
                                ]
                              : []
                          }
                        : null,
                      PromptResponseAttachment: (rawResponse.PromptResponseAttachment || []).map(
                        (att: any) => ({
                          id: att.id,
                          promptResponseId: rawResponse.id,
                          profileSharerId: rawResponse.profileSharerId,
                          fileUrl: att.fileUrl,
                          fileType: att.fileType,
                          fileName: att.fileName,
                          fileSize: att.fileSize || null,
                          title: att.title || null,
                          description: att.description || null,
                          estimatedYear: att.estimatedYear || null,
                          uploadedAt: new Date(att.uploadedAt),
                          dateCaptured: att.dateCaptured ? new Date(att.dateCaptured) : null,
                          yearCaptured: att.yearCaptured || null,
                          PromptResponseAttachmentPersonTag: att.PromptResponseAttachmentPersonTag || [],
                          PersonTags: att.PersonTags || []
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
                        window.location.href = `/role-sharer/prompts/${prompt.id}`;
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
                              onClick={() => {
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
                            <Button
                              onClick={() => {
                                setSelectedPrompt(prompt);
                                setIsRecordingPopupOpen(true);
                              }}
                              variant="outline"
                              size="sm"
                              className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full flex-1"
                            >
                              <VideoIcon className="mr-2 h-4 w-4" />
                              Record
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedPrompt(prompt);
                                setIsUploadPopupOpen(true);
                              }}
                              variant="outline"
                              size="sm"
                              className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full flex-1"
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              Upload
                            </Button>
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

      {/* Recording Popup */}
      {isRecordingPopupOpen && selectedPrompt && (
        <VideoPopup
          open={isRecordingPopupOpen}
          onClose={handleCloseRecording}
          promptText={selectedPrompt.promptText}
          videoId=""
        >
          {/* Recording interface for capturing video responses */}
          <RecordingInterface
            promptId={selectedPrompt.id}
            onClose={handleCloseRecording}
            onSave={handleVideoComplete}
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
            onUploadSuccess={handleUploadSuccess}
            promptText={selectedPrompt.promptText}
          />
        </VideoPopup>
      )}

      {/* Video Playback Popup (for watchers) */}
      {selectedPrompt && isVideoPopupOpen && selectedPrompt.PromptResponse[0]?.Video?.muxPlaybackId && (
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
          onUploadSuccess={() => {
            // Just refresh data without closing the popup
            refreshData();
            // Don't close the attachment popup after successful upload
            // This allows users to upload multiple attachments in one session
          }}
        />
      )}

      {/* Add AttachmentDialog */}
      {selectedAttachment && (
        <AttachmentDialog
          isOpen={!!selectedAttachment}
          onClose={() => setSelectedAttachment(null)}
          attachment={selectedAttachment.attachment}
          onNext={() => {
            const nextIndex = selectedAttachment.currentIndex + 1;
            if (nextIndex < selectedAttachment.attachments.length) {
              setSelectedAttachment({
                attachment: selectedAttachment.attachments[nextIndex],
                attachments: selectedAttachment.attachments,
                currentIndex: nextIndex
              });
            }
          }}
          onPrevious={() => {
            const prevIndex = selectedAttachment.currentIndex - 1;
            if (prevIndex >= 0) {
              setSelectedAttachment({
                attachment: selectedAttachment.attachments[prevIndex],
                attachments: selectedAttachment.attachments,
                currentIndex: prevIndex
              });
            }
          }}
          hasNext={selectedAttachment.currentIndex < selectedAttachment.attachments.length - 1}
          hasPrevious={selectedAttachment.currentIndex > 0}
          onSave={async (updatedAttachment) => {
            try {
              const supabase = createClient();
              const { error } = await supabase
                .from('PromptResponseAttachment')
                .update({
                  description: updatedAttachment.description,
                  dateCaptured: updatedAttachment.dateCaptured,
                  yearCaptured: updatedAttachment.yearCaptured
                })
                .eq('id', updatedAttachment.id);

              if (error) throw error;

              // Update the attachment in the state
              setSelectedAttachment(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  attachment: {
                    ...prev.attachment,
                    description: updatedAttachment.description,
                    dateCaptured: updatedAttachment.dateCaptured,
                    yearCaptured: updatedAttachment.yearCaptured
                  }
                };
              });

              // Refresh the data to update the UI
              await refreshData();
            } catch (error) {
              console.error('Error saving attachment:', error);
              toast.error('Failed to save changes');
            }
          }}
          onDelete={async (attachmentId) => {
            try {
              const supabase = createClient();
              const attachment = selectedAttachment.attachments.find(a => a.id === attachmentId);
              
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
              setSelectedAttachment(null);
              await refreshData();
            } catch (error) {
              console.error('Error deleting attachment:', error);
              toast.error('Failed to delete attachment');
            }
          }}
          onDownload={async (attachment) => {
            try {
              const supabase = createClient();
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
      )}
    </div>
  );
};

export default function TopicPage() {
  const router = useRouter();
  const params = useParams();
  // Add diagnostic log for useAuth hook
  const { user, loading: authLoading } = useAuth();
  console.log('[DIAGNOSTIC] useAuth hook values:', { user: user?.id || null, authLoading });
  
  const [topicId, setTopicId] = useState<string | null>(null);
  const [promptCategory, setPromptCategory] = useState<PromptCategory | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isVideoPopupOpen, setIsVideoPopupOpen] = useState(false);
  const [isRecordingPopupOpen, setIsRecordingPopupOpen] = useState(false);
  const [isUploadPopupOpen, setIsUploadPopupOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [sortByStatus, setSortByStatus] = useState(false);
  const [isAttachmentUploadOpen, setIsAttachmentUploadOpen] = useState(false);
  const [selectedPromptResponse, setSelectedPromptResponse] = useState<PromptResponse | null>(null);

  // Removed all localStorage-based popup re-opening logic.
  // We only show the newly uploaded/recorded video in the same popup without forcing a reload to record or upload again.

  const fetchData = useCallback(async () => {
    console.log('[DIAGNOSTIC] fetchData called with topicId:', topicId, 'user:', user?.id || null);
    if (!topicId) {
      console.error('[fetchData] No topicId provided');
      return;
    }

    try {
      const supabase = createClient();
      console.log('[DIAGNOSTIC] Auth state before fetch:', { user: user?.id || null, authLoading });
      
      // Wait for auth to complete
      if (authLoading) {
        console.log('[DIAGNOSTIC] Auth is still loading, returning early');
        return;
      }
      
      // Redirect if not authenticated
      if (!user) {
        console.error('[DIAGNOSTIC] No authenticated user found, redirecting to signin');
        router.push('/auth/signin');
        return;
      }

      console.log('[DIAGNOSTIC] Fetching ProfileSharer data for user:', user.id);
      // Get ProfileSharer
      const { data: profileSharerData, error: profileError } = await supabase
        .from('ProfileSharer')
        .select('id')
        .eq('profileId', user.id)
        .single();

      if (profileError) {
        console.error('[DIAGNOSTIC] Error fetching ProfileSharer:', profileError);
        throw new Error('Authentication failed. Please sign in again.');
      }

      if (!profileSharerData) {
        console.error('[DIAGNOSTIC] No ProfileSharer found for user:', user.id);
        throw new Error('You do not have a sharer profile. Please contact support.');
      }

      console.log('[DIAGNOSTIC] Fetching topic data for topicId:', topicId);
      // Get PromptCategory with detailed query
      const { data: topicData, error: topicError } = await supabase
        .from('PromptCategory')
        .select(`
          id,
          category,
          description,
          createdAt,
          updatedAt,
          prompts:Prompt (
            id,
            promptText,
            isContextEstablishing,
            createdAt,
            updatedAt,
            PromptResponse (
              id,
              videoId,
              profileSharerId,
              summary,
              createdAt,
              updatedAt,
              Video (
                id,
                muxPlaybackId,
                muxAssetId,
                VideoTranscript (
                  id,
                  transcript
                )
              ),
              PromptResponseAttachment (
                id,
                promptResponseId,
                profileSharerId,
                fileUrl,
                fileType,
                fileName,
                fileSize,
                title,
                description,
                estimatedYear,
                uploadedAt,
                dateCaptured,
                yearCaptured
              )
            )
          )
        `)
        .eq('id', topicId)
        .single();

      if (topicError) {
        console.error('[DIAGNOSTIC] Error fetching topic:', topicError);
        throw new Error('Failed to fetch topic data. Please try again.');
      }

      console.log('[DIAGNOSTIC] Topic data fetched successfully:', 
        topicData ? {
          id: topicData.id,
          category: topicData.category,
          promptsCount: topicData.prompts?.length || 0
        } : null
      );
      
      setPromptCategory(topicData);
      console.log('[DIAGNOSTIC] promptCategory state set to:', 
        topicData ? {
          id: topicData.id,
          category: topicData.category
        } : null
      );
      
      setError(null);
    } catch (e) {
      const err = e as Error;
      console.error('[DIAGNOSTIC] Error in fetchData:', err);
      setError(err.message || 'An unexpected error occurred');
      if (err.message.includes('Authentication failed')) {
        router.push('/auth/signin');
      }
    } finally {
      console.log('[DIAGNOSTIC] Setting isLoading to false');
      setIsLoading(false);
    }
  }, [topicId, router, user, authLoading]);

  // Initialize data loading
  useEffect(() => {
    console.log('[DIAGNOSTIC] Params effect triggered:', { params, id: params?.id });
    if (params && typeof params.id === 'string') {
      setTopicId(params.id);
      setIsLoading(true);
    } else {
      router.push('/role-sharer/topics');
    }
  }, [params, router]);

  // Modified useEffect to also trigger when authLoading changes
  useEffect(() => {
    console.log('[DIAGNOSTIC] Data loading effect triggered:', { 
      topicId, 
      isLoading, 
      authLoading,
      promptCategorySet: promptCategory !== null
    });
    
    let mounted = true;
    
    // Only fetch data if we have a topicId and either:
    // 1. isLoading is true (initial load)
    // 2. authLoading just changed to false (auth completed)
    if (topicId && (isLoading || !authLoading)) {
      console.log('[DIAGNOSTIC] Conditions met to fetch data');
      fetchData().then(() => {
        if (mounted) {
          console.log('[DIAGNOSTIC] Setting isLoading to false after fetchData');
          setIsLoading(false);
        }
      });
    }
    
    return () => {
      mounted = false;
    };
  }, [topicId, fetchData, isLoading, authLoading]);

  const refreshData = useCallback(async () => {
    console.log('[DIAGNOSTIC] refreshData called');
    setIsLoading(true);
    await fetchData();
  }, [fetchData]);

  // Handler after saving or uploading a video
  const handleVideoComplete = useCallback(
    async (blob: Blob) => {
      console.log('[DIAGNOSTIC] handleVideoComplete called');
      try {
        const supabase = createClient();
        
        if (authLoading) {
          throw new Error('Authentication in progress');
        }

        if (!user) {
          throw new Error('No authenticated user');
        }

        // Get JWT
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.access_token) {
          throw new Error('Failed to get authorization token');
        }

        // Request Mux upload URL
        const response = await fetch('/api/mux/upload-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            promptId: selectedPrompt?.id
          })
        });

        if (!response.ok) {
          throw new Error('Failed to get upload URL');
        }

        const { uploadUrl, videoId } = await response.json();

        // Upload to Mux
        await fetch(uploadUrl, {
          method: 'PUT',
          body: blob
        });

        // Poll for Mux status
        let attempts = 0;
        const maxAttempts = 60;
        while (attempts < maxAttempts) {
          const { data: video, error } = await supabase
            .from('Video')
            .select('status, muxPlaybackId')
            .eq('id', videoId)
            .single();

          if (error) {
            console.error('Error checking video status:', error);
            throw new Error('Failed to check video status');
          }

          if (video?.status === 'READY' && video?.muxPlaybackId) {
            // Show success toast
            toast.success('Video recorded successfully!');
            
            // Close the recording popup
            setIsRecordingPopupOpen(false);
            setSelectedPrompt(null);
            
            // Refresh data to update the UI
            await refreshData();
            return video.muxPlaybackId;
          }

          if (video?.status === 'ERRORED') {
            throw new Error('Video processing failed');
          }

          await new Promise(resolve => setTimeout(resolve, 5000));
          attempts++;
        }

        throw new Error('Video processing timed out');
      } catch (error) {
        console.error('Error handling video recording:', error);
        toast.error('Failed to process video');
        throw error;
      }
    },
    [selectedPrompt, refreshData, authLoading, user, setIsRecordingPopupOpen, setSelectedPrompt]
  );

  // Close recording
  const handleCloseRecording = useCallback(() => {
    setIsRecordingPopupOpen(false);
    setSelectedPrompt(null);
  }, []);

  // Close upload with cleanup
  const handleCloseUpload = useCallback(() => {
    setIsUploadPopupOpen(false);
    setSelectedPrompt(null);
  }, []);

  // Render or error fallback
  if (isLoading) {
    console.log('[DIAGNOSTIC] Rendering loading state');
    return (
      <div className="container mx-auto space-y-6 py-6">
        <div className="border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55] transition-all duration-300 rounded-lg p-6">
          <p>Loading Topic...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.log('[DIAGNOSTIC] Rendering error state:', error);
    return (
      <ErrorFallback
        error={error}
        resetErrorBoundary={() => {
          setError(null);
          setIsLoading(true);
          fetchData();
        }}
      />
    );
  }

  console.log('[DIAGNOSTIC] Rendering TopicPageContent with promptCategory:', 
    promptCategory ? {
      id: promptCategory.id,
      category: promptCategory.category,
      promptsCount: promptCategory.prompts?.length || 0
    } : null
  );
  
  // Create a safe version of TopicPageContent that catches errors
  const SafeTopicPageContent = () => {
    try {
      return (
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
          handleCloseRecording={handleCloseRecording}
          handleCloseUpload={handleCloseUpload}
          refreshData={refreshData}
          router={router}
        />
      );
    } catch (error) {
      console.error('[DIAGNOSTIC] Error rendering TopicPageContent:', error);
      return (
        <div className="p-5 bg-red-50 my-5 rounded-lg border border-red-500">
          <h2 className="text-xl font-semibold mb-2">Error Rendering Content</h2>
          <p>{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      );
    }
  };
  
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        setError(null);
        setIsLoading(true);
        fetchData();
      }}
      onError={(error) => logError(error, 'ErrorBoundary')}
    >
      <SafeTopicPageContent />
    </ErrorBoundary>
  );
}