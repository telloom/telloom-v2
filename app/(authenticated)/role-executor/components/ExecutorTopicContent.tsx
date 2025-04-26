"use client";

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Paperclip, Upload, TableIcon, LayoutGrid, VideoIcon, Download, X, Calendar, ImageIcon, FileIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import Loading from '@/components/Loading';
import { VideoPopup } from '@/components/VideoPopup';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import AttachmentThumbnail from '@/components/AttachmentThumbnail';
import { format } from 'date-fns';

interface ExecutorTopicContentProps {
  relationship: any;
  promptCategory: any;
  personTags: any[];
  attachmentSignedUrls: Record<string, Record<string, string>>;
}

// Custom attachment thumbnail component to avoid external dependencies
function SimpleAttachmentThumbnail({ 
  fileType, 
  imageUrl, 
  alt, 
  className = "",
  size = "md"
}: { 
  fileType: string; 
  imageUrl?: string; 
  alt: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const [imageError, setImageError] = useState(false);
  
  const sizeClasses = {
    sm: "h-24 w-24",
    md: "h-32 w-32",
    lg: "h-64 w-full max-h-64"
  };
  
  const containerClass = `${sizeClasses[size]} relative rounded-md overflow-hidden ${className}`;
  
  // For image files
  if (fileType.startsWith('image/') && imageUrl && !imageError) {
    return (
      <div className={containerClass}>
        <Image
          src={imageUrl}
          alt={alt}
          fill
          className="object-cover"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }
  
  // For non-image files or if image failed to load
  return (
    <div className={`${containerClass} bg-gray-100 flex items-center justify-center`}>
      {fileType.startsWith('image/') ? (
        <ImageIcon className="h-12 w-12 text-gray-400" />
      ) : (
        <FileIcon className="h-12 w-12 text-gray-400" />
      )}
    </div>
  );
}

// Simplified attachment dialog that doesn't try to fetch ProfileSharer data
function SimplifiedAttachmentDialog({
  attachment,
  isOpen,
  onClose,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
  signedUrl
}: {
  attachment: any;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
  signedUrl?: string;
}) {
  const [imageLoading, setImageLoading] = useState(true);

  // Format date if available
  const formattedDate = attachment?.dateCaptured 
    ? format(new Date(attachment.dateCaptured), 'MMMM d, yyyy')
    : null;

  const handleDownload = async () => {
    if (!signedUrl) return;
    
    try {
      const link = document.createElement('a');
      link.href = signedUrl;
      link.download = attachment.fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  // Format the attachment data for the thumbnail component
  const thumbnailAttachment = {
    fileType: attachment?.fileType || '',
    fileName: attachment?.fileName || '',
    fileUrl: attachment?.fileUrl || '',
    signedUrl: signedUrl
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="text-xl font-semibold truncate max-w-[70%]">
              {attachment?.fileName || 'Attachment'}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={!signedUrl}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            View attachment details and content
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 relative">
          <div className="w-full overflow-hidden rounded-md">
            {attachment?.fileType?.startsWith('image/') ? (
              <div className="relative w-full h-[60vh] bg-gray-100 rounded-md overflow-hidden">
                {signedUrl ? (
                  <AttachmentThumbnail
                    attachment={thumbnailAttachment}
                    size="lg"
                    className="w-full h-full"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-gray-500">No preview available</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-[60vh] flex items-center justify-center bg-gray-100 rounded-md">
                <div className="text-center">
                  <AttachmentThumbnail
                    attachment={thumbnailAttachment}
                    size="lg"
                  />
                  <p className="text-gray-600 mt-4">{attachment.fileType} file</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={handleDownload}
                    disabled={!signedUrl}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download file
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Metadata section */}
          <div className="mt-6 space-y-4">
            {/* Date captured */}
            {formattedDate && (
              <div className="flex items-center text-sm">
                <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                <span className="text-gray-700">{formattedDate}</span>
              </div>
            )}

            {/* Description */}
            {attachment?.description && (
              <div className="p-4 bg-gray-50 rounded-md">
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-gray-700">{attachment.description}</p>
              </div>
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={onPrevious}
              disabled={!hasPrevious}
              className="px-4"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={onNext}
              disabled={!hasNext}
              className="px-4"
            >
              Next
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ExecutorTopicContent({
  relationship,
  promptCategory,
  personTags,
  attachmentSignedUrls
}: ExecutorTopicContentProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortByStatus, setSortByStatus] = useState(false);
  const [overflowingPrompts, setOverflowingPrompts] = useState<Set<string>>(new Set());
  const promptRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const [isVideoPopupOpen, setIsVideoPopupOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<any>(null);
  const [selectedPromptResponse, setSelectedPromptResponse] = useState<any>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<any | null>(null);
  const [isAttachmentDialogOpen, setIsAttachmentDialogOpen] = useState(false);
  const [currentPromptResponseAttachments, setCurrentPromptResponseAttachments] = useState<any[]>([]);
  const [currentAttachmentIndex, setCurrentAttachmentIndex] = useState(0);
  
  useEffect(() => {
    // Simulate a small delay to allow client-side hydration
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Check for prompt text overflow for tooltip display
  useEffect(() => {
    Object.entries(promptRefs.current).forEach(([promptId, element]) => {
      if (element && element.scrollHeight > element.clientHeight) {
        setOverflowingPrompts(prev => new Set([...Array.from(prev), promptId]));
      }
    });
  }, [promptCategory]);

  // Open video popup with the selected prompt
  const handleWatchVideo = (prompt: any, promptResponse: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when clicking the button
    if (promptResponse?.Video?.videoUrl) {
      setSelectedPrompt(prompt);
      setSelectedPromptResponse(promptResponse);
      setIsVideoPopupOpen(true);
    } else {
      toast.error("Video is not available for this response.");
    }
  };

  // Open attachment dialog
  const handleViewAttachments = (prompt: any, promptResponse: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    const attachmentsForResponse = promptResponse?.PromptResponseAttachment || [];
    if (attachmentsForResponse.length > 0) {
      setCurrentPromptResponseAttachments(attachmentsForResponse);
      setCurrentAttachmentIndex(0); // Start with the first attachment
      setSelectedAttachment(attachmentsForResponse[0]);
      setIsAttachmentDialogOpen(true);
    } else {
      toast.info("No attachments available for this response.");
    }
  };

  const closeAttachmentDialog = () => {
    setIsAttachmentDialogOpen(false);
    setSelectedAttachment(null);
    setCurrentPromptResponseAttachments([]);
    setCurrentAttachmentIndex(0);
  };

  const handleNextAttachment = () => {
    if (currentAttachmentIndex < currentPromptResponseAttachments.length - 1) {
      const nextIndex = currentAttachmentIndex + 1;
      setCurrentAttachmentIndex(nextIndex);
      setSelectedAttachment(currentPromptResponseAttachments[nextIndex]);
    }
  };

  const handlePreviousAttachment = () => {
    if (currentAttachmentIndex > 0) {
      const prevIndex = currentAttachmentIndex - 1;
      setCurrentAttachmentIndex(prevIndex);
      setSelectedAttachment(currentPromptResponseAttachments[prevIndex]);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  const completedCount = promptCategory.Prompt?.filter((p: any) => p.PromptResponse?.length > 0)?.length || 0;
  const totalCount = promptCategory.Prompt?.length || 0;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Get sharer name
  const firstName = relationship.profile?.firstName || '';
  const lastName = relationship.profile?.lastName || '';
  const sharerName = `${firstName} ${lastName}`.trim() || 'Unknown Sharer';

  // Sort prompts
  const sortedPrompts = [...(promptCategory?.Prompt || [])].sort(
    (a: any, b: any) => {
      if (a.isContextEstablishing && !b.isContextEstablishing) return -1;
      if (!a.isContextEstablishing && b.isContextEstablishing) return 1;
      if (sortByStatus) {
        const aHasResponse = a?.PromptResponse?.[0] ? 1 : 0;
        const bHasResponse = b?.PromptResponse?.[0] ? 1 : 0;
        return bHasResponse - aHasResponse;
      }
      return 0;
    }
  );

  return (
    <div className="container mx-auto py-6 px-4 md:px-6 md:py-8 space-y-6 md:space-y-8">
      {/* Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2">
          <div>
            <div className="text-sm text-gray-500 mb-1">Managing content for</div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {promptCategory?.category || 'Topic'} <span className="text-[#1B4332]">• {sharerName}</span>
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

      {/* Topic Video Section - Placeholder instead of the actual component */}
      <Card className="p-6 md:p-6 border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55]">
        <div className="text-center space-y-3 md:space-y-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight mb-2">Topic Video</h2>
            <p className="text-muted-foreground">
              Topic videos are available from the role-sharer view. As an executor, you can view individual prompt videos.
            </p>
          </div>
          <div className="flex justify-center">
            <Button
              variant="default"
              size="sm"
              className="rounded-full bg-[#1B4332] hover:bg-[#1B4332]/90"
              disabled
            >
              <div className="flex items-center text-sm">
                <VideoIcon className="h-4 w-4 mr-2" />
                Topic Videos
              </div>
            </Button>
          </div>
        </div>
      </Card>

      {/* Content */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {sortedPrompts.map((prompt: any) => {
            if (!prompt?.id) return null;
            
            const promptResponse = prompt.PromptResponse?.[0];
            const hasResponse = !!promptResponse;
            const attachmentCount = promptResponse?.PromptResponseAttachment?.length || 0;
            
            // Get the first attachment with a signed URL for preview
            const firstAttachment = promptResponse?.PromptResponseAttachment?.[0];
            
            // Look up the signed URL from the attachmentSignedUrls map using the RESPONSE ID and ATTACHMENT ID
            const signedUrlForFirstAttachment = 
              firstAttachment && promptResponse && attachmentSignedUrls[promptResponse.id]
                ? attachmentSignedUrls[promptResponse.id][firstAttachment.id] 
                : null;
            
            const hasValidAttachment = !!signedUrlForFirstAttachment && firstAttachment?.fileType?.startsWith('image/');

            return (
              <Card
                key={prompt.id}
                className={cn(
                  "border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55] transition-all duration-300 h-[280px] md:h-[280px] flex flex-col",
                  hasResponse && "cursor-pointer"
                )}
                onClick={(e) => {
                  if (
                    e.target instanceof HTMLElement &&
                    !e.target.closest('button') &&
                    hasResponse
                  ) {
                    window.location.href = `/role-executor/${relationship.id}/prompts/${prompt.id}`;
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
                              Context
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <CardTitle className="text-lg font-semibold">
                      <div
                        ref={(el) => {
                          if (el) promptRefs.current[prompt.id] = el;
                        }}
                        className={cn(
                          "line-clamp-2",
                          overflowingPrompts.has(prompt.id) && "cursor-help"
                        )}
                        title={overflowingPrompts.has(prompt.id) ? prompt.promptText : undefined}
                      >
                        {prompt.promptText}
                      </div>
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-end pt-2 pb-4 px-4 md:pt-3 md:pb-6 md:px-6">
                  {hasResponse ? (
                    <div className="space-y-2 h-full flex flex-col">
                      {hasValidAttachment && (
                        <div className="flex-grow flex items-start justify-center mt-2 mb-2 overflow-hidden max-h-24">
                          <AttachmentThumbnail 
                            attachment={{
                              fileType: firstAttachment.fileType,
                              fileName: firstAttachment.fileName,
                              fileUrl: firstAttachment.fileUrl,
                              signedUrl: signedUrlForFirstAttachment,
                              displayUrl: signedUrlForFirstAttachment
                            }}
                            size="sm"
                            className="rounded-md"
                          />
                        </div>
                      )}
                      
                      {promptResponse.summary && (
                        <p className="text-sm text-gray-600 line-clamp-2">{promptResponse.summary}</p>
                      )}
                      
                      <div className="flex gap-2 mt-auto">
                        <Button
                          size="sm"
                          className="bg-[#1B4332] hover:bg-[#1B4332]/90 rounded-full flex-1 text-sm font-medium"
                          onClick={(e) => handleWatchVideo(prompt, promptResponse, e)}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Watch
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full flex-1 text-sm font-medium",
                            attachmentCount === 0 && "opacity-50"
                          )}
                          onClick={(e) => handleViewAttachments(prompt, promptResponse, e)}
                          disabled={attachmentCount === 0}
                        >
                          <Paperclip className="mr-1 h-4 w-4" />
                          {attachmentCount}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-auto">
                      <div className="text-sm text-gray-500 italic mb-4">No response yet</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55] transition-all duration-300 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prompt
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attachments
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedPrompts.map((prompt: any) => {
                if (!prompt?.id) return null;
                
                const promptResponse = prompt.PromptResponse?.[0];
                const hasResponse = !!promptResponse;
                const attachmentCount = promptResponse?.PromptResponseAttachment?.length || 0;

                return (
                  <tr 
                    key={prompt.id}
                    className={cn(
                      "hover:bg-gray-50",
                      hasResponse && "cursor-pointer"
                    )}
                    onClick={(e) => {
                      if (
                        e.target instanceof HTMLElement &&
                        !e.target.closest('button') &&
                        hasResponse
                      ) {
                        window.location.href = `/role-executor/${relationship.id}/prompts/${prompt.id}`;
                      }
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="ml-0">
                          <div 
                            className={cn(
                              "text-sm font-medium text-gray-900 line-clamp-2",
                              overflowingPrompts.has(prompt.id) && "cursor-help"
                            )}
                            ref={(el) => {
                              if (el) promptRefs.current[prompt.id] = el;
                            }}
                            title={overflowingPrompts.has(prompt.id) ? prompt.promptText : undefined}
                          >
                            {prompt.promptText}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {attachmentCount > 0 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full text-xs"
                          onClick={(e) => handleViewAttachments(prompt, promptResponse, e)}
                        >
                          <Paperclip className="mr-1 h-3 w-3" />
                          {attachmentCount} files
                        </Button>
                      ) : (
                        <span className="text-gray-500">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {hasResponse ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Completed
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            onClick={(e) => handleWatchVideo(prompt, promptResponse, e)}
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Video Popup */}
      {isVideoPopupOpen && selectedPrompt && selectedPromptResponse && (
        <VideoPopup
          open={isVideoPopupOpen}
          onClose={() => setIsVideoPopupOpen(false)} 
          promptText={selectedPrompt.promptText}
          videoId={selectedPromptResponse.Video?.muxPlaybackId}
        />
      )}

      {/* Simplified Attachment Dialog */}
      {isAttachmentDialogOpen && selectedAttachment && (
        <SimplifiedAttachmentDialog
          attachment={selectedAttachment}
          isOpen={isAttachmentDialogOpen}
          onClose={closeAttachmentDialog}
          onNext={handleNextAttachment}
          onPrevious={handlePreviousAttachment}
          hasNext={currentAttachmentIndex < currentPromptResponseAttachments.length - 1}
          hasPrevious={currentAttachmentIndex > 0}
          signedUrl={selectedPromptResponse && attachmentSignedUrls[selectedPromptResponse.id] 
            ? attachmentSignedUrls[selectedPromptResponse.id][selectedAttachment.id] 
            : undefined}
        />
      )}
    </div>
  );
} 