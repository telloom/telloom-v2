// components/listener/ListenerAttachmentDialog.tsx
// LISTENER-SPECIFIC: A dialog component ONLY for viewing attachment metadata and content.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
// Removed Input, Label, Textarea, Select, Command, Popover as editing is disabled
import { Label } from "@/components/ui/label";
import { createClient } from '@/utils/supabase/client';
import { FileText, Tag, X, ChevronLeft, ChevronRight, Loader2, ImageOff, Download, FileWarning } from 'lucide-react'; // Removed Edit, Check, PlusCircle, Trash2
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
import { PersonRelation, PersonTag, PromptResponseAttachmentPersonTag as PromptResponseAttachmentPersonTagType } from '@/types/models';
import NextImage from 'next/image';
import AttachmentThumbnail from '@/components/AttachmentThumbnail'; // Keep using shared thumbnail for now
// Removed useAuth and useQuery as they were likely for editing/tag fetching

// Interface remains mostly the same, focusing on display data
export interface Attachment {
  id: string;
  fileUrl: string;
  displayUrl?: string; // May still be needed if signed URL generation fails
  fileType: string;
  fileName: string;
  title: string | null;
  description: string | null;
  dateCaptured: Date | null;
  yearCaptured: number | null;
  PersonTags: PersonTag[];
  profileSharerId?: string; // Keep for context if needed, though not directly used
}

// Simplified Props for Listener view
interface ListenerAttachmentDialogProps {
  attachment: Attachment | null;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
  onDownload?: (attachment: Attachment) => Promise<void>; // Keep download
}

export function ListenerAttachmentDialog({
  attachment,
  isOpen,
  onClose,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
  onDownload,
}: ListenerAttachmentDialogProps) {
  console.log('[LAD Enter] Props:', { attachmentId: attachment?.id, isOpen, hasNext, hasPrevious });
  const supabase = createClient();

  // State for viewing only
  const [viewingAttachment, setViewingAttachment] = useState<Attachment | null>(null);
  const [currentSignedUrl, setCurrentSignedUrl] = useState<string | null>(null);
  const [isUrlLoading, setIsUrlLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reset state when attachment changes
  useEffect(() => {
    if (attachment) {
      // Simplified state update for viewing
      setViewingAttachment({
        ...attachment,
        PersonTags: attachment.PersonTags || [] // Ensure tags array exists
      });
    } else {
      setViewingAttachment(null);
    }
  }, [attachment]);

  // Fetch Signed URL (same logic as before, just simplified state)
  useEffect(() => {
    let isMounted = true;
    const fetchUrl = async () => {
      if (!viewingAttachment || !viewingAttachment.fileUrl) {
        setCurrentSignedUrl(null);
        setIsUrlLoading(false);
        setError('Invalid file path');
        return;
      }

      setIsUrlLoading(true);
      setCurrentSignedUrl(null);
      setError(null);

      let filePath: string | null = null;
      const originalFileUrl = viewingAttachment.fileUrl;

      if (originalFileUrl && originalFileUrl.startsWith('http')) {
          try {
              const urlObject = new URL(originalFileUrl);
              const pathSegments = urlObject.pathname.split('/attachments/');
              if (pathSegments.length > 1) {
                  filePath = pathSegments[1];
              } else { /* Handle old format if needed */ }
          } catch (e) { /* Handle parse error */ }
      } else if (originalFileUrl) {
          filePath = originalFileUrl;
      }

      if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
        setCurrentSignedUrl(null);
        setIsUrlLoading(false);
        setError('Invalid file path');
        return;
      }

      try {
        const { data, error: urlError } = await supabase.storage
          .from('attachments')
          .createSignedUrl(filePath, 3600); // 1 hour expiry

        if (!isMounted) return;

        if (urlError) {
          console.error('[ListenerAttachmentDialog] Error getting signed URL:', urlError);
          setError('Failed to load preview URL');
          setCurrentSignedUrl(null);
        } else if (data?.signedUrl) {
          setCurrentSignedUrl(data.signedUrl);
          setError(null);
        } else {
           setError('Could not get preview URL');
           setCurrentSignedUrl(null);
        }
      } catch (catchError) {
        console.error('[ListenerAttachmentDialog] Unexpected error in fetchUrl:', catchError);
        if (isMounted) {
             setError('Error loading preview');
             setCurrentSignedUrl(null);
        }
      } finally {
        if (isMounted) {
          setIsUrlLoading(false);
        }
      }
    };

    fetchUrl();

    return () => { isMounted = false; };
  }, [viewingAttachment?.id, viewingAttachment?.fileUrl, supabase]); // Depend on viewing state


  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  console.log('[LAD Before Null Check] viewingAttachment:', viewingAttachment?.id, 'isOpen:', isOpen);
  if (!viewingAttachment) return null;

  const showLoadingState = isUrlLoading;

  // Helper to format date
  const formatDate = (dateInput: Date | string | null): string | null => {
    if (!dateInput) return null;
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      // Check if date is valid after parsing/conversion
      if (isNaN(date.getTime())) {
         return null; // Return null for invalid dates
      }
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return null;
    }
  };

  const displayDate = formatDate(viewingAttachment.dateCaptured);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        {console.log('[LAD Dialog Render] isOpen inside Dialog component:', isOpen, 'viewingAttachmentId:', viewingAttachment?.id)}
        <DialogContent
          className="max-w-[95vw] md:max-w-4xl h-[90vh] flex flex-col p-4 md:p-6 mx-auto overflow-y-auto"
          aria-describedby="attachment-details-description"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>View Attachment</DialogTitle>
            <DialogDescription id="attachment-details-description">
              View details for the selected attachment.
            </DialogDescription>
          </DialogHeader>

          {/* Main Content */}
          <div className="flex flex-col lg:grid lg:grid-cols-[3fr_1fr] h-full">
            {/* Left Side - Image/PDF */}
            <div className="w-full lg:h-full flex flex-col">
              {/* Content Container */}
              <div className="relative bg-gray-100 w-full h-[75vh] lg:h-[78vh] overflow-hidden">
                {showLoadingState ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : error ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                    <FileWarning className="h-12 w-12 text-red-400 mb-2" />
                    <p className="text-sm text-red-500">{error}</p>
                  </div>
                ) : viewingAttachment && viewingAttachment.fileType.startsWith("image/") && currentSignedUrl ? (
                  <div className="w-full h-full relative">
                    <NextImage
                      src={currentSignedUrl}
                      alt={viewingAttachment.title || viewingAttachment.fileName || "Attachment Image"}
                      fill
                      className={`object-contain transition-opacity duration-300`}
                      sizes="(max-width: 768px) 90vw, 45vw"
                    />
                  </div>
                ) : viewingAttachment && viewingAttachment.fileType === 'application/pdf' && currentSignedUrl ? (
                  <iframe
                    src={currentSignedUrl}
                    title={viewingAttachment.fileName || "PDF Document"}
                    className="w-full h-full border-0"
                  />
                ) : viewingAttachment ? (
                  // Use shared thumbnail component for non-image/pdf fallback
                  <AttachmentThumbnail
                    attachment={{
                      ...viewingAttachment,
                      signedUrl: currentSignedUrl ?? undefined,
                    }}
                    size="lg"
                    className="max-w-full max-h-full"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                     <FileWarning className="h-12 w-12 text-gray-400 mb-2" />
                     <p className="text-sm text-gray-500">No attachment data</p>
                  </div>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center gap-2 p-4 bg-white border-b lg:border-t lg:border-b-0">
                <div className="flex gap-2">
                  {hasPrevious && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onPrevious}
                      disabled={!hasPrevious || showLoadingState}
                      className="rounded-full"
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Previous
                    </Button>
                  )}
                  {hasNext && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onNext}
                      disabled={!hasNext || showLoadingState}
                      className="rounded-full"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  {/* Download Button - Keep */}
                  {onDownload && viewingAttachment && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDownload(viewingAttachment)}
                      className="rounded-full"
                      disabled={!currentSignedUrl || showLoadingState}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  )}
                  {/* Delete Button Removed */}
                </div>
              </div>
            </div>

            {/* Right Side - Metadata (View Only) */}
            <div className="w-full lg:h-[calc(100vh-8rem)] lg:border-l flex flex-col">
              {/* Metadata Header - Removed Edit Button */}
              <div className="flex items-center justify-between p-4 border-b lg:sticky lg:top-0 lg:z-10">
                <h3 className="font-medium">Details</h3>
                 {/* Edit/Save button removed */}
              </div>

              {/* Scrollable Metadata Content */}
              <div className="p-4 space-y-6 lg:overflow-y-auto lg:flex-1">
                {/* Title (View Only) - REMOVED */}
                {/* 
                 {viewingAttachment.title && (
                   <div className="space-y-1">
                     <Label className="text-xs text-muted-foreground">Title</Label>
                     <p className="text-sm">{viewingAttachment.title}</p>
                   </div>
                 )}
                */}

                {/* Description (View Only) */}
                 {viewingAttachment.description && (
                   <div className="space-y-1">
                     <Label className="text-xs text-muted-foreground">Description</Label>
                     <p className="text-sm whitespace-pre-wrap">{viewingAttachment.description}</p>
                   </div>
                 )}

                {/* Date/Year (View Only) */}
                <div className="space-y-2">
                  {(displayDate || viewingAttachment.yearCaptured) && (
                    <Label className="text-xs text-muted-foreground">Date Captured</Label>
                  )}
                  {displayDate && (
                     <p className="text-sm">{displayDate}</p>
                  )}
                  {viewingAttachment.yearCaptured && !displayDate && (
                     <p className="text-sm">{viewingAttachment.yearCaptured}</p>
                  )}
                  {!displayDate && !viewingAttachment.yearCaptured && (
                    <p className="text-sm text-muted-foreground italic">No date recorded</p>
                  )}
                </div>

                {/* Tags (View Only) */}
                <div>
                  <Label id="people-label" className="text-xs text-muted-foreground">People Tagged</Label>
                   {/* Add Person dropdown removed */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {viewingAttachment.PersonTags && viewingAttachment.PersonTags.length > 0 ? (
                       viewingAttachment.PersonTags.map(tag => (
                         <Badge
                           key={tag.id}
                           variant="secondary"
                           // Removed editing class/icon
                         >
                           <Tag className="h-3 w-3 mr-1" />
                           {tag.name} ({tag.relation})
                         </Badge>
                       ))
                     ) : (
                       <span className="text-sm text-muted-foreground italic">No people tagged</span>
                     )
                   }
                  </div>
                </div>

                {/* File Info (View Only) */}
                <div className="pt-4 border-t">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>File name: {viewingAttachment.fileName}</p>
                    <p>File type: {viewingAttachment.fileType}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Delete confirmation dialog removed */}
    </>
  );
} 