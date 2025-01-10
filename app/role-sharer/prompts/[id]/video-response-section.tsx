'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Video as VideoIcon, Play, Upload, Paperclip, Edit, Check, ImageOff, ChevronLeft, ChevronRight, X, FileText, ArrowLeft } from 'lucide-react';
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

// Dynamically import components that could cause hydration issues
const MuxPlayer = dynamic(
  () => import('@/components/MuxPlayer').then(mod => mod.MuxPlayer),
  { ssr: false }
);

const AttachmentUpload = dynamic(
  () => import('@/components/AttachmentUpload').then(mod => mod.default),
  { ssr: false }
);

interface VideoResponseSectionProps {
  promptId: string;
  promptCategoryId?: string;
  promptText?: string;
  promptCategory?: string;
  response?: {
    id: string;
    summary?: string | null;
    video?: {
      id: string;
      muxPlaybackId: string;
      VideoTranscript?: {
        id: string;
        transcript: string;
      }[];
    } | null;
    PromptResponseAttachment?: {
      id: string;
      fileUrl: string;
      fileType: string;
      fileName: string;
      description?: string;
      dateCaptured?: string;
      yearCaptured?: number;
    }[];
  } | null;
}

function AttachmentPreview({ attachment }: { 
  attachment: {
    id: string;
    fileUrl: string;
    fileType: string;
    fileName: string;
    description?: string;
  }
}) {
  const [imageError, setImageError] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function getSignedUrl() {
      if (!attachment.fileName) return;

      try {
        setIsLoading(true);
        const supabase = createClient();
        const { data } = await supabase
          .storage
          .from('attachments')
          .createSignedUrl(attachment.fileName, 3600);

        if (data?.signedUrl && isMounted) {
          setSignedUrl(data.signedUrl);
          setImageError(false);
        }
      } catch (error) {
        console.error('Error getting signed URL:', error);
        if (isMounted) {
          setImageError(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    getSignedUrl();
    return () => {
      isMounted = false;
    };
  }, [attachment.fileName]);

  if (attachment.fileType.startsWith('image/')) {
    if (isLoading) {
      return (
        <div className="relative aspect-square w-full bg-gray-100 rounded-xl animate-pulse" />
      );
    }

    if (imageError) {
      return (
        <div className="relative aspect-square w-full bg-gray-100 rounded-xl flex items-center justify-center">
          <ImageOff className="h-6 w-6 text-gray-400" />
        </div>
      );
    }

    return (
      <div className="relative aspect-square w-full">
        <img
          src={signedUrl || attachment.fileUrl}
          alt={attachment.description || 'Attachment'}
          className="w-full h-full object-cover rounded-xl"
          onError={() => {
            setImageError(true);
            setIsLoading(false);
          }}
          onLoad={() => setIsLoading(false)}
        />
      </div>
    );
  }

  return (
    <div className="relative aspect-square w-full bg-gray-100 rounded-xl flex items-center justify-center">
      <span className="text-sm text-gray-500 break-all px-4 text-center">{attachment.fileName}</span>
    </div>
  );
}

export function VideoResponseSection({ promptId, promptCategoryId, promptText, promptCategory, response }: VideoResponseSectionProps) {
  const router = useRouter();
  const [showRecordingInterface, setShowRecordingInterface] = useState(false);
  const [showUploadPopup, setShowUploadPopup] = useState(false);
  const [showAttachmentUpload, setShowAttachmentUpload] = useState(false);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [transcript, setTranscript] = useState(response?.video?.VideoTranscript?.[0]?.transcript || '');
  const [summary, setSummary] = useState(response?.summary || '');
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const imageAttachments = response?.PromptResponseAttachment?.filter(
    attachment => attachment.fileType.startsWith('image/')
  ) || [];
  const [gallerySignedUrls, setGallerySignedUrls] = useState<{ [key: string]: string }>({});
  const [isCleaningTranscript, setIsCleaningTranscript] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [previousTranscript, setPreviousTranscript] = useState('');
  const [previousSummary, setPreviousSummary] = useState('');

  const handleSaveTranscript = async () => {
    if (!response?.video?.VideoTranscript?.[0]?.id) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('VideoTranscript')
      .update({ transcript })
      .eq('id', response.video.VideoTranscript[0].id);

    if (error) {
      console.error('Error updating transcript:', error);
      toast.error("Failed to update transcript");
      return;
    }

    setIsEditingTranscript(false);
    toast.success("Transcript updated successfully");
  };

  const handleSaveSummary = async () => {
    if (!response?.id) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('PromptResponse')
      .update({ summary })
      .eq('id', response.id);

    if (error) {
      console.error('Error updating summary:', error);
      toast.error("Failed to update summary");
      return;
    }

    setIsEditingSummary(false);
    toast.success("Summary updated successfully");
  };

  const generateAISummaryHandler = async () => {
    if (!response?.video?.VideoTranscript?.[0]?.transcript) {
      toast.error("No transcript available", {
        description: "A transcript is required to generate an AI summary."
      });
      return;
    }

    try {
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

      const aiSummary = await generateAISummary({
        promptText,
        promptCategory,
        firstName: profile.firstName,
        transcript: response.video.VideoTranscript[0].transcript
      });

      // Update the local state
      setSummary(aiSummary);

      // Save to database
      const { error: saveError } = await supabase
        .from('PromptResponse')
        .update({ summary: aiSummary })
        .eq('id', response.id);

      if (saveError) throw saveError;

      toast.success("AI Summary generated successfully");
    } catch (error) {
      console.error('Error generating AI summary:', error);
      toast.error("Failed to generate AI summary", {
        description: error instanceof Error ? error.message : "Please try again."
      });
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

  useEffect(() => {
    if (selectedImageIndex === null || !imageAttachments || imageAttachments.length === 0) return;
    const index = selectedImageIndex; // Create a non-null copy

    async function getGallerySignedUrl() {
      if (index >= imageAttachments.length) return;
      
      const attachment = imageAttachments[index];
      if (!attachment?.fileName) return;

      try {
        const supabase = createClient();
        const { data } = await supabase
          .storage
          .from('attachments')
          .createSignedUrl(attachment.fileName, 3600);

        if (data?.signedUrl) {
          setGallerySignedUrls(prev => ({
            ...prev,
            [attachment.id]: data.signedUrl
          }));
        }
      } catch (error) {
        console.error('Error getting signed URL:', error);
      }
    }

    getGallerySignedUrl();
  }, [selectedImageIndex, imageAttachments]);

  if (!response?.video) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center gap-6 bg-gray-50">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Record Your Response</h3>
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
        <div className="lg:col-span-2 space-y-8">
          {/* Video Player */}
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {response.video.muxPlaybackId && (
              <div suppressHydrationWarning>
                <MuxPlayer playbackId={response.video.muxPlaybackId} />
              </div>
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
                      if (!transcript) {
                        toast.error("No transcript available", {
                          description: "A transcript is required to clean."
                        });
                        return;
                      }

                      setPreviousTranscript(transcript);
                      setIsCleaningTranscript(true);
                      const cleanedTranscript = await cleanTranscript({
                        transcript,
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
                          throw new Error('Failed to save cleaned transcript');
                        }
                      }
                      
                      toast.success("Transcript cleaned successfully");
                    } catch (error) {
                      console.error('Error cleaning transcript:', error);
                      toast.error("Failed to clean transcript", {
                        description: error instanceof Error ? error.message : "Please try again."
                      });
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
                      Cleaning...
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

                      const aiSummary = await generateAISummary({
                        promptText,
                        promptCategory,
                        firstName: profile.firstName,
                        transcript: response.video.VideoTranscript[0].transcript
                      });

                      // Update the local state
                      setSummary(aiSummary);

                      // Save to database
                      const { error: saveError } = await supabase
                        .from('PromptResponse')
                        .update({ summary: aiSummary })
                        .eq('id', response.id);

                      if (saveError) throw saveError;

                      toast.success("AI Summary generated successfully");
                    } catch (error) {
                      console.error('Error generating AI summary:', error);
                      toast.error("Failed to generate AI summary", {
                        description: error instanceof Error ? error.message : "Please try again."
                      });
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
                      Generating...
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
          
          {response?.PromptResponseAttachment && response.PromptResponseAttachment.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
              {response.PromptResponseAttachment.map((attachment, index) => (
                <div
                  key={attachment.id}
                  className="block hover:opacity-80 transition-opacity cursor-pointer"
                  onClick={() => {
                    if (attachment.fileType.startsWith('image/')) {
                      setSelectedImageIndex(imageAttachments.findIndex(img => img.id === attachment.id));
                    } else {
                      window.open(attachment.fileUrl, '_blank');
                    }
                  }}
                >
                  <AttachmentPreview attachment={attachment} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No attachments yet</p>
          )}
        </div>
      </div>

      {/* Image Gallery Dialog */}
      <Dialog 
        open={selectedImageIndex !== null} 
        onOpenChange={() => setSelectedImageIndex(null)}
      >
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-6 m-4 overflow-y-auto gallery-dialog">
          <DialogTitle className="sr-only">
            {selectedImageIndex !== null ? `Viewing ${imageAttachments[selectedImageIndex].fileName}` : 'File Preview'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {selectedImageIndex !== null ? `Image ${selectedImageIndex + 1} of ${imageAttachments.length}` : 'Image gallery'}
          </DialogDescription>

          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedImageIndex(null)}
              className="h-10 w-10 rounded-full bg-white hover:bg-gray-100 text-gray-700"
            >
              <VisuallyHidden>Close gallery</VisuallyHidden>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <style jsx global>{`
            .gallery-dialog [data-state] {
              display: none !important;
            }
          `}</style>

          <div className="flex-1 flex flex-col min-h-0 mt-8">
            <div className="relative flex-1 flex items-center justify-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevious}
                disabled={selectedImageIndex === null || selectedImageIndex <= 0}
                className="absolute left-4 z-10 h-10 w-10 rounded-full bg-white hover:bg-gray-100 text-gray-700 disabled:opacity-50 disabled:bg-gray-100"
              >
                <VisuallyHidden>Previous image</VisuallyHidden>
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {selectedImageIndex !== null && imageAttachments[selectedImageIndex] && (
                <div className="w-full h-full flex flex-col">
                  <div className="flex-1 flex items-center justify-center max-h-[70vh]">
                    {imageAttachments[selectedImageIndex]?.fileType?.startsWith('image/') ? (
                      <img
                        src={gallerySignedUrls[imageAttachments[selectedImageIndex]?.id] || imageAttachments[selectedImageIndex]?.fileUrl}
                        alt={imageAttachments[selectedImageIndex]?.description || `Image ${selectedImageIndex + 1} of ${imageAttachments.length}`}
                        className="max-h-full w-auto object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <FileText className="h-16 w-16 mb-4" />
                        <span>Preview not available</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-white rounded-b-lg overflow-y-auto border-t">
                    <p className="text-sm opacity-75">
                      Image {selectedImageIndex + 1} of {imageAttachments.length}
                    </p>
                    {imageAttachments[selectedImageIndex].description && (
                      <p className="mt-2 text-sm text-gray-600">
                        {imageAttachments[selectedImageIndex].description}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                disabled={selectedImageIndex === null || selectedImageIndex >= imageAttachments.length - 1}
                className="absolute right-4 z-10 h-10 w-10 rounded-full bg-white hover:bg-gray-100 text-gray-700 disabled:opacity-50 disabled:bg-gray-100"
              >
                <VisuallyHidden>Next image</VisuallyHidden>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showAttachmentUpload && response.id && (
        <AttachmentUpload
          promptResponseId={response.id}
          isOpen={showAttachmentUpload}
          onClose={() => setShowAttachmentUpload(false)}
          onUploadSuccess={() => {
            setShowAttachmentUpload(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
} 