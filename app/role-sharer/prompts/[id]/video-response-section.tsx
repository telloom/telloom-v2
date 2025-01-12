'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Video as VideoIcon, Play, Upload, Paperclip, Edit, Check, ImageOff, ChevronLeft, ChevronRight, X, FileText, ArrowLeft, Download, Trash2 } from 'lucide-react';
import { VideoPopup } from '@/components/VideoPopup';
import { RecordingInterface } from '@/components/RecordingInterface';
import { UploadPopup } from '@/components/UploadPopup';
import dynamic from 'next/dynamic';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import Image from 'next/image';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useRouter } from 'next/navigation';
import { generateAISummary } from '@/utils/generateAISummary';
import { cleanTranscript } from '@/utils/cleanTranscript';
import { VideoResponseSectionProps } from '@/types/models';
import { AttachmentDialog } from '@/components/AttachmentDialog';
import AttachmentThumbnail from '@/components/AttachmentThumbnail';

// Dynamically import components that could cause hydration issues
const MuxPlayer = dynamic(
  () => import('@/components/MuxPlayer').then(mod => mod.MuxPlayer),
  { ssr: false }
);

const AttachmentUpload = dynamic(
  () => import('@/components/AttachmentUpload').then(mod => mod.default),
  { ssr: false }
);

export function VideoResponseSection({ promptId, promptCategoryId, promptText, promptCategory, response }: VideoResponseSectionProps) {
  const router = useRouter();
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
  const [attachments, setAttachments] = useState(response?.PromptResponseAttachment || []);
  const imageAttachments = attachments.filter(
    attachment => attachment.fileType.startsWith('image/')
  ) || [];
  const [gallerySignedUrls, setGallerySignedUrls] = useState<{ [key: string]: string }>({});
  const [isCleaningTranscript, setIsCleaningTranscript] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [previousTranscript, setPreviousTranscript] = useState('');
  const [previousSummary, setPreviousSummary] = useState('');
  const [cleaningSuccess, setCleaningSuccess] = useState(false);
  const [summarySuccess, setSummarySuccess] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [dateRecorded, setDateRecorded] = useState<Date | null>(response?.dateRecorded ? new Date(response.dateRecorded) : null);

  // Function to fetch updated response data
  const fetchUpdatedResponse = async () => {
    if (!response?.id) return;

    const supabase = createClient();
    const { data: updatedResponse, error } = await supabase
      .from('PromptResponse')
      .select(`
        id,
        summary,
        responseNotes,
        PromptResponseAttachment (
          id,
          fileUrl,
          fileType,
          fileName,
          description,
          dateCaptured,
          yearCaptured
        )
      `)
      .eq('id', response.id)
      .single();

    if (error) {
      console.error('Error fetching updated response:', error);
      return;
    }

    // Update the local state with new data
    if (updatedResponse?.PromptResponseAttachment) {
      setAttachments(updatedResponse.PromptResponseAttachment);
      // Clear signed URLs cache to force re-fetch for new attachments
      setGallerySignedUrls({});
    }
  };

  // Initial setup of attachments
  useEffect(() => {
    if (response?.PromptResponseAttachment) {
      setAttachments(response.PromptResponseAttachment);
    }
  }, [response?.PromptResponseAttachment]);

  const handleSaveTranscript = async () => {
    if (!response?.video?.VideoTranscript?.[0]?.id) {
      console.error('No transcript ID found for update');
      toast.error("No transcript ID found");
      return;
    }

    console.log('Attempting to save transcript:', {
      transcriptId: response.video.VideoTranscript[0].id,
      transcript,
      currentResponse: response
    });

    const supabase = createClient();
    console.log('Making Supabase request to update transcript...');
    
    try {
      const { data, error } = await supabase
        .from('VideoTranscript')
        .update({ transcript })
        .eq('id', response.video.VideoTranscript[0].id)
        .select();

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Error updating transcript - full details:', {
          error,
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          requestData: { transcript, transcriptId: response.video.VideoTranscript[0].id }
        });
        toast.error("Failed to update transcript");
        return;
      }

      console.log('Transcript updated successfully:', data);
      setIsEditingTranscript(false);
      toast.success("Transcript updated successfully");
    } catch (e) {
      console.error('Unexpected error in handleSaveTranscript:', e);
      toast.error("An unexpected error occurred");
    }
  };

  const handleSaveSummary = async () => {
    if (!response?.id) {
      console.error('No response ID found for summary update');
      toast.error("No response ID found");
      return;
    }

    console.log('Attempting to save summary:', {
      responseId: response.id,
      summary,
      currentResponse: response
    });

    const supabase = createClient();
    console.log('Making Supabase request to update summary...');
    
    try {
      const { data, error } = await supabase
        .from('PromptResponse')
        .update({ summary })
        .eq('id', response.id)
        .select();

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Error updating summary - full details:', {
          error,
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          requestData: { summary, responseId: response.id }
        });
        toast.error("Failed to update summary");
        return;
      }

      console.log('Summary updated successfully:', data);
      setIsEditingSummary(false);
      toast.success("Summary updated successfully");
    } catch (e) {
      console.error('Unexpected error in handleSaveSummary:', e);
      toast.error("An unexpected error occurred");
    }
  };

  const handleSaveNotes = async () => {
    if (!response?.id) {
      console.error('No response ID found for notes update');
      toast.error("No response ID found");
      return;
    }

    console.log('Attempting to save notes:', {
      responseId: response.id,
      notes: responseNotes,
      currentResponse: response
    });

    const supabase = createClient();
    console.log('Making Supabase request to update notes...');
    
    try {
      const { data, error } = await supabase
        .from('PromptResponse')
        .update({ responseNotes })
        .eq('id', response.id)
        .select();

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Error updating notes - full details:', {
          error,
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          requestData: { responseNotes, responseId: response.id }
        });
        toast.error("Failed to update notes");
        return;
      }

      console.log('Notes updated successfully:', data);
      setIsEditingNotes(false);
      toast.success("Notes updated successfully");
    } catch (e) {
      console.error('Unexpected error in handleSaveNotes:', e);
      toast.error("An unexpected error occurred");
    }
  };

  const handlePrevious = () => {
    if (selectedImageIndex === null || selectedImageIndex <= 0) return;
    setSelectedImageIndex(selectedImageIndex - 1);
  };

  const handleNext = () => {
    if (selectedImageIndex === null || selectedImageIndex >= imageAttachments.length - 1) return;
    setSelectedImageIndex(selectedImageIndex + 1);
  };

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
  }, [selectedImageIndex]);

  // Function to get signed URL
  const getSignedUrl = async (fileUrl: string) => {
    const supabase = createClient();
    const filePath = fileUrl.includes('attachments/') 
      ? fileUrl.split('attachments/')[1]
      : fileUrl;
    
    const { data, error } = await supabase
      .storage
      .from('attachments')
      .createSignedUrl(filePath, 3600);

    if (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }

    return data?.signedUrl;
  };

  useEffect(() => {
    if (selectedImageIndex === null || !imageAttachments || imageAttachments.length === 0) return;
    const index = selectedImageIndex;

    async function getGallerySignedUrl() {
      if (index >= imageAttachments.length) return;
      
      const attachment = imageAttachments[index];
      if (!attachment?.fileUrl) return;

      try {
        const signedUrl = await getSignedUrl(attachment.fileUrl);
        if (signedUrl) {
          setGallerySignedUrls(prev => ({
            ...prev,
            [attachment.id]: signedUrl
          }));
        }
      } catch (error) {
        console.error('Error getting signed URL:', error);
      }
    }

    getGallerySignedUrl();
  }, [selectedImageIndex, imageAttachments]);

  // Function to handle attachment deletion
  const handleDeleteAttachment = async (attachmentId: string) => {
    console.log('handleDeleteAttachment called with ID:', attachmentId);
    
    if (!response?.id) {
      console.log('No response ID found, returning early');
      return;
    }

    // Show confirmation dialog using a simpler toast approach
    const confirmed = await new Promise<boolean>((resolveConfirm) => {
      toast.custom(
        (t) => (
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full">
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Delete Attachment</h3>
                <p className="text-gray-600">Are you sure you want to delete this attachment? This action cannot be undone.</p>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    toast.dismiss(t);
                    resolveConfirm(false);
                  }}
                  className="rounded-full border-[#1B4332] text-[#1B4332] hover:bg-gray-100"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    toast.dismiss(t);
                    resolveConfirm(true);
                  }}
                  className="rounded-full bg-red-600 hover:bg-red-700"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ),
        {
          duration: Infinity,
          className: "w-full max-w-md"
        }
      );
    });

    console.log('Confirmation result:', confirmed);

    if (!confirmed) {
      console.log('User cancelled deletion');
      return;
    }

    try {
      console.log('Starting deletion process...');
      const supabase = createClient();
      
      // First delete the file from storage
      const attachment = attachments.find(a => a.id === attachmentId);
      if (attachment?.fileUrl) {
        const filePath = attachment.fileUrl.includes('attachments/') 
          ? attachment.fileUrl.split('attachments/')[1]
          : attachment.fileUrl;
          
        const { error: storageError } = await supabase
          .storage
          .from('attachments')
          .remove([filePath]);
          
        if (storageError) throw storageError;
      }

      // Then delete the database record
      const { error: dbError } = await supabase
        .from('PromptResponseAttachment')
        .delete()
        .eq('id', attachmentId);

      if (dbError) throw dbError;

      // Update local state
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      setGallerySignedUrls(prev => {
        const newUrls = { ...prev };
        delete newUrls[attachmentId];
        return newUrls;
      });
      
      // Close dialog if the deleted attachment was being viewed
      if (selectedImageIndex !== null && imageAttachments[selectedImageIndex]?.id === attachmentId) {
        setSelectedImageIndex(null);
      }

      toast.success('Attachment deleted successfully');
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error('Failed to delete attachment');
    }
  };

  // Function to handle attachment download
  const handleDownloadAttachment = async (attachment: {
    id: string;
    fileUrl: string;
    fileName: string;
    fileType: string;
    description?: string;
    dateCaptured?: string;
    yearCaptured?: number;
  }) => {
    try {
      const signedUrl = await getSignedUrl(attachment.fileUrl);
      if (!signedUrl) {
        throw new Error('Failed to get download URL');
      }

      // Fetch the file as a blob to force download
      const response = await fetch(signedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      window.URL.revokeObjectURL(url);

      toast.success('Download started');
    } catch (error) {
      console.error('Error downloading attachment:', error);
      toast.error('Failed to download attachment');
    }
  };

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
                // Upload the video and get the URL
                const { data, error } = await supabase.storage
                  .from('videos')
                  .upload(`${promptId}/${Date.now()}.webm`, blob);

                if (error) throw error;
                
                // Return the path for further processing
                return data?.path || '';
              } catch (error) {
                console.error('Error saving video:', error);
                toast.error('Failed to save video');
                return '';
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
            onComplete={() => setShowUploadPopup(false)}
            onUploadSuccess={() => setShowUploadPopup(false)}
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
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {response.video.muxPlaybackId && (
              <div suppressHydrationWarning>
                <MuxPlayer playbackId={response.video.muxPlaybackId} />
              </div>
            )}
          </div>

          {/* Date Section */}
          <div className="flex items-center gap-2 py-2">
            <span className="text-sm text-gray-500">Date Recorded:</span>
            {isEditingDate ? (
              <input
                type="date"
                value={dateRecorded ? new Date(dateRecorded).toISOString().split('T')[0] : ''}
                onChange={(e) => setDateRecorded(e.target.value ? new Date(e.target.value) : null)}
                className="px-2 py-1 border rounded text-sm"
                aria-label="Date recorded"
              />
            ) : (
              <span className="text-sm">
                {dateRecorded ? new Date(dateRecorded).toLocaleDateString() : 'Not set'}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                if (isEditingDate) {
                  try {
                    const supabase = createClient();
                    const { error } = await supabase
                      .from('Video')
                      .update({ dateRecorded })
                      .eq('id', response.video?.id);

                    if (error) throw error;
                    toast.success("Date updated successfully");
                    setIsEditingDate(false);
                  } catch (error) {
                    console.error('Error updating date:', error);
                    toast.error("Failed to update date");
                  }
                } else {
                  setIsEditingDate(true);
                }
              }}
              className="rounded-full"
            >
              {isEditingDate ? (
                <Check className="h-4 w-4" />
              ) : (
                <Edit className="h-4 w-4" />
              )}
            </Button>
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
                      if (!transcript) {
                        toast.error("No transcript available", {
                          description: "A transcript is required to clean."
                        });
                        return;
                      }

                      setPreviousTranscript(transcript);
                      setIsCleaningTranscript(true);
                      setCleaningSuccess(false);
                      console.log('Starting AI transcript cleaning...', {
                        transcriptLength: transcript.length,
                        transcriptId: response?.video?.VideoTranscript?.[0]?.id
                      });

                      const cleanedTranscript = await cleanTranscript({
                        transcript,
                      });

                      console.log('AI transcript cleaning completed', {
                        originalLength: transcript.length,
                        cleanedLength: cleanedTranscript.length,
                        transcriptId: response?.video?.VideoTranscript?.[0]?.id
                      });

                      // Update the local state first
                      setTranscript(cleanedTranscript);
                      
                      // Then save to the database
                      if (response?.video?.VideoTranscript?.[0]?.id) {
                        const supabase = createClient();
                        const { error: saveError } = await supabase
                          .from('VideoTranscript')
                          .update({ transcript: cleanedTranscript })
                          .eq('id', response.video.VideoTranscript[0].id);

                        if (saveError) {
                          console.error('Failed to save cleaned transcript:', saveError);
                          throw new Error('Failed to save cleaned transcript');
                        }
                        console.log('Cleaned transcript saved successfully');
                      }
                      
                      setCleaningSuccess(true);
                      toast.success("Transcript cleaned successfully", {
                        description: "The transcript has been cleaned and saved."
                      });
                      
                      // Reset success state after a delay
                      setTimeout(() => {
                        setCleaningSuccess(false);
                      }, 3500);
                    } catch (error) {
                      console.error('Error cleaning transcript:', error);
                      toast.error("Failed to clean transcript", {
                        description: error instanceof Error ? error.message : "Please try again."
                      });
                      // Revert to previous transcript on error
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
                  onClick={() => {
                    if (isEditingTranscript) {
                      handleSaveTranscript();
                    } else {
                      setIsEditingTranscript(true);
                    }
                  }}
                  className="rounded-full"
                >
                  {isEditingTranscript ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Edit className="h-4 w-4 mr-2" />
                  )}
                  {isEditingTranscript ? 'Save' : 'Edit'}
                </Button>
              </div>
            </div>
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              disabled={!isEditingTranscript}
              className="min-h-[100px]"
            />
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
                        transcript: response.video.VideoTranscript[0].transcript
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
                  onClick={() => {
                    if (isEditingSummary) {
                      handleSaveSummary();
                    } else {
                      setIsEditingSummary(true);
                    }
                  }}
                  className="rounded-full"
                >
                  {isEditingSummary ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Edit className="h-4 w-4 mr-2" />
                  )}
                  {isEditingSummary ? 'Save' : 'Edit'}
                </Button>
              </div>
            </div>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              disabled={!isEditingSummary}
              className="min-h-[100px]"
            />
          </div>

          {/* Notes Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Notes</h3>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (isEditingNotes) {
                      handleSaveNotes();
                    } else {
                      setIsEditingNotes(true);
                    }
                  }}
                  className="rounded-full"
                >
                  {isEditingNotes ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Edit className="h-4 w-4 mr-2" />
                  )}
                  {isEditingNotes ? 'Save' : 'Edit'}
                </Button>
              </div>
            </div>
            <Textarea
              value={responseNotes}
              onChange={(e) => setResponseNotes(e.target.value)}
              disabled={!isEditingNotes}
              className="min-h-[100px]"
              placeholder="Add notes about this response..."
            />
          </div>
        </div>

        {/* Attachments Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Attachments</h3>
            <Button
              onClick={() => setShowAttachmentUpload(true)}
              variant="outline"
              className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full"
            >
              <Paperclip className="mr-2 h-4 w-4" />
              Add Attachment
            </Button>
          </div>
          
          {attachments && attachments.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {attachments.map((attachment, index) => (
                <div
                  key={attachment.id}
                  className="group cursor-pointer aspect-[4/3] relative rounded-lg overflow-hidden bg-gray-100"
                >
                  <div 
                    className="absolute inset-0"
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <AttachmentThumbnail 
                      attachment={attachment}
                      size="lg"
                      className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                    />
                  </div>
                  {/* Action buttons */}
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-white/80 hover:bg-white"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDownloadAttachment(attachment);
                      }}
                    >
                      <Download className="h-4 w-4" />
                      <span className="sr-only">Download attachment</span>
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-white/80 hover:bg-white hover:text-red-600"
                      onClick={(e) => {
                        console.log('Delete button clicked for attachment:', attachment.id);
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteAttachment(attachment.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete attachment</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No attachments yet</p>
          )}
        </div>
      </div>

      {/* Image Gallery Dialog */}
      <AttachmentDialog
        attachment={selectedImageIndex !== null ? {
          ...imageAttachments[selectedImageIndex],
          displayUrl: gallerySignedUrls[imageAttachments[selectedImageIndex]?.id]
        } : null}
        isOpen={selectedImageIndex !== null}
        onClose={() => setSelectedImageIndex(null)}
        onNext={() => selectedImageIndex !== null && selectedImageIndex < imageAttachments.length - 1 && setSelectedImageIndex(selectedImageIndex + 1)}
        onPrevious={() => selectedImageIndex !== null && selectedImageIndex > 0 && setSelectedImageIndex(selectedImageIndex - 1)}
        hasNext={selectedImageIndex !== null && selectedImageIndex < imageAttachments.length - 1}
        hasPrevious={selectedImageIndex !== null && selectedImageIndex > 0}
        signedUrl={selectedImageIndex !== null ? gallerySignedUrls[imageAttachments[selectedImageIndex].id] : undefined}
        onSave={async () => {
          router.refresh();
        }}
        onDelete={async (attachmentId: string) => {
          await handleDeleteAttachment(attachmentId);
          setSelectedImageIndex(null);
        }}
        onDownload={async (attachment: {
          id: string;
          fileUrl: string;
          fileName: string;
          fileType: string;
          description?: string;
          dateCaptured?: string;
          yearCaptured?: number;
        }) => {
          await handleDownloadAttachment(attachment);
        }}
      />

      {showAttachmentUpload && (
        <AttachmentUpload
          promptResponseId={response.id}
          isOpen={showAttachmentUpload}
          onClose={() => setShowAttachmentUpload(false)}
          onUploadSuccess={async () => {
            setShowAttachmentUpload(false);
            await fetchUpdatedResponse();
          }}
        />
      )}
    </div>
  );
} 