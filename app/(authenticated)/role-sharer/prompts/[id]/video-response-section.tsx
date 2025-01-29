'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Video as VideoIcon, Upload, Paperclip, Edit, Check, ArrowLeft, Download, Trash2, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';
import { RecordingInterface } from '@/components/RecordingInterface';
import { UploadPopup } from '@/components/UploadPopup';
import dynamic from 'next/dynamic';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useRouter } from 'next/navigation';
import { generateAISummary } from '@/utils/generateAISummary';
import { cleanTranscript } from '@/utils/cleanTranscript';
import { UIAttachment, toThumbnailAttachment, toUIAttachment } from '@/types/component-interfaces';
import { VideoResponseSectionProps, PromptResponseAttachment } from '@/types/models';
import { AttachmentDialog, Attachment } from '@/components/AttachmentDialog';
import AttachmentThumbnail from '@/components/AttachmentThumbnail';
import { VideoDownloadButton } from '@/components/video/VideoDownloadButton';


// Dynamically import components that could cause hydration issues
const MuxPlayer = dynamic(
  () => import('@/components/MuxPlayer').then(mod => mod.MuxPlayer),
  { ssr: false }
);

const AttachmentUpload = dynamic(
  () => import('@/components/AttachmentUpload').then(mod => mod.default),
  { ssr: false }
);

export function VideoResponseSection({ promptId, promptText, promptCategory, response }: VideoResponseSectionProps) {
  const router = useRouter();

  // Function to get storage path from full URL
  const getStoragePath = (url: string) => {
    if (!url) return '';
    if (!url.includes('attachments/')) return url;
    return decodeURIComponent(url.split('attachments/')[1]);
  };

  const [showRecordingInterface, setShowRecordingInterface] = useState(false);
  const [showUploadPopup, setShowUploadPopup] = useState(false);
  const [showAttachmentUpload, setShowAttachmentUpload] = useState(false);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [transcript, setTranscript] = useState(response?.video?.VideoTranscript?.[0]?.transcript || '');
  const [summary, setSummary] = useState(response?.summary || '');
  const [responseNotes, setResponseNotes] = useState(response?.responseNotes || '');
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [attachments, setAttachments] = useState<UIAttachment[]>(() => {
    if (!response?.PromptResponseAttachment?.length) return [];
    return response.PromptResponseAttachment
      .map(a => {
        // Convert dates to proper format
        const dbAttachment: PromptResponseAttachment = {
          ...a,
          uploadedAt: new Date(a.uploadedAt),
          dateCaptured: a.dateCaptured ? new Date(a.dateCaptured) : null,
          fileSize: a.fileSize || null,
          title: a.title || null,
          description: a.description || null,
          estimatedYear: a.estimatedYear || null,
          yearCaptured: a.yearCaptured || null,
          PromptResponseAttachmentPersonTag: a.PromptResponseAttachmentPersonTag || []
        };
        
        return toUIAttachment(dbAttachment);
      })
      .sort((a: UIAttachment, b: UIAttachment) => a.uploadedAt.getTime() - b.uploadedAt.getTime());
  });
  const [imageAttachments, setImageAttachments] = useState<UIAttachment[]>([]);
  const [gallerySignedUrls, setGallerySignedUrls] = useState<{ [key: string]: string }>({});
  const [isCleaningTranscript, setIsCleaningTranscript] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [previousTranscript, setPreviousTranscript] = useState('');
  const [previousSummary, setPreviousSummary] = useState('');
  const [cleaningSuccess, setCleaningSuccess] = useState(false);
  const [summarySuccess, setSummarySuccess] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [dateRecorded, setDateRecorded] = useState<Date | null>(
    response?.video?.dateRecorded ? new Date(response.video.dateRecorded) : null
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<string | null>(null);
  const [showVideoDeleteConfirm, setShowVideoDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add these state variables and refs after the existing state declarations
  const transcriptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const summaryTextareaRef = useRef<HTMLTextAreaElement>(null);
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const transcriptContentRef = useRef<HTMLDivElement>(null);
  const summaryContentRef = useRef<HTMLDivElement>(null);
  const notesContentRef = useRef<HTMLDivElement>(null);
  const [transcriptOverflows, setTranscriptOverflows] = useState(false);
  const [summaryOverflows, setSummaryOverflows] = useState(false);
  const [notesOverflows, setNotesOverflows] = useState(false);

  // Add the autoResize function and effects
  const autoResize = (textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return;
    textarea.style.height = 'inherit';
    textarea.style.height = `${Math.max(textarea.scrollHeight, 100)}px`;
  };

  // Auto-resize effects
  useEffect(() => {
    if (isEditingTranscript) {
      autoResize(transcriptTextareaRef.current);
    }
  }, [transcript, isEditingTranscript]);

  useEffect(() => {
    if (isEditingSummary) {
      autoResize(summaryTextareaRef.current);
    }
  }, [summary, isEditingSummary]);

  useEffect(() => {
    if (isEditingNotes) {
      autoResize(notesTextareaRef.current);
    }
  }, [responseNotes, isEditingNotes]);

  // Add overflow check effect
  useEffect(() => {
    const checkOverflow = () => {
      const countLines = (element: HTMLElement | null) => {
        if (!element) return 0;
        const lineHeight = parseInt(window.getComputedStyle(element).lineHeight);
        return Math.ceil(element.scrollHeight / lineHeight);
      };

      if (transcriptContentRef.current) {
        const lineCount = countLines(transcriptContentRef.current);
        setTranscriptOverflows(lineCount > 12);
      }
      if (summaryContentRef.current) {
        const lineCount = countLines(summaryContentRef.current);
        setSummaryOverflows(lineCount > 12);
      }
      if (notesContentRef.current) {
        const lineCount = countLines(notesContentRef.current);
        setNotesOverflows(lineCount > 12);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    const timeoutId = setTimeout(checkOverflow, 100);

    return () => {
      window.removeEventListener('resize', checkOverflow);
      clearTimeout(timeoutId);
    };
  }, [transcript, summary, responseNotes, isTranscriptExpanded, isSummaryExpanded, isNotesExpanded]);

  // Function to fetch updated response data with proper typing
  const fetchUpdatedResponse = useCallback(async () => {
    if (!response?.id) return;

    const supabase = createClient();
    try {
      const { data: updatedResponse, error } = await supabase
        .from('PromptResponse')
        .select(`
          id,
          summary,
          responseNotes,
          video:Video (
            id,
            muxPlaybackId,
            muxAssetId,
            dateRecorded,
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
            yearCaptured,
            PromptResponseAttachmentPersonTag (
              PersonTag (
                id,
                name,
                relation,
                profileSharerId
              )
            )
          )
        `)
        .eq('id', response.id)
        .single();

      if (error) throw error;

      if (updatedResponse) {
        // Update transcript if it exists
        if (updatedResponse.video?.VideoTranscript?.[0]?.transcript) {
          setTranscript(updatedResponse.video.VideoTranscript[0].transcript);
        }

        // Update dateRecorded if it exists
        if (updatedResponse.video?.dateRecorded) {
          setDateRecorded(new Date(updatedResponse.video.dateRecorded));
        } else {
          setDateRecorded(null);
        }

        // Update summary if it exists
        if (updatedResponse.summary !== undefined) {
          setSummary(updatedResponse.summary || '');
        }

        // Update responseNotes if it exists
        if (updatedResponse.responseNotes !== undefined) {
          setResponseNotes(updatedResponse.responseNotes || '');
        }

        // Update attachments if they exist
        if (updatedResponse.PromptResponseAttachment) {
          const updatedAttachments = updatedResponse.PromptResponseAttachment.map((a: Omit<PromptResponseAttachment, 'uploadedAt' | 'dateCaptured'> & { uploadedAt: string; dateCaptured: string | null }) => {
            // Convert dates to proper format
            const dbAttachment: PromptResponseAttachment = {
              ...a,
              uploadedAt: new Date(a.uploadedAt),
              dateCaptured: a.dateCaptured ? new Date(a.dateCaptured) : null,
              title: a.title || null,
              description: a.description || null,
              estimatedYear: a.estimatedYear || null,
              yearCaptured: a.yearCaptured || null,
              PromptResponseAttachmentPersonTag: a.PromptResponseAttachmentPersonTag || []
            };
            return toUIAttachment(dbAttachment);
          });
          
          // Sort by uploadedAt date
          const sortedAttachments = updatedAttachments.sort((a: UIAttachment, b: UIAttachment) => 
            a.uploadedAt.getTime() - b.uploadedAt.getTime()
          );
          
          setAttachments(sortedAttachments);
        }
      }
    } catch (error) {
      console.error('Error fetching updated response:', error);
      toast.error('Failed to update response data');
    }
  }, [response?.id]);

  // Update image attachments when main attachments change
  useEffect(() => {
    const filtered = attachments.filter((a: UIAttachment) => 
      a.fileType.startsWith('image/') || a.fileType === 'application/pdf'
    );
    setImageAttachments(filtered);
  }, [attachments]);

  // Fetch initial attachments on mount
  useEffect(() => {
    void fetchUpdatedResponse();
  }, [response?.id, fetchUpdatedResponse]);

  // Update fetchSignedUrls to use correct paths
  useEffect(() => {
    const fetchSignedUrls = async () => {
      const supabase = createClient();
      const updatedAttachments = await Promise.all(
        attachments.map(async (attachment) => {
          if (!attachment.fileUrl) return attachment;

          try {
            const storagePath = getStoragePath(attachment.fileUrl);
            if (!storagePath) return attachment;

            // Get signed URL for the image
            const { data, error } = await supabase
              .storage
              .from('attachments')
              .createSignedUrl(storagePath, 3600);

            if (error) throw error;
            if (!data?.signedUrl) return attachment;

            return {
              ...attachment,
              signedUrl: data.signedUrl,
              displayUrl: data.signedUrl // Use the same signed URL for both
            };
          } catch (error) {
            console.error('Error getting signed URL:', error);
            return attachment;
          }
        })
      );

      // Only update if there are actual changes
      const hasChanges = updatedAttachments.some((updated, index) => 
        updated.signedUrl !== attachments[index].signedUrl ||
        updated.displayUrl !== attachments[index].displayUrl
      );

      if (hasChanges) {
        setAttachments(updatedAttachments);
      }
    };

    const unsignedAttachments = attachments.some(a => !a.signedUrl);
    if (attachments.length > 0 && unsignedAttachments) {
      void fetchSignedUrls();
    }
  }, [attachments]);

  const handleStartEditing = async (section: 'transcript' | 'summary' | 'notes') => {
    if (!response?.id) {
      toast.error('No response found');
      return;
    }

    const supabase = createClient();
    try {
      // Fetch fresh data before starting edit
      const { data: freshData, error } = await supabase
        .from('PromptResponse')
        .select(`
          id,
          summary,
          responseNotes,
          video:Video (
            VideoTranscript (
              transcript
            )
          )
        `)
        .eq('id', response.id)
        .single();

      if (error) throw error;

      // Update state with fresh data
      if (freshData) {
        if (section === 'transcript' && freshData.video?.VideoTranscript?.[0]?.transcript) {
          setTranscript(freshData.video.VideoTranscript[0].transcript);
          setIsEditingTranscript(true);
        } else if (section === 'summary') {
          setSummary(freshData.summary || '');
          setIsEditingSummary(true);
        } else if (section === 'notes') {
          setResponseNotes(freshData.responseNotes || '');
          setIsEditingNotes(true);
        }
      }
    } catch (error) {
      console.error('Error fetching fresh data:', error);
      toast.error('Failed to start editing. Please try again.');
    }
  };

  // Update click handlers to handle both edit and save
  const handleTranscriptClick = () => {
    if (isEditingTranscript) {
      handleSaveTranscript();
    } else {
      handleStartEditing('transcript');
    }
  };

  const handleSummaryClick = () => {
    if (isEditingSummary) {
      handleSaveSummary();
    } else {
      handleStartEditing('summary');
    }
  };

  const handleNotesClick = () => {
    if (isEditingNotes) {
      handleSaveNotes();
    } else {
      handleStartEditing('notes');
    }
  };

  // Update handleSaveTranscript to match the expected type
  const handleSaveTranscript = async () => {
    if (!response?.video?.VideoTranscript?.[0]?.id) {
      toast.error("No transcript ID found");
      return;
    }

    const supabase = createClient();
    
    try {
      const { error } = await supabase
        .from('VideoTranscript')
        .update({ transcript })
        .eq('id', response.video.VideoTranscript[0].id)
        .select();

      if (error) {
        console.error('Error updating transcript:', error);
        toast.error("Failed to update transcript");
        return;
      }

      setIsEditingTranscript(false);
      // Force overflow check after saving
      setTimeout(() => {
        if (transcriptContentRef.current) {
          const lineHeight = parseInt(window.getComputedStyle(transcriptContentRef.current).lineHeight);
          const lineCount = Math.ceil(transcriptContentRef.current.scrollHeight / lineHeight);
          setTranscriptOverflows(lineCount > 12);
        }
      }, 100);
      toast.success("Transcript updated successfully");
    } catch (e) {
      console.error('Error in handleSaveTranscript:', e);
      toast.error("An unexpected error occurred");
    }
  };

  const handleSaveSummary = async () => {
    if (!response?.id) {
      toast.error("No response ID found");
      return;
    }

    const supabase = createClient();
    
    try {
      const { error } = await supabase
        .from('PromptResponse')
        .update({ summary })
        .eq('id', response.id)
        .select();

      if (error) {
        console.error('Error updating summary:', error);
        toast.error("Failed to update summary");
        return;
      }

      setIsEditingSummary(false);
      // Force overflow check after saving
      setTimeout(() => {
        if (summaryContentRef.current) {
          const lineHeight = parseInt(window.getComputedStyle(summaryContentRef.current).lineHeight);
          const lineCount = Math.ceil(summaryContentRef.current.scrollHeight / lineHeight);
          setSummaryOverflows(lineCount > 12);
        }
      }, 100);
      toast.success("Summary updated successfully");
    } catch (e) {
      console.error('Error in handleSaveSummary:', e);
      toast.error("An unexpected error occurred");
    }
  };

  const handleSaveNotes = async () => {
    if (!response?.id) {
      toast.error("No response ID found");
      return;
    }

    const supabase = createClient();
    
    try {
      const { error } = await supabase
        .from('PromptResponse')
        .update({ responseNotes })
        .eq('id', response.id)
        .select();

      if (error) {
        console.error('Error updating notes:', error);
        toast.error("Failed to update notes");
        return;
      }

      setIsEditingNotes(false);
      // Force overflow check after saving
      setTimeout(() => {
        if (notesContentRef.current) {
          const lineHeight = parseInt(window.getComputedStyle(notesContentRef.current).lineHeight);
          const lineCount = Math.ceil(notesContentRef.current.scrollHeight / lineHeight);
          setNotesOverflows(lineCount > 12);
        }
      }, 100);
      toast.success("Notes updated successfully");
    } catch (e) {
      console.error('Error in handleSaveNotes:', e);
      toast.error("An unexpected error occurred");
    }
  };

  // Add useCallback for the handlers
  const handlePrevious = useCallback(() => {
    if (selectedImageIndex === null || selectedImageIndex <= 0) return;
    setSelectedImageIndex(selectedImageIndex - 1);
  }, [selectedImageIndex]);

  const handleNext = useCallback(() => {
    if (selectedImageIndex === null || selectedImageIndex >= imageAttachments.length - 1) return;
    setSelectedImageIndex(selectedImageIndex + 1);
  }, [selectedImageIndex, imageAttachments.length]);

  // Function to get signed URL
  const getSignedUrl = useCallback(
    async (fileUrl: string): Promise<string | null> => {
      if (!fileUrl) return null;
      if (fileUrl.startsWith('http')) return fileUrl;

      const supabase = createClient();
      try {
        const storagePath = getStoragePath(fileUrl);
        if (!storagePath) return null;

        const { data, error } = await supabase
          .storage
          .from('attachments')
          .createSignedUrl(storagePath, 3600, {
            download: false,
            transform: {
              width: 800,
              height: 800,
              resize: 'cover'
            }
          });

        if (error) throw error;
        return data?.signedUrl || null;
      } catch (error) {
        console.error('Error getting signed URL:', error);
        return null;
      }
    },
    []
  );

  // Update handleUploadSuccess to match the expected type
  const handleVideoUploadSuccess = useCallback(async (muxId: string): Promise<void> => {
    console.log('Video uploaded with muxId:', muxId);
    setShowUploadPopup(false);
    await fetchUpdatedResponse();
  }, [fetchUpdatedResponse]);

  // Add a separate handler for attachment upload success
  const handleAttachmentUploadSuccess = useCallback(() => {
    void fetchUpdatedResponse();
  }, [fetchUpdatedResponse]);

  // Update warmUrlCache to use gallerySignedUrls
  const warmUrlCache = useCallback(async (attachmentIds: string[]) => {
    const newUrls: { [key: string]: string } = {};
    
    await Promise.all(
      attachmentIds.map(async (id) => {
        const attachment = attachments.find(a => a.id === id);
        if (attachment?.fileUrl && !gallerySignedUrls[id]) {
          const signedUrl = await getSignedUrl(attachment.fileUrl);
          if (signedUrl) {
            newUrls[id] = signedUrl;
          }
        }
      })
    );

    if (Object.keys(newUrls).length > 0) {
      setGallerySignedUrls(prev => ({
        ...prev,
        ...newUrls
      }));
    }
  }, [attachments, gallerySignedUrls, getSignedUrl]);

  // Update the keyboard navigation useEffect
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (selectedImageIndex === null) return;
      
      if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'Escape') {
        setSelectedImageIndex(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageIndex, handlePrevious, handleNext]);

  // Update the URL cache warming useEffect
  useEffect(() => {
    if (selectedImageIndex === null || !imageAttachments || imageAttachments.length === 0) return;

    const surroundingImageIds = imageAttachments
      .slice(Math.max(0, selectedImageIndex - 1), Math.min(imageAttachments.length, selectedImageIndex + 2))
      .map(a => a.id);
    
    warmUrlCache(surroundingImageIds);
  }, [selectedImageIndex, imageAttachments, warmUrlCache]);

  // Function to handle attachment deletion
  const handleDeleteAttachment = async (attachmentId: string): Promise<void> => {
    setAttachmentToDelete(attachmentId);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!attachmentToDelete) return;

    try {
      const supabase = createClient();
      const attachment = attachments.find(a => a.id === attachmentToDelete);
      
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
        .eq('id', attachmentToDelete);

      if (dbError) throw dbError;

      // Clear gallery URLs and update state
      setGallerySignedUrls(prev => {
        const newUrls = { ...prev };
        delete newUrls[attachmentToDelete];
        return newUrls;
      });
      setShowDeleteConfirm(false);
      setSelectedImageIndex(null);
      setAttachmentToDelete(null);
      
      // Update local state to avoid a full page reload
      setAttachments(prev => prev.filter(a => a.id !== attachmentToDelete));
      setImageAttachments(prev => prev.filter(a => a.id !== attachmentToDelete));
      
      toast.success('Attachment deleted successfully');
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error('Failed to delete attachment');
    }
  };

  // Update handleDownloadAttachment to use correct paths
  const handleDownloadAttachment = async (attachment: UIAttachment | Attachment): Promise<void> => {
    const supabase = createClient();
    try {
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
  };

  const handleDeleteVideo = async () => {
    if (!response?.video?.id || !response?.id) return;

    try {
      setIsDeleting(true);
      const supabase = createClient();

      // First delete the video from Mux if there's a Mux asset ID
      if (response.video.muxAssetId) {
        const res = await fetch('/api/mux/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            muxAssetId: response.video.muxAssetId,
          }),
        });

        if (!res.ok) {
          throw new Error('Failed to delete video from Mux');
        }
      }

      // Delete the video record from the database
      const { error: videoError } = await supabase
        .from('Video')
        .delete()
        .eq('id', response.video.id);

      if (videoError) throw videoError;

      // Delete the prompt response
      const { error: responseError } = await supabase
        .from('PromptResponse')
        .delete()
        .eq('id', response.id);

      if (responseError) throw responseError;

      setShowVideoDeleteConfirm(false);
      toast.success('Video deleted successfully');
      window.location.reload();
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error('Failed to delete video');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveDate = async () => {
    if (!response?.video?.id) return;

    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('Video')
        .update({ dateRecorded })
        .eq('id', response.video.id);

      if (error) throw error;
      setIsEditingDate(false);
      toast.success("Date updated successfully");
      await router.refresh();
    } catch (e) {
      console.error('Error updating date:', e);
      toast.error("Failed to update date");
    }
  };

  // Add getContentStyle helper function after the state declarations
  const getContentStyle = (isExpanded: boolean) => ({
    overflow: !isExpanded ? 'hidden' : 'visible'
  });

  if (!response?.video) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center gap-6 bg-gray-50">
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-500">Share your story through video</p>
        </div>
        <div className="flex gap-4">
          <Button
            onClick={() => setShowRecordingInterface(true)}
            variant="outline"
            className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full"
          >
            <VideoIcon className="mr-2 h-4 w-4" />
            Record
          </Button>
          <Button
            onClick={() => setShowUploadPopup(true)}
            variant="outline"
            className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
        </div>

        {showRecordingInterface && (
          <RecordingInterface
            promptId={promptId}
            onClose={() => setShowRecordingInterface(false)}
            onSave={async (blob: Blob): Promise<string> => {
              try {
                const supabase = createClient();

                // Create a prompt response record first
                const { data: responseData, error: responseError } = await supabase
                  .from('PromptResponse')
                  .insert({
                    promptId: promptId,
                  })
                  .select()
                  .single();

                if (responseError) throw responseError;
                if (!responseData?.id) throw new Error('No response ID returned');

                // Create a video record linked to the prompt response
                const { data: videoData, error: videoError } = await supabase
                  .from('Video')
                  .insert({
                    promptId: promptId,
                    promptResponseId: responseData.id,
                    status: 'UPLOADING'
                  })
                  .select()
                  .single();

                if (videoError) {
                  // If video creation fails, delete the prompt response
                  await supabase
                    .from('PromptResponse')
                    .delete()
                    .eq('id', responseData.id);
                  throw videoError;
                }
                if (!videoData?.id) throw new Error('No video ID returned');

                // Upload the video with the video ID in the path
                const { data: uploadData, error: uploadError } = await supabase.storage
                  .from('videos')
                  .upload(`${promptId}/${videoData.id}.webm`, blob);

                if (uploadError) {
                  // If upload fails, delete both records
                  await supabase
                    .from('Video')
                    .delete()
                    .eq('id', videoData.id);
                  await supabase
                    .from('PromptResponse')
                    .delete()
                    .eq('id', responseData.id);
                  throw uploadError;
                }

                if (!uploadData?.path) throw new Error('No upload path returned');

                // Update the video record with the storage path
                const { error: updateError } = await supabase
                  .from('Video')
                  .update({
                    storagePath: uploadData.path,
                    status: 'PROCESSING'
                  })
                  .eq('id', videoData.id);

                if (updateError) throw updateError;
                
                return videoData.id;
              } catch (error) {
                console.error('Error saving video:', error);
                toast.error('Failed to save video');
                throw error; // Re-throw the error instead of returning empty string
              }
            }}
          />
        )}

        {showUploadPopup && (
          <UploadPopup
            promptId={promptId}
            onClose={() => setShowUploadPopup(false)}
            open={showUploadPopup}
            promptText={promptText}
            onUploadSuccess={handleVideoUploadSuccess}
          />
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-8" suppressHydrationWarning>
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Video and Text Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Video Player */}
          <div className="relative">
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              {response.video.muxPlaybackId && (
                <div suppressHydrationWarning>
                  <MuxPlayer playbackId={response.video.muxPlaybackId} />
                </div>
              )}
            </div>
          </div>

          {/* Date Section */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Date Recorded:</span>
              {isEditingDate ? (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateRecorded ? dateRecorded.toISOString().split('T')[0] : ''}
                    onChange={(e) => setDateRecorded(e.target.value ? new Date(e.target.value) : null)}
                    className="px-2 py-1 border rounded text-sm"
                    aria-label="Date recorded"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveDate}
                    className="rounded-full"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {dateRecorded ? new Date(dateRecorded).toLocaleDateString() : 'Not set'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingDate(true)}
                    className="rounded-full"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              )}
            </div>
            {response?.video?.muxAssetId && response?.profileSharerId && (
              <VideoDownloadButton 
                muxAssetId={response.video.muxAssetId}
                videoType="prompt"
                userId={response.profileSharerId}
                topicName={promptCategory}
              />
            )}
          </div>

          {/* Transcript Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Transcript</h3>
              <div className="flex gap-2">
                {previousTranscript && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTranscript(previousTranscript);
                      setPreviousTranscript('');
                    }}
                    className="rounded-full"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Revert
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      if (!transcript || !response?.video?.VideoTranscript?.[0]?.id) {
                        toast.error("Missing transcript information", {
                          description: "The transcript or transcript ID is missing."
                        });
                        return;
                      }

                        setPreviousTranscript(transcript);
                        setIsCleaningTranscript(true);
                        setCleaningSuccess(false);

                        const cleanedTranscript = await cleanTranscript({
                          transcript,
                          transcriptId: response.video.VideoTranscript[0].id,
                          type: 'video'
                        });

                        setTranscript(cleanedTranscript);
                        setCleaningSuccess(true);
                        toast.success("Transcript cleaned successfully");
                        
                        setTimeout(() => {
                          setCleaningSuccess(false);
                        }, 3500);
                      } catch (error) {
                        console.error('Error cleaning transcript:', error);
                        toast.error("Failed to clean transcript");
                        if (previousTranscript) {
                          setTranscript(previousTranscript);
                        }
                      } finally {
                        setIsCleaningTranscript(false);
                      }
                  }}
                  className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full"
                  disabled={isCleaningTranscript}
                >
                  {isCleaningTranscript ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-[#1B4332] border-t-transparent" />
                      Cleaning Transcript...
                    </>
                  ) : cleaningSuccess ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Successfully Cleaned!
                    </>
                  ) : (
                    'Clean Transcript with AI'
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleTranscriptClick}
                  className="rounded-full"
                >
                  {isEditingTranscript ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Save
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </>
                  )}
                </Button>
              </div>
            </div>
            {isEditingTranscript ? (
              <Textarea
                ref={transcriptTextareaRef}
                value={transcript}
                onChange={(e) => {
                  setTranscript(e.target.value);
                  autoResize(transcriptTextareaRef.current);
                }}
                className="min-h-[100px] w-full resize-none transition-height duration-150 whitespace-pre-wrap bg-white focus-visible:ring-0 border-0 focus-visible:ring-offset-0 text-base"
                style={{ overflow: 'hidden' }}
              />
            ) : (
              <div className="space-y-2">
                <div
                  ref={transcriptContentRef}
                  className={`relative bg-white rounded-lg p-4 whitespace-pre-wrap transition-all duration-200 text-base ${
                    !isTranscriptExpanded && transcriptOverflows ? "max-h-[16em]" : ""
                  }`}
                  style={getContentStyle(isTranscriptExpanded)}
                >
                  {transcript || 'No transcript available'}
                  {!isTranscriptExpanded && transcriptOverflows && (
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent" />
                  )}
                </div>
                {transcriptOverflows && (
                  <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
                      className="text-[#1B4332] hover:bg-[#8fbc55] rounded-full transition-colors duration-200"
                    >
                      {isTranscriptExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-2" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-2" />
                          Show More
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Summary Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Summary</h3>
              <div className="flex gap-2">
                {previousSummary && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSummary(previousSummary);
                      setPreviousSummary('');
                    }}
                    className="rounded-full"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Revert
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!response?.video?.VideoTranscript?.[0]?.transcript) {
                      toast.error("No transcript available", {
                        description: "A transcript is required to generate an AI summary."
                      });
                      return;
                    }

                    try {
                      setIsGeneratingSummary(true);
                      setSummarySuccess(false);
                      setPreviousSummary(summary);
                      
                      const supabase = createClient();
                      
                      // Get user's first name
                      const { data: { user }, error: userError } = await supabase.auth.getUser();
                      if (userError) throw userError;

                      const { data: profile, error: profileError } = await supabase
                        .from('Profile')
                        .select('firstName')
                        .eq('id', user?.id)
                        .single();
                      if (profileError) throw profileError;

                      if (!profile?.firstName || !promptText || !promptCategory) {
                        toast.error("Missing information", {
                          description: "Some required information is missing. Please try again."
                        });
                        return;
                      }

                      console.log('Starting AI summary generation...', {
                        promptId: promptId,
                        responseId: response.id,
                        transcriptLength: response.video.VideoTranscript[0].transcript.length
                      });

                      const aiSummary = await generateAISummary({
                        promptText,
                        promptCategory,
                        firstName: profile.firstName,
                        transcript: response.video.VideoTranscript[0].transcript,
                        type: 'video',
                        videoId: response.video.id
                      });

                      console.log('AI summary generation completed', {
                        promptId: promptId,
                        responseId: response.id,
                        summaryLength: aiSummary.length
                      });

                      // Update the local state
                      setSummary(aiSummary);

                      // Save to database
                      const { error: saveError } = await supabase
                        .from('PromptResponse')
                        .update({ summary: aiSummary })
                        .eq('id', response.id);

                      if (saveError) {
                        console.error('Failed to save AI summary:', saveError);
                        throw saveError;
                      }

                      console.log('AI summary saved successfully');
                      setSummarySuccess(true);
                      toast.success("AI Summary generated successfully", {
                        description: "The summary has been generated and saved."
                      });

                      // Reset success state after a delay
                      setTimeout(() => {
                        setSummarySuccess(false);
                      }, 3500);
                    } catch (error) {
                      console.error('Error generating AI summary:', error);
                      toast.error("Failed to generate AI summary", {
                        description: error instanceof Error ? error.message : "Please try again."
                      });
                      // Revert to previous summary on error
                      if (previousSummary) {
                        setSummary(previousSummary);
                      }
                    } finally {
                      setIsGeneratingSummary(false);
                    }
                  }}
                  className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full"
                  disabled={isGeneratingSummary}
                >
                  {isGeneratingSummary ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-[#1B4332] border-t-transparent" />
                      Generating Summary...
                    </>
                  ) : summarySuccess ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Successfully Generated!
                    </>
                  ) : (
                    'Generate AI Summary'
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSummaryClick}
                  className="rounded-full"
                >
                  {isEditingSummary ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Save
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </>
                  )}
                </Button>
              </div>
            </div>
            {isEditingSummary ? (
              <Textarea
                ref={summaryTextareaRef}
                value={summary}
                onChange={(e) => {
                  setSummary(e.target.value);
                  autoResize(summaryTextareaRef.current);
                }}
                className="min-h-[100px] w-full resize-none transition-height duration-150 whitespace-pre-wrap bg-white focus-visible:ring-0 border-0 focus-visible:ring-offset-0 text-base"
                style={{ overflow: 'hidden' }}
                placeholder="Enter a summary..."
              />
            ) : (
              <div className="space-y-2">
                <div
                  ref={summaryContentRef}
                  className={`relative bg-white rounded-lg p-4 whitespace-pre-wrap transition-all duration-200 text-base ${
                    !isSummaryExpanded && summaryOverflows ? "max-h-[16em]" : ""
                  }`}
                  style={getContentStyle(isSummaryExpanded)}
                >
                  {summary || 'No summary available'}
                  {!isSummaryExpanded && summaryOverflows && (
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent" />
                  )}
                </div>
                {summaryOverflows && (
                  <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                      className="text-[#1B4332] hover:bg-[#8fbc55] rounded-full transition-colors duration-200"
                    >
                      {isSummaryExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-2" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-2" />
                          Show More
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Notes</h3>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNotesClick}
                  className="rounded-full"
                >
                  {isEditingNotes ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Save
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </>
                  )}
                </Button>
              </div>
            </div>
            {isEditingNotes ? (
              <Textarea
                ref={notesTextareaRef}
                value={responseNotes}
                onChange={(e) => {
                  setResponseNotes(e.target.value);
                  autoResize(notesTextareaRef.current);
                }}
                className="min-h-[100px] w-full resize-none transition-height duration-150 whitespace-pre-wrap bg-white focus-visible:ring-0 border-0 focus-visible:ring-offset-0 text-base"
                style={{ overflow: 'hidden' }}
                placeholder="Add notes about this response..."
              />
            ) : (
              <div className="space-y-2">
                <div
                  ref={notesContentRef}
                  className={`relative bg-white rounded-lg p-4 whitespace-pre-wrap transition-all duration-200 text-base ${
                    !isNotesExpanded && notesOverflows ? "max-h-[16em]" : ""
                  }`}
                  style={getContentStyle(isNotesExpanded)}
                >
                  {responseNotes || 'No notes available'}
                  {!isNotesExpanded && notesOverflows && (
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent" />
                  )}
                </div>
                {notesOverflows && (
                  <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                      className="text-[#1B4332] hover:bg-[#8fbc55] rounded-full transition-colors duration-200"
                    >
                      {isNotesExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-2" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-2" />
                          Show More
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Attachments Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Attachments</h3>
            <Button
              onClick={() => setShowAttachmentUpload(true)}
              variant="outline"
              size="sm"
              className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full"
            >
              <Paperclip className="mr-2 h-4 w-4" />
              Add Attachment
            </Button>
          </div>
          
          {attachments.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {attachments.map((attachment) => {
                const thumbnailAttachment = toThumbnailAttachment(attachment);
                return (
                  <div
                    key={attachment.id}
                    className="relative aspect-square group cursor-pointer"
                    onClick={() => {
                      if (attachment.fileType.startsWith('image/') || attachment.fileType === 'application/pdf') {
                        const imageIndex = imageAttachments.findIndex(img => img.id === attachment.id);
                        if (imageIndex !== -1) {
                          setSelectedImageIndex(imageIndex);
                        }
                      }
                    }}
                  >
                    <AttachmentThumbnail
                      attachment={thumbnailAttachment}
                      size="lg"
                    />
                    {/* Action buttons */}
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-white/80 hover:bg-white"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          return handleDownloadAttachment(attachment);
                        }}
                      >
                        <Download className="h-4 w-4" />
                        <span className="sr-only">Download attachment</span>
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-white/80 hover:bg-white hover:text-red-600"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          await handleDeleteAttachment(attachment.id);
                          return Promise.resolve();
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete attachment</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Image/PDF Gallery Dialog */}
      <AttachmentDialog
        attachment={selectedImageIndex !== null && imageAttachments[selectedImageIndex] ? {
          id: imageAttachments[selectedImageIndex].id,
          fileUrl: imageAttachments[selectedImageIndex].fileUrl,
          fileName: imageAttachments[selectedImageIndex].fileName,
          fileType: imageAttachments[selectedImageIndex].fileType,
          description: imageAttachments[selectedImageIndex].description,
          dateCaptured: imageAttachments[selectedImageIndex].dateCaptured?.toISOString().split('T')[0] || null,
          yearCaptured: imageAttachments[selectedImageIndex].yearCaptured,
          displayUrl: imageAttachments[selectedImageIndex].signedUrl || '',
          PersonTags: imageAttachments[selectedImageIndex].PersonTags || []
        } : null}
        isOpen={selectedImageIndex !== null}
        onClose={() => setSelectedImageIndex(null)}
        onNext={handleNext}
        onPrevious={handlePrevious}
        hasNext={selectedImageIndex !== null && selectedImageIndex < imageAttachments.length - 1}
        hasPrevious={selectedImageIndex !== null && selectedImageIndex > 0}
        signedUrl={selectedImageIndex !== null ? imageAttachments[selectedImageIndex]?.signedUrl : undefined}
        onSave={async () => {
          await router.refresh();
          // Update local state to reflect changes immediately
          await fetchUpdatedResponse();
          return Promise.resolve();
        }}
        onDelete={handleDeleteAttachment}
        onDownload={handleDownloadAttachment as (attachment: Attachment) => Promise<void>}
      />

      {showAttachmentUpload && (
        <AttachmentUpload
          promptResponseId={response.id}
          isOpen={showAttachmentUpload}
          onClose={() => setShowAttachmentUpload(false)}
          onUploadSuccess={handleAttachmentUploadSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Attachment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this attachment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded-full border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] transition-colors duration-200"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              className="rounded-full bg-red-600 hover:bg-red-700 transition-colors duration-200"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Delete Confirmation Dialog */}
      <Dialog open={showVideoDeleteConfirm} onOpenChange={setShowVideoDeleteConfirm}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Video Response</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this video response? This action cannot be undone and will remove the video, transcript, summary, and notes.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowVideoDeleteConfirm(false)}
              className="rounded-full border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] transition-colors duration-200"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteVideo}
              className="rounded-full bg-red-600 hover:bg-red-700 transition-colors duration-200"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Video Section - Added at the bottom */}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-red-600">Danger zone!</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowVideoDeleteConfirm(true)}
            className="bg-white hover:bg-red-50 hover:text-red-600 text-red-600 rounded-full border border-red-200"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete video response
          </Button>
        </div>
      </div>
    </div>
  );
} 