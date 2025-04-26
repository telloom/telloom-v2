import React from 'react';
import { ArrowLeft, Play, Paperclip, Upload, TableIcon, Layers, LayoutGrid } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import AttachmentThumbnail from './AttachmentThumbnail';

interface TopicContentProps {
  relationship: any;
  promptCategory: any;
  personTags: any[];
  attachments: Record<string, string>;
  onBack?: () => void;
}

export default function TopicContent({ 
  relationship, 
  promptCategory, 
  personTags,
  attachments,
  onBack 
}: TopicContentProps) {
  const [viewMode, setViewMode] = React.useState<'table' | 'grid' | 'card'>('grid');
  const [sortByStatus, setSortByStatus] = React.useState(false);
  const [overflowingPrompts, setOverflowingPrompts] = React.useState<Set<string>>(new Set());
  const promptRefs = React.useRef<{ [key: string]: HTMLElement | null }>({});
  
  // Check for prompt text overflow for tooltip display
  React.useEffect(() => {
    Object.entries(promptRefs.current).forEach(([promptId, element]) => {
      if (element && element.scrollHeight > element.clientHeight) {
        setOverflowingPrompts(prev => new Set([...Array.from(prev), promptId]));
      }
    });
  }, [promptCategory]);
  
  // Render gallery
  const renderGallery = (promptResponse: any) => {
    try {
      if (
        !promptResponse?.id ||
        !Array.isArray(promptResponse?.PromptResponseAttachment) ||
        promptResponse.PromptResponseAttachment.length === 0
      ) {
        return null;
      }

      const attachmentItems = promptResponse.PromptResponseAttachment;
      const viewableAttachments = attachmentItems.filter(att => 
        att.fileType.startsWith('image/') || att.fileType === 'application/pdf'
      );

      if (viewableAttachments.length === 0) return null;

      return (
        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
          {viewableAttachments.map((attachment: any, index: number) => {
            const signedUrl = attachments[attachment.id];
            const displayUrl = signedUrl || attachment.fileUrl;
            
            const thumbnailAttachment = {
              id: attachment.id,
              fileUrl: attachment.fileUrl,
              fileType: attachment.fileType,
              fileName: attachment.fileName,
              signedUrl: signedUrl,
              displayUrl: displayUrl,
              description: attachment.description,
              dateCaptured: attachment.dateCaptured ? new Date(attachment.dateCaptured) : null,
              yearCaptured: attachment.yearCaptured
            };

            return (
              <div
                key={attachment.id}
                className="relative w-9 h-9 hover:z-10 cursor-pointer last:mr-0 mr-2"
              >
                <AttachmentThumbnail
                  attachment={thumbnailAttachment}
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
  };
  
  // Calculate progress
  const completedCount = promptCategory.Prompt?.filter((p: any) => p.PromptResponse?.length > 0)?.length || 0;
  const totalCount = promptCategory.Prompt?.length || 0;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  
  // Get sharer name
  const firstName = relationship.firstName || '';
  const lastName = relationship.lastName || '';
  const sharerName = `${firstName} ${lastName}`.trim() || 'Unknown Sharer';
  
  // Sort prompts
  const sortedPrompts = [...(promptCategory?.Prompt || [])].sort(
    (a: any, b: any) => {
      if (a.isContextEstablishing && !b.isContextEstablishing) return -1;
      if (!a.isContextEstablishing && b.isContextEstablishing) return 1;
      if (sortByStatus) {
        const aHasResponse = a?.PromptResponse?.[0]?.muxPlaybackId ? 1 : 0;
        const bHasResponse = b?.PromptResponse?.[0]?.muxPlaybackId ? 1 : 0;
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
          onClick={onBack}
          className="-ml-2 text-gray-600 hover:text-gray-900 rounded-full"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Topics
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {promptCategory?.name || 'Topic'} for {sharerName}
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
              onClick={() => setViewMode(viewMode === 'grid' ? 'table' : viewMode === 'table' ? 'card' : 'grid')}
              className="ml-2"
            >
              {viewMode === 'grid' ? (
                <TableIcon className="h-4 w-4" />
              ) : viewMode === 'table' ? (
                <Layers className="h-4 w-4" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {sortedPrompts.map((prompt: any) => {
            if (!prompt?.id) return null;
            
            const promptResponse = prompt.PromptResponse?.[0];
            const hasResponse = !!promptResponse?.muxPlaybackId;

            return (
              <Card
                key={prompt.id}
                className={cn(
                  "border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55] transition-all duration-300",
                  hasResponse && "cursor-pointer"
                )}
              >
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">
                    <div
                      ref={(el) => {
                        if (el) promptRefs.current[prompt.id] = el;
                      }}
                      className={cn(
                        "line-clamp-2",
                        overflowingPrompts.has(prompt.id) && "cursor-help"
                      )}
                      title={overflowingPrompts.has(prompt.id) ? prompt.text : undefined}
                    >
                      {prompt.text}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-end">{renderGallery(promptResponse)}</div>
                  <div className="flex gap-2 mt-3">
                    {hasResponse ? (
                      <>
                        <Button
                          size="sm"
                          className="bg-[#1B4332] hover:bg-[#1B4332]/90 rounded-full flex-1 text-sm font-medium"
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Watch
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full flex-1 text-sm font-medium"
                        >
                          <Paperclip className="mr-1 h-4 w-4" />
                          {promptResponse?.PromptResponseAttachment?.length || 0}
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-[#1B4332] hover:bg-[#1B4332]/90 rounded-full flex-1 text-sm font-medium"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedPrompts.map((prompt: any) => {
            const response = prompt.PromptResponse?.[0];
            const hasResponse = !!response;
            const hasVideo = !!response?.muxPlaybackId;
            const hasAttachments = !!response?.PromptResponseAttachment?.length;
            
            return (
              <Card 
                key={prompt.id}
                className={cn(
                  "border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55] transition-all duration-300",
                  hasResponse && "cursor-pointer"
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    {prompt.isContextEstablishing && (
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-[#8fbc55] text-[#1B4332] rounded-full">
                        Start Here
                      </span>
                    )}
                    {hasResponse && (
                      <span className="inline-flex ml-auto px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Completed
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-lg">{prompt.text}</CardTitle>
                </CardHeader>
                <CardContent>
                  {hasResponse ? (
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap gap-2">
                        {renderGallery(response)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground py-2">
                      No response yet
                    </div>
                  )}
                </CardContent>
                {hasResponse && (
                  <CardFooter className="flex justify-end gap-2 pt-0">
                    {hasAttachments && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full"
                      >
                        <Paperclip className="mr-1 h-4 w-4" />
                        {response?.PromptResponseAttachment?.length || 0}
                      </Button>
                    )}
                    {hasVideo && (
                      <Button
                        size="sm"
                        className="bg-[#1B4332] hover:bg-[#1B4332]/90 rounded-full"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Watch
                      </Button>
                    )}
                  </CardFooter>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55] transition-all duration-300 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Prompt</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPrompts.map((prompt: any) => {
                if (!prompt?.id) return null;
                
                const promptResponse = prompt.PromptResponse?.[0];
                const hasResponse = !!promptResponse?.muxPlaybackId;

                return (
                  <TableRow
                    key={prompt.id}
                    className={cn(
                      hasResponse && "cursor-pointer hover:bg-muted/50",
                      "group"
                    )}
                  >
                    <TableCell>
                      <div
                        ref={(el) => {
                          if (el) promptRefs.current[prompt.id] = el;
                        }}
                        className={cn(
                          "line-clamp-2",
                          overflowingPrompts.has(prompt.id) && "cursor-help"
                        )}
                        title={overflowingPrompts.has(prompt.id) ? prompt.text : undefined}
                      >
                        {prompt.text}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2 h-9">
                        {hasResponse ? (
                          <>
                            {renderGallery(promptResponse)}
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full h-9"
                            >
                              <Paperclip className="mr-1 h-4 w-4" />
                              {promptResponse?.PromptResponseAttachment?.length || 0}
                            </Button>
                            <Button
                              size="sm"
                              className="bg-[#1B4332] hover:bg-[#1B4332]/90 rounded-full h-9"
                            >
                              <Play className="mr-2 h-4 w-4" />
                              Watch
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-[#1B4332] hover:bg-[#1B4332]/90 rounded-full h-9"
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload
                          </Button>
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
    </div>
  );
} 