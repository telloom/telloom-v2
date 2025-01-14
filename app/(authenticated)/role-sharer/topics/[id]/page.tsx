// app/role-sharer/topics/[id]/page.tsx
// This file contains the main component for displaying a specific topic in the role-sharer section.
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordingInterface } from '@/components/RecordingInterface';
import { VideoPopup } from '@/components/VideoPopup';
import { UploadPopup } from '@/components/UploadPopup';
import { ArrowLeft, Video as VideoIcon, Play, CheckCircle2, LayoutGrid, Table as TableIcon, Upload, Paperclip } from 'lucide-react';
import { PromptCategory, Prompt, PromptResponse, PromptResponseAttachment, Video, PersonTag, PersonRelation } from '@/types/models';
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { PromptResponseGallery } from '@/components/PromptResponseGallery';
import { ErrorBoundary } from 'react-error-boundary';
import { cn } from "@/lib/utils";
import Image from 'next/image';
import AttachmentThumbnail from '@/components/AttachmentThumbnail';
import { AttachmentDialog } from '@/components/AttachmentDialog';

interface Attachment {
  id: string;
  fileUrl: string;
  displayUrl?: string;
  fileType: string;
  fileName: string;
  description: string | null;
  dateCaptured: string | null;
  yearCaptured: number | null;
  PersonTags: PersonTag[];
}

const AttachmentUpload = dynamic(() => import('@/components/AttachmentUpload'), {
  ssr: false
});

interface SupabaseVideoTranscript {
  id: string;
  transcript: string;
}

interface SupabaseVideo {
  id: string;
  muxPlaybackId: string;
  muxAssetId: string | null;
  VideoTranscript?: SupabaseVideoTranscript[];
}

interface SupabasePromptResponseAttachment {
  id: string;
  fileUrl: string;
  fileType: string;
  fileName: string;
  description: string | null;
  dateCaptured: string | null;
  yearCaptured?: number | null;
}

interface SupabasePromptResponse {
  id: string;
  profileSharerId: string;
  summary: string | null;
  responseNotes?: string | null;
  transcription?: string;
  dateRecorded?: Date | null;
  createdAt: string;
  Video: {
    id: string;
    muxPlaybackId: string;
    muxAssetId: string | null;
    VideoTranscript?: Array<{
      id: string;
      transcript: string;
    }>;
  } | null;
  PromptResponseAttachment: Array<{
    id: string;
    promptResponseId: string;
    fileUrl: string;
    fileType: string;
    fileName: string;
    description?: string | null;
    dateCaptured?: string | null;
    yearCaptured?: number | null;
  }>;
}

function isSupabaseVideo(video: any): video is SupabaseVideo {
  return (
    typeof video === 'object' &&
    video !== null &&
    typeof video.id === 'string' &&
    typeof video.muxPlaybackId === 'string' &&
    (typeof video.muxAssetId === 'string' || video.muxAssetId === null) &&
    (Array.isArray(video.VideoTranscript) || video.VideoTranscript === undefined)
  );
}

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
  refreshData: () => Promise<void>;
  router: ReturnType<typeof useRouter>;
}

// Add error logging utility
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
  
  // Log to server if needed
  if (process.env.NODE_ENV === 'production') {
    // Add server logging here
  }
};

// Error boundary component
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

// Main content component to wrap in error boundary
const TopicPageContent = ({ 
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
  refreshData,
  router
}: TopicPageContentProps) => {
  const [selectedAttachment, setSelectedAttachment] = useState<{
    attachment: any;
    attachments: any[];
    currentIndex: number;
  } | null>(null);
  const [overflowingPrompts, setOverflowingPrompts] = useState<Set<string>>(new Set());
  const promptRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  
  useEffect(() => {
    Object.entries(promptRefs.current).forEach(([promptId, element]) => {
      if (element && element.scrollHeight > element.clientHeight) {
        setOverflowingPrompts(prev => new Set([...prev, promptId]));
      }
    });
  }, [promptCategory]); // Only run when promptCategory changes

  const renderGallery = useCallback((promptResponse: PromptResponse | null) => {
    try {
      if (!promptResponse?.id || !Array.isArray(promptResponse?.PromptResponseAttachment) || promptResponse.PromptResponseAttachment.length === 0) {
        console.log('No attachments to render:', {
          responseId: promptResponse?.id,
          hasAttachments: Array.isArray(promptResponse?.PromptResponseAttachment),
          attachmentCount: promptResponse?.PromptResponseAttachment?.length
        });
        return null;
      }

      const attachments = promptResponse.PromptResponseAttachment as PromptResponseAttachment[];

      const handleDownload = async (attachment: Attachment) => {
        try {
          const supabase = createClient();
          const filePath = attachment.fileUrl.includes('attachments/') 
            ? attachment.fileUrl.split('attachments/')[1]
            : attachment.fileUrl;
          
          const { data, error } = await supabase.storage
            .from('attachments')
            .createSignedUrl(filePath, 60);

          if (error) throw error;

          if (data?.signedUrl) {
            const link = document.createElement('a');
            link.href = data.signedUrl;
            link.download = attachment.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        } catch (error) {
          console.error('Error downloading file:', error);
          toast.error('Failed to download file');
        }
      };

      const handleDelete = async (attachmentId: string) => {
        try {
          const supabase = createClient();
          const { error } = await supabase
            .from('PromptResponseAttachment')
            .delete()
            .eq('id', attachmentId);

          if (error) throw error;
          
          toast.success('Attachment deleted successfully');
          refreshData();
          setSelectedAttachment(null);
        } catch (error) {
          console.error('Error deleting attachment:', error);
          toast.error('Failed to delete attachment');
        }
      };

      const handleSave = async (updatedAttachment: Attachment) => {
        try {
          await refreshData();
        } catch (error) {
          console.error('Error refreshing data after save:', error);
        }
      };

      return (
        <>
          <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
            {attachments.map((attachment, index) => {
              // Extract just the filename for display URL
              const displayUrl = attachment.fileUrl.split('/attachments/').pop() || attachment.fileUrl;

              return (
                <div 
                  key={attachment.id} 
                  className="relative w-9 h-9 hover:z-10 cursor-pointer last:mr-0 mr-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAttachment({
                      attachment: {
                        ...attachment,
                        fileUrl: attachment.fileUrl,
                        displayUrl
                      },
                      attachments: attachments.map(att => ({
                        ...att,
                        fileUrl: att.fileUrl,
                        displayUrl: att.fileUrl.split('/attachments/').pop() || att.fileUrl
                      })),
                      currentIndex: index
                    });
                  }}
                >
                  <AttachmentThumbnail
                    attachment={{
                      id: attachment.id,
                      fileUrl: displayUrl,
                      fileType: attachment.fileType,
                      fileName: attachment.fileName
                    }}
                    size="lg"
                  />
                </div>
              );
            })}
          </div>
          {selectedAttachment && (
            <>
              <div 
                className="fixed inset-0 bg-black/50 z-40"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedAttachment(null);
                }}
              />
              <div className="fixed inset-0 z-50">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div onClick={(e) => e.stopPropagation()}>
                    <AttachmentDialog
                      attachment={selectedAttachment.attachment}
                      isOpen={!!selectedAttachment}
                      onClose={() => setSelectedAttachment(null)}
                      onNext={selectedAttachment.currentIndex < selectedAttachment.attachments.length - 1 ? 
                        () => setSelectedAttachment({
                          attachment: selectedAttachment.attachments[selectedAttachment.currentIndex + 1],
                          attachments: selectedAttachment.attachments,
                          currentIndex: selectedAttachment.currentIndex + 1
                        }) : undefined}
                      onPrevious={selectedAttachment.currentIndex > 0 ? 
                        () => setSelectedAttachment({
                          attachment: selectedAttachment.attachments[selectedAttachment.currentIndex - 1],
                          attachments: selectedAttachment.attachments,
                          currentIndex: selectedAttachment.currentIndex - 1
                        }) : undefined}
                      hasNext={selectedAttachment.currentIndex < selectedAttachment.attachments.length - 1}
                      hasPrevious={selectedAttachment.currentIndex > 0}
                      onSave={handleSave}
                      onDownload={handleDownload}
                      onDelete={handleDelete}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      );
    } catch (error) {
      console.error('Error rendering gallery:', {
        error,
        responseId: promptResponse?.id,
        attachmentCount: promptResponse?.PromptResponseAttachment?.length,
        stack: error instanceof Error ? error.stack : undefined
      });
      return null;
    }
  }, [selectedAttachment]);

  // Add error boundary for initial render checks
  try {
    if (!promptCategory) return null;

    const completedCount = promptCategory?.prompts?.filter((p: Prompt) => p.PromptResponse?.length > 0)?.length || 0;
    const totalCount = promptCategory?.prompts?.length || 0;
    const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    // First, sort by isContextEstablishing regardless of other sorting
    const sortedPrompts = [...(promptCategory?.prompts || [])].sort((a: Prompt, b: Prompt) => {
      // Always sort context establishing first
      if (a.isContextEstablishing && !b.isContextEstablishing) return -1;
      if (!a.isContextEstablishing && b.isContextEstablishing) return 1;
      
      // Then apply status sorting if enabled
      if (sortByStatus) {
        const aHasResponse = a?.PromptResponse?.[0]?.Video?.muxPlaybackId ? 1 : 0;
        const bHasResponse = b?.PromptResponse?.[0]?.Video?.muxPlaybackId ? 1 : 0;
        console.log('Sorting prompt responses:', {
          aId: a.id,
          aResponse: a.PromptResponse?.[0],
          aHasResponse,
          bId: b.id,
          bResponse: b.PromptResponse?.[0],
          bHasResponse
        });
        return bHasResponse - aHasResponse;
      }
      return 0;
    });

    // Log the final sorted prompts
    console.log('Sorted prompts:', sortedPrompts.map(p => ({
      id: p.id,
      text: p.promptText,
      isContextEstablishing: p.isContextEstablishing,
      responseCount: p.PromptResponse?.length,
      hasVideo: p.PromptResponse?.[0]?.Video?.muxPlaybackId ? true : false
    })));

  return (
    <div className="container mx-auto py-8 space-y-8">
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
        <div className="flex items-center justify-between">
          <div>
              <h1 className="text-3xl font-bold">{promptCategory?.category || 'Topic'}</h1>
              <p className="text-gray-600 mt-2">{promptCategory?.description}</p>
          </div>
          <div className="flex items-center gap-4">
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

      {/* Content */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedPrompts.map((prompt: Prompt) => {
            if (!prompt?.id) return null;
            
            const hasResponse = prompt?.PromptResponse?.[0]?.Video?.muxPlaybackId;
            console.log('Checking prompt response:', {
              promptId: prompt.id,
              promptText: prompt.promptText,
              responses: prompt.PromptResponse,
              hasResponse,
              firstResponse: prompt.PromptResponse?.[0],
              videoInfo: prompt.PromptResponse?.[0]?.Video
            });
            
            const rawResponse = hasResponse ? prompt.PromptResponse[0] : null;
            const promptResponse = rawResponse ? {
              id: rawResponse.id,
              profileSharerId: rawResponse.profileSharerId,
              summary: rawResponse.summary || '',
              responseNotes: rawResponse.summary || '',
              transcription: rawResponse.Video?.VideoTranscript?.[0]?.transcript || '',
              dateRecorded: null,
              createdAt: rawResponse.createdAt,
              Video: rawResponse.Video ? {
                id: rawResponse.Video.id,
                muxPlaybackId: rawResponse.Video.muxPlaybackId,
                muxAssetId: rawResponse.Video.muxAssetId || rawResponse.Video.muxPlaybackId,
                VideoTranscript: rawResponse.Video.VideoTranscript ? [{
                  id: rawResponse.Video.VideoTranscript[0]?.id || '',
                  transcript: rawResponse.Video.VideoTranscript[0]?.transcript || ''
                }] : []
              } : null,
              PromptResponseAttachment: (rawResponse.PromptResponseAttachment || []).map((att: DatabasePromptResponseAttachment) => ({
                id: att.id,
                promptResponseId: rawResponse.id,
                fileUrl: att.fileUrl,
                fileType: att.fileType,
                fileName: att.fileName,
                promptResponse: null
              }))
            } : null;

            return (
              <Card 
                key={prompt.id}
                className={cn(
                  "border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55] transition-all duration-300 h-[250px] flex flex-col bg-white",
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
                <CardHeader className="pb-0 flex-none">
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
                            ref={(el: HTMLSpanElement | null) => {
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
                <div className="px-6 pb-6 space-y-3">
                  <div className="flex justify-end">
                    {renderGallery(promptResponse)}
                  </div>
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
                          onClick={() => {
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
                const promptResponse = rawResponse ? {
                  id: rawResponse.id,
                  profileSharerId: rawResponse.profileSharerId,
                  summary: rawResponse.summary || '',
                  responseNotes: rawResponse.summary || '',
                  transcription: rawResponse.Video?.VideoTranscript?.[0]?.transcript || '',
                  dateRecorded: null,
                  createdAt: rawResponse.createdAt,
                  Video: rawResponse.Video ? {
                    id: rawResponse.Video.id,
                    muxPlaybackId: rawResponse.Video.muxPlaybackId,
                    muxAssetId: rawResponse.Video.muxAssetId || rawResponse.Video.muxPlaybackId,
                    VideoTranscript: rawResponse.Video.VideoTranscript ? [{
                      id: rawResponse.Video.VideoTranscript[0]?.id || '',
                      transcript: rawResponse.Video.VideoTranscript[0]?.transcript || ''
                    }] : []
                  } : null,
                  PromptResponseAttachment: (rawResponse.PromptResponseAttachment || []).map((att: DatabasePromptResponseAttachment) => ({
                    id: att.id,
                    promptResponseId: rawResponse.id,
                    fileUrl: att.fileUrl,
                    fileType: att.fileType,
                    fileName: att.fileName,
                    promptResponse: null
                  }))
                } : null;
              
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
                            onClick={() => {
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
      onClose={() => {
        setIsRecordingPopupOpen(false);
        setSelectedPrompt(null);
      }}
      promptText={selectedPrompt.promptText}
      videoId=""
    >
      <RecordingInterface
        promptId={selectedPrompt.id}
        onClose={() => {
          setIsRecordingPopupOpen(false);
          setSelectedPrompt(null);
        }}
        onSave={handleVideoComplete}
      />
    </VideoPopup>
  )}

  {/* Upload Popup */}
  {isUploadPopupOpen && selectedPrompt && (
    <UploadPopup
      open={isUploadPopupOpen}
      onClose={() => setIsUploadPopupOpen(false)}
      promptText={selectedPrompt?.promptText}
      promptId={selectedPrompt?.id}
      onComplete={() => {
        setIsUploadPopupOpen(false);
        setSelectedPrompt(null);
      }}
      onUploadSuccess={() => {
        refreshData();
      }}
    />
  )}

  {/* Video Playback Popup */}
  {selectedPrompt && selectedPrompt.PromptResponse[0]?.Video?.muxPlaybackId && (
    <VideoPopup
      open={isVideoPopupOpen}
      onClose={() => {
        setIsVideoPopupOpen(false);
        setSelectedPrompt(null);
      }}
      promptText={selectedPrompt.promptText}
      videoId={selectedPrompt.PromptResponse[0].Video.muxPlaybackId}
      onNext={() => {}}
      onPrevious={() => {}}
      hasNext={false}
      hasPrevious={false}
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
        refreshData();
        setIsAttachmentUploadOpen(false);
        setSelectedPromptResponse(null);
      }}
    />
  )}
</div>
);
} catch (error) {
logError(error, 'TopicPageContent-Init');
return null;
}
};

// Add error type
interface RefreshError extends Error {
  code?: string;
  details?: string;
}

interface DatabasePromptResponseAttachment {
  id: string;
  fileUrl: string;
  fileType: string;
  fileName: string;
  description?: string | null;
  dateCaptured?: string | null;
  yearCaptured?: number | null;
}

export default function TopicPage() {
  // Move hooks outside of try-catch to maintain hook order
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const promptId = searchParams.get('prompt');
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
  const [currentPromptIndex, setCurrentPromptIndex] = useState<number>(0);

  const fetchData = useCallback(async () => {
    if (!topicId) {
      console.error('[fetchData] No topicId provided');
      return;
    }

    try {
      const supabase = createClient();
      
      // Get authenticated user with getUser() instead of getSession()
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('[fetchData] Auth error:', userError);
        router.push('/auth/signin');
        return;
      }

      // Get ProfileSharer record with proper error handling
      const { data: profileSharerData, error: profileError } = await supabase
        .from('ProfileSharer')
        .select('*')
        .eq('profileId', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('[fetchData] Profile error:', profileError);
        if (profileError.code === 'PGRST116' || !profileSharerData) {
          console.error('[fetchData] No profile found for user');
          router.push('/role-sharer/topics');
          return;
        }
        throw new Error(`Failed to fetch profile: ${profileError.message}`);
      }

      if (!profileSharerData) {
        console.error('[fetchData] No profile found for user');
        router.push('/role-sharer/topics');
        return;
      }

      // Fetch topic data with all related data in a single query
      const { data: topicData, error: topicError } = await supabase
        .from('PromptCategory')
        .select(`
          *,
          prompts:Prompt(
            *,
            PromptResponse(
              *,
              Video(
                *,
                VideoTranscript(*)
              ),
              PromptResponseAttachment(*)
            )
          )
        `)
        .eq('id', topicId)
        .single();

      if (topicError) {
        console.error('[fetchData] Topic error:', topicError);
        throw new Error(`Failed to fetch topic: ${topicError.message}`);
      }

      setPromptCategory(topicData);
      setError(null);

    } catch (error) {
      const e = error as Error;
      console.error('[fetchData] Error:', e);
      setError(e.message || 'An unexpected error occurred');
      if (e.message.includes('Authentication failed')) {
        router.push('/auth/signin');
      }
    } finally {
      setIsLoading(false);
    }
  }, [topicId, router]);

  // Initialize data loading when topicId is set
  useEffect(() => {
    if (params && typeof params.id === 'string') {
      setTopicId(params.id);
      setIsLoading(true); // Set loading state when topicId changes
    } else {
      router.push('/role-sharer/topics');
    }
  }, [params, router]);

  // Fetch data when topicId changes
  useEffect(() => {
    let mounted = true;

    if (topicId && isLoading) {
      fetchData().then(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });
    }

    return () => {
      mounted = false;
    };
  }, [topicId, fetchData, isLoading]);

  // Simplified refresh function
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (params && typeof params.id === 'string') {
      setTopicId(params.id);
    } else {
      router.push('/role-sharer/topics');
    }
  }, [params, router]);

  const handleVideoComplete = useCallback(async (blob: Blob) => {
    try {
      const supabase = createClient();
      
      // Get authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Authentication failed');
      }

      // Get upload URL from Mux
      const response = await fetch('/api/mux/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          promptId: selectedPrompt?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, videoId } = await response.json();

      // Upload to Mux
      await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
      });

      // Wait for processing to complete
      await refreshData();
      
      return videoId;
    } catch (error) {
      console.error('Error handling video upload:', error);
      toast.error('Failed to upload video');
      throw error;
    }
  }, [selectedPrompt, refreshData]);

  // Wrap the render in try-catch
  try {
    if (isLoading) {
      return (
        <div className="container mx-auto py-8">
          <Card className="p-6 border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55]">
            <CardHeader>
              <CardTitle>Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Please wait while we load your topic...</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (error) {
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
          refreshData={refreshData}
          router={router}
        />
      </ErrorBoundary>
    );
  } catch (error) {
    logError(error, 'TopicPage-Render');
    return (
      <ErrorFallback 
        error={error instanceof Error ? error : new Error('An unexpected error occurred')} 
        resetErrorBoundary={() => window.location.reload()} 
      />
    );
  }
}
