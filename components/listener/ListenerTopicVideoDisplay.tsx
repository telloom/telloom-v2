// components/listener/ListenerTopicVideoDisplay.tsx
// Displays topic video, transcript, summary, and attachments for a listener (read-only).

'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video as VideoIcon, Download, ChevronDown, ChevronUp, Paperclip } from 'lucide-react';
import dynamic from 'next/dynamic';
import { createClient } from '@/utils/supabase/client'; // For storage interactions like download
import { toast } from 'sonner';
import { UIAttachment, toThumbnailAttachment } from '@/types/component-interfaces';
import { AttachmentDialog, Attachment as AttachmentDialogType } from '@/components/AttachmentDialog'; // Re-check props for AttachmentDialogType
import AttachmentThumbnail from '@/components/AttachmentThumbnail';
import { VideoDownloadButton } from '@/components/video/VideoDownloadButton';
import { PersonTag } from '@/types/models'; // For PersonTags in AttachmentDialogType if needed
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area'; // Useful for long content
import Image from 'next/image';
import { ListenerAttachmentDialog } from '@/components/listener/ListenerAttachmentDialog'; // Import the Listener dialog
import ListenerAttachmentThumbnail from '@/components/listener/ListenerAttachmentThumbnail'; // Import the Listener thumbnail
import { cn } from '@/lib/utils';

// Dynamically import MuxPlayer
const MuxPlayer = dynamic(
  () => import('@/components/MuxPlayer').then(mod => mod.MuxPlayer),
  { ssr: false }
);

interface ListenerTopicVideoDisplayProps {
  topicName: string;
  sharerId: string | null; // ID of the sharer whose content is being viewed
  video?: {
    id: string; // Video ID, useful for context if ever needed
    muxPlaybackId: string;
    muxAssetId: string; // For download
    dateRecorded?: string | null;
    TopicVideoTranscript?: Array<{
      id: string; // Transcript ID
      transcript: string;
    }>;
    summary?: string;
  };
  attachments?: UIAttachment[]; // Already processed UIAttachments
}

export function ListenerTopicVideoDisplay({
  topicName,
  sharerId,
  video,
  attachments: initialAttachments = [],
}: ListenerTopicVideoDisplayProps) {
  const [transcript, setTranscript] = useState(video?.TopicVideoTranscript?.[0]?.transcript || '');
  const [summary, setSummary] = useState(video?.summary || '');
  const [dateRecorded, setDateRecorded] = useState<string | null>(video?.dateRecorded || null);

  const [attachments, setAttachments] = useState<UIAttachment[]>(initialAttachments);

  // --- NEW State for Dialog --- 
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
    setTranscript(video?.TopicVideoTranscript?.[0]?.transcript || '');
    setSummary(video?.summary || '');
    setDateRecorded(video?.dateRecorded || null);
  }, [video]);

  // Check for overflow - Refined logic
  useEffect(() => {
    const checkOverflow = (ref: React.RefObject<HTMLParagraphElement>, setOverflows: (val: boolean) => void) => {
      if (ref.current) {
        // Check if actual content height exceeds the initial collapsed max-height (e.g., 12 lines)
        // Use a fixed pixel height approximation or calculate based on line-height
        const collapsedMaxHeightApprox = 16 * 12; // Approx 12 lines * 16px/line (adjust as needed)
        setOverflows(ref.current.scrollHeight > collapsedMaxHeightApprox);
      }
    };

    // Check initially and on resize/content change
    const checkBoth = () => {
        checkOverflow(transcriptContentRef, setTranscriptOverflows);
        checkOverflow(summaryContentRef, setSummaryOverflows);
    }

    checkBoth(); // Initial check
    const timeoutId = setTimeout(checkBoth, 150); // Check after potential render updates
    window.addEventListener('resize', checkBoth);
    
    return () => {
      window.removeEventListener('resize', checkBoth);
      clearTimeout(timeoutId);
    };
  }, [transcript, summary]); // Re-check if transcript/summary content changes

  const getContentStyle = (isExpanded: boolean) => ({
    maxHeight: isExpanded ? 'none' : '16em', // Tailwind's em scale, approx 12 lines of base text
    overflow: isExpanded ? 'visible' : 'hidden',
  });

  const handleDownloadAttachment = async (attachment: UIAttachment) => {
    if (!attachment.fileUrl) {
      toast.error("File URL is missing.");
      return;
    }
    const supabase = createClient();
    try {
      const filePath = attachment.fileUrl.includes('attachments/')
        ? decodeURIComponent(attachment.fileUrl.split('attachments/')[1])
        // if it's already a signed URL, this part might be tricky. Assuming raw path for now.
        // For full signed URLs, direct download might be better: window.open(attachment.fileUrl, '_blank');
        : decodeURIComponent(attachment.fileUrl); 

      const { data, error } = await supabase.storage
        .from('attachments') // Ensure this is the correct bucket
        .download(filePath);

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
  
  // Prepare attachment for dialog, ensuring 'title' is present (simplified)
  const prepareAttachmentForDialog = (uiAttachment: UIAttachment | undefined): AttachmentDialogType | null => {
    if (!uiAttachment) return null;
    return {
      id: uiAttachment.id,
      title: uiAttachment.title || uiAttachment.fileName || 'Attachment', // Ensure title
      fileUrl: uiAttachment.fileUrl,
      fileName: uiAttachment.fileName,
      fileType: uiAttachment.fileType,
      description: uiAttachment.description,
      dateCaptured: uiAttachment.dateCaptured instanceof Date ? uiAttachment.dateCaptured : null,
      yearCaptured: uiAttachment.yearCaptured,
      displayUrl: uiAttachment.signedUrl || uiAttachment.fileUrl || '', // Use signedUrl if available
      PersonTags: (uiAttachment.PersonTags as PersonTag[]) || [] // Cast to PersonTag[]
    };
  };

  // --- NEW: Dialog Handlers ---
  const handleOpenDialog = (index: number) => {
    if (index >= 0 && index < attachments.length) {
      setSelectedAttachmentIndex(index);
      const dialogData = prepareAttachmentForDialog(attachments[index]);
      setSelectedAttachmentForDialog(dialogData);
      setIsDialogOpen(true);
    } else {
       console.warn('[LTVD] Attempted to open dialog with invalid index:', index);
       setIsDialogOpen(false); // Ensure dialog is closed if index is bad
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
  
  // --- END NEW Dialog Handlers ---

  if (!video && initialAttachments.length === 0) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center gap-6 bg-gray-50 dark:bg-gray-800">
        <VideoIcon className="w-16 h-16 text-gray-400 dark:text-gray-500" />
        <p className="text-lg text-gray-600 dark:text-gray-300">No video or attachments available for this topic.</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6 md:p-8 border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] bg-white dark:bg-gray-800">
      <div className="space-y-8">
        {/* Topic Title and Pill */}
        <div> {/* Added wrapper div */} 
          <h2 className="text-2xl font-semibold text-black dark:text-white mb-2">{topicName}</h2> {/* Added mb-2 */} 
          {/* Added Topic Summary Pill */} 
          <div className="inline-block px-3 py-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-full text-xs font-medium">
            Topic Summary
          </div>
        </div>
        
        {/* Video Player Section */} 
        {video && video.muxPlaybackId && (
           <div className="space-y-4"> {/* Add spacing below player */} 
             <div className="rounded-lg overflow-hidden aspect-video bg-black">
               <MuxPlayer playbackId={video.muxPlaybackId} />
             </div>

             {/* Date and Download Section - Moved below player */} 
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-2 gap-2 border-b pb-4 mb-6"> {/* Added border */} 
               <div className="flex items-center gap-2">
                 <span className="text-sm text-gray-500 dark:text-gray-400">Date Recorded:</span>
                 <span className="text-sm text-gray-900 dark:text-gray-100">
                   {dateRecorded ? new Date(dateRecorded).toLocaleDateString() : 'Not set'}
                 </span>
               </div>
               {video.muxAssetId && sharerId && (
                 <VideoDownloadButton
                   muxAssetId={video.muxAssetId}
                   videoType="topic" 
                   userId={sharerId} 
                   promptCategoryName={topicName}
                 />
               )}
             </div>
           </div>
        )}

        {/* Attachments Section */} 
        {attachments.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
               All Topic Attachments
            </h3>
            {/* Use auto-fit grid columns */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-1">
              {attachments.map((att, index) => (
                <ListenerAttachmentThumbnail
                  key={att.id}
                  attachment={{
                      id: att.id,
                      signedUrl: att.signedUrl,
                      fileName: att.fileName,
                      fileType: att.fileType,
                      fileUrl: att.fileUrl
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
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Transcript</h3> {/* Ensured consistent heading color */} 
             {/* Added relative positioning */}
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
              {/* Added Fade Overlay */} 
              {!isTranscriptExpanded && transcriptOverflows && (
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white via-white/80 dark:from-gray-800 dark:via-gray-800/80 to-transparent pointer-events-none" />
              )}
            </div>
            {transcriptOverflows && (
              // Centered Button
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
             <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Summary</h3> {/* Ensured consistent heading color */} 
             {/* Added relative positioning */}
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
                   {summary || 'No summary available.'}
                 </p>
               </div>
                {/* Added Fade Overlay */} 
               {!isSummaryExpanded && summaryOverflows && (
                 <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white via-white/80 dark:from-gray-800 dark:via-gray-800/80 to-transparent pointer-events-none" />
               )}
             </div>
             {summaryOverflows && (
               // Centered Button
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

        {/* Render the Dialog - remains the same */} 
        {isDialogOpen && selectedAttachmentForDialog && (
            <ListenerAttachmentDialog
              attachment={selectedAttachmentForDialog}
              isOpen={isDialogOpen}
              onClose={handleCloseDialog}
              onNext={hasNext ? handleNextAttachment : undefined}
              onPrevious={hasPrevious ? handlePreviousAttachment : undefined}
              hasNext={hasNext}
              hasPrevious={hasPrevious}
              onDownload={(att) => handleDownloadAttachment(att as unknown as UIAttachment)}
            />
        )}
      </div>
    </Card>
  );
} 