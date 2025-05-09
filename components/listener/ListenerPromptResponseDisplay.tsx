// components/listener/ListenerPromptResponseDisplay.tsx
// Displays a single prompt response including video, transcript, summary, and attachments for a listener (read-only).

'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video as VideoIcon, Download, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { UIAttachment } from '@/types/component-interfaces';
import { ListenerAttachmentDialog } from '@/components/listener/ListenerAttachmentDialog';
import ListenerAttachmentThumbnail from '@/components/listener/ListenerAttachmentThumbnail';
import { VideoDownloadButton } from '@/components/video/VideoDownloadButton';
import { cn } from '@/lib/utils';
import type { Attachment as AttachmentDialogType } from '@/components/AttachmentDialog'; // For dialog prop consistency

// Dynamically import MuxPlayer
const MuxPlayer = dynamic(
  () => import('@/components/MuxPlayer').then(mod => mod.MuxPlayer),
  { ssr: false }
);

interface ListenerPromptResponseDisplayProps {
  promptText: string;
  topicName?: string; // Optional: Name of the parent topic/category
  sharerId: string;  // ProfileSharer.id for context (e.g., video download)
  video?: {
    muxPlaybackId: string;
    muxAssetId: string;
    dateRecorded?: string | null;
  };
  transcriptText?: string | null;
  summaryText?: string | null;
  attachments?: UIAttachment[];
}

export function ListenerPromptResponseDisplay({
  promptText,
  topicName,
  sharerId,
  video,
  transcriptText,
  summaryText,
  attachments: initialAttachments = [],
}: ListenerPromptResponseDisplayProps) {
  const [transcript, setTranscript] = useState(transcriptText || '');
  const [summary, setSummary] = useState(summaryText || '');
  const [dateRecorded, setDateRecorded] = useState<string | null>(video?.dateRecorded || null);
  const [attachments, setAttachments] = useState<UIAttachment[]>(initialAttachments);

  const [selectedAttachmentIndex, setSelectedAttachmentIndex] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAttachmentForDialog, setSelectedAttachmentForDialog] = useState<AttachmentDialogType | null>(null);

  const transcriptContentRef = useRef<HTMLParagraphElement>(null);
  const summaryContentRef = useRef<HTMLParagraphElement>(null);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [transcriptOverflows, setTranscriptOverflows] = useState(false);
  const [summaryOverflows, setSummaryOverflows] = useState(false);

  useEffect(() => {
    setAttachments(initialAttachments);
  }, [initialAttachments]);

  useEffect(() => {
    setTranscript(transcriptText || '');
    setSummary(summaryText || '');
    setDateRecorded(video?.dateRecorded || null);
  }, [transcriptText, summaryText, video]);

  useEffect(() => {
    const checkOverflow = (ref: React.RefObject<HTMLParagraphElement>, setOverflows: (val: boolean) => void, content: string) => {
      if (ref.current && content) {
        const collapsedMaxHeightApprox = 16 * 12; // Approx 12 lines * 16px/line
        setOverflows(ref.current.scrollHeight > collapsedMaxHeightApprox);
      } else {
        setOverflows(false);
      }
    };

    const checkBoth = () => {
        checkOverflow(transcriptContentRef, setTranscriptOverflows, transcript);
        checkOverflow(summaryContentRef, setSummaryOverflows, summary);
    }

    checkBoth();
    const timeoutId = setTimeout(checkBoth, 150);
    window.addEventListener('resize', checkBoth);
    
    return () => {
      window.removeEventListener('resize', checkBoth);
      clearTimeout(timeoutId);
    };
  }, [transcript, summary]);

  const handleDownloadAttachment = async (attachment: UIAttachment) => {
    if (!attachment.signedUrl && !attachment.fileUrl) { // Check both as fallback
      toast.error("File URL is missing for download.");
      return;
    }
    const supabase = createClient();
    try {
      // Prefer signedUrl if available, otherwise construct path from fileUrl
      let downloadPath: string;
      let isSigned = false;

      if (attachment.signedUrl) {
        downloadPath = attachment.signedUrl;
        isSigned = true;
      } else if (attachment.fileUrl) {
        // Assuming fileUrl is a path within 'attachments' bucket if not a full signed URL
        downloadPath = attachment.fileUrl.includes('attachments/')
          ? decodeURIComponent(attachment.fileUrl.split('attachments/')[1])
          : decodeURIComponent(attachment.fileUrl);
      } else {
        toast.error("No valid file path or URL for download.");
        return;
      }

      if (isSigned) {
        // If it's already a signed URL, just open it.
        window.open(downloadPath, '_blank');
        toast.success('Attachment download should start.');
        return;
      }
      
      // If not signed, attempt to download via storage API
      const { data, error } = await supabase.storage
        .from('attachments')
        .download(downloadPath);

      if (error) throw error;

      if (data) {
        const url = URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.fileName || 'downloaded-file';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('Attachment download started.');
      }
    } catch (error) {
      console.error('Error downloading attachment:', error);
      toast.error('Failed to download attachment.');
    }
  };
  
  const prepareAttachmentForDialog = (uiAttachment: UIAttachment | undefined): AttachmentDialogType | null => {
    if (!uiAttachment) return null;
    return {
      id: uiAttachment.id,
      title: uiAttachment.title || uiAttachment.fileName || 'Attachment',
      fileUrl: uiAttachment.fileUrl, // raw file path
      fileName: uiAttachment.fileName,
      fileType: uiAttachment.fileType,
      description: uiAttachment.description,
      dateCaptured: uiAttachment.dateCaptured instanceof Date ? uiAttachment.dateCaptured : (uiAttachment.dateCaptured ? new Date(uiAttachment.dateCaptured) : null),
      yearCaptured: uiAttachment.yearCaptured,
      displayUrl: uiAttachment.signedUrl || '', // This should be the signed URL
      PersonTags: (uiAttachment.PersonTags as any[]) || [] 
    };
  };

  const handleOpenDialog = (index: number) => {
    if (index >= 0 && index < attachments.length) {
      setSelectedAttachmentIndex(index);
      const dialogData = prepareAttachmentForDialog(attachments[index]);
      setSelectedAttachmentForDialog(dialogData);
      setIsDialogOpen(true);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedAttachmentIndex(null);
    setSelectedAttachmentForDialog(null);
  };

  const handleNextAttachment = () => {
    if (selectedAttachmentIndex !== null && selectedAttachmentIndex < attachments.length - 1) {
      handleOpenDialog(selectedAttachmentIndex + 1);
    }
  };

  const handlePreviousAttachment = () => {
    if (selectedAttachmentIndex !== null && selectedAttachmentIndex > 0) {
      handleOpenDialog(selectedAttachmentIndex - 1);
    }
  };

  const hasNext = selectedAttachmentIndex !== null && selectedAttachmentIndex < attachments.length - 1;
  const hasPrevious = selectedAttachmentIndex !== null && selectedAttachmentIndex > 0;
  
  if (!video && initialAttachments.length === 0 && !transcriptText && !summaryText) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center gap-6 bg-gray-50 dark:bg-gray-800 border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55]">
        <AlertTriangle className="w-16 h-16 text-gray-400 dark:text-gray-500" />
        <p className="text-lg text-center text-gray-600 dark:text-gray-300">
          No content available for this prompt response.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6 md:p-8 border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] bg-white dark:bg-gray-800">
      <div className="space-y-8">
        {/* Prompt Text and Topic Name Section */}
        <div>
          <h1 className="text-2xl font-semibold text-black dark:text-white mb-2">{promptText}</h1>
          {topicName && (
            <div className="inline-block px-3 py-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-full text-xs font-medium">
              {topicName}
            </div>
          )}
        </div>
        
        {/* Video Player Section */}
        {video && video.muxPlaybackId ? (
           <div className="space-y-4">
             <div className="rounded-lg overflow-hidden aspect-video bg-black">
               <MuxPlayer playbackId={video.muxPlaybackId} />
             </div>

             {/* Date and Download Section */}
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-2 gap-2 border-b pb-4 mb-6">
               <div className="flex items-center gap-2">
                 <span className="text-sm text-gray-500 dark:text-gray-400">Date Recorded:</span>
                 <span className="text-sm text-gray-900 dark:text-gray-100">
                   {dateRecorded ? new Date(dateRecorded).toLocaleDateString() : 'Not set'}
                 </span>
               </div>
               {video.muxAssetId && sharerId && (
                 <VideoDownloadButton
                   muxAssetId={video.muxAssetId}
                   videoType="promptResponse" // Distinguish from topic video if needed
                   userId={sharerId} 
                   promptName={promptText.substring(0, 30)} // Use part of prompt text for filename
                 />
               )}
             </div>
           </div>
        ) : (
          !initialAttachments.length && !transcriptText && !summaryText && ( // Only show "No video" if nothing else is present
            <div className="py-4 text-center text-gray-500 dark:text-gray-400">
              <VideoIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              No video response recorded.
            </div>
          )
        )}

        {/* Attachments Section */}
        {attachments.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
               Attachments
            </h3>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-1">
              {attachments.map((att, index) => (
                <ListenerAttachmentThumbnail
                  key={att.id}
                  attachment={{
                      id: att.id,
                      signedUrl: att.signedUrl,
                      fileName: att.fileName,
                      fileType: att.fileType,
                      fileUrl: att.fileUrl // Pass raw fileUrl for potential direct use or fallback
                  }}
                  size="md"
                  onClick={() => handleOpenDialog(index)}
                  onDownloadClick={() => handleDownloadAttachment(att)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Transcript Section */}
        {transcript && (
          <div className="pt-6 border-t mt-8 space-y-2">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Transcript</h3>
            <div className="relative">
              <div 
                className={cn(
                  "overflow-hidden transition-[max-height] duration-300 ease-in-out",
                  !isTranscriptExpanded ? "max-h-48" : "max-h-none" 
                )}
              >
                <p 
                  ref={transcriptContentRef} 
                  className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
                >
                  {transcript}
                </p>
              </div>
              {!isTranscriptExpanded && transcriptOverflows && (
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white via-white/80 dark:from-gray-800 dark:via-gray-800/80 to-transparent pointer-events-none" />
              )}
            </div>
            {transcriptOverflows && (
              <div className="flex justify-center pt-1">
                <Button 
                  variant="link"
                  className="p-0 h-auto text-sm font-medium text-[#1B4332] dark:text-[#8fbc55] hover:no-underline"
                  onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
                >
                  {isTranscriptExpanded ? 'Show Less' : 'Show More'}
                  {isTranscriptExpanded ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Summary Section */}
        {summary && (
          <div className="pt-6 border-t mt-8 space-y-2">
             <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Summary</h3>
             <div className="relative">
               <div 
                 className={cn(
                   "overflow-hidden transition-[max-height] duration-300 ease-in-out",
                   !isSummaryExpanded ? "max-h-48" : "max-h-none" 
                 )}
                >
                 <p 
                   ref={summaryContentRef} 
                   className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
                 >
                   {summary}
                 </p>
               </div>
               {!isSummaryExpanded && summaryOverflows && (
                 <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white via-white/80 dark:from-gray-800 dark:via-gray-800/80 to-transparent pointer-events-none" />
               )}
             </div>
             {summaryOverflows && (
               <div className="flex justify-center pt-1">
                 <Button 
                   variant="link"
                   className="p-0 h-auto text-sm font-medium text-[#1B4332] dark:text-[#8fbc55] hover:no-underline"
                   onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                 >
                   {isSummaryExpanded ? 'Show Less' : 'Show More'}
                   {isSummaryExpanded ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
                 </Button>
               </div>
             )}
          </div>
        )}

        {/* Dialog for Attachments */}
        {isDialogOpen && selectedAttachmentForDialog && (
            <ListenerAttachmentDialog
              attachment={selectedAttachmentForDialog}
              isOpen={isDialogOpen}
              onClose={handleCloseDialog}
              onNext={hasNext ? handleNextAttachment : undefined}
              onPrevious={hasPrevious ? handlePreviousAttachment : undefined}
              hasNext={hasNext}
              hasPrevious={hasPrevious}
              onDownload={(att) => handleDownloadAttachment(att as UIAttachment)} // Cast needed for now due to differing types in dialog
            />
        )}
      </div>
    </Card>
  );
} 