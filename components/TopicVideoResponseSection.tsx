'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Video as VideoIcon, Upload, Paperclip, Edit, Check, ArrowLeft, Download, Trash2, AlertTriangle, Pencil, Wand2, Loader2, ChevronDown, ChevronUp, X } from 'lucide-react';
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

interface TopicVideoResponseSectionProps {
  topicId: string;
  topicName: string;
  userId: string | null;
  video?: {
    id: string;
    muxPlaybackId: string;
    muxAssetId: string;
    dateRecorded?: string | null;
    TopicVideoTranscript?: Array<{
      id: string;
      transcript: string;
    }>;
    summary?: string;
  };
  attachments?: UIAttachment[];
  onVideoUpload?: () => Promise<void>;
}

export function TopicVideoResponseSection({ 
  topicId, 
  topicName,
  userId,
  video,
  attachments: initialAttachments = [],
  onVideoUpload
}: TopicVideoResponseSectionProps) {
  const router = useRouter();
  const [showRecordingInterface, setShowRecordingInterface] = useState(false);
  const [showUploadPopup, setShowUploadPopup] = useState(false);
  const [showAttachmentUpload, setShowAttachmentUpload] = useState(false);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [transcript, setTranscript] = useState(video?.TopicVideoTranscript?.[0]?.transcript || '');
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [attachments, setAttachments] = useState<UIAttachment[]>(initialAttachments);
  const [imageAttachments, setImageAttachments] = useState<UIAttachment[]>([]);
  const [isCleaningTranscript, setIsCleaningTranscript] = useState(false);
  const [previousTranscript, setPreviousTranscript] = useState('');
  const [cleaningSuccess, setCleaningSuccess] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [dateRecorded, setDateRecorded] = useState<string | null>(video?.dateRecorded || null);
  const [showVideoDeleteConfirm, setShowVideoDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [summary, setSummary] = useState(video?.summary || '');
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [previousSummary, setPreviousSummary] = useState('');
  const [summarySuccess, setSummarySuccess] = useState(false);
  const transcriptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const summaryTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const transcriptContentRef = useRef<HTMLDivElement>(null);
  const summaryContentRef = useRef<HTMLDivElement>(null);
  const [transcriptOverflows, setTranscriptOverflows] = useState(false);
  const [summaryOverflows, setSummaryOverflows] = useState(false);
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const [notesOverflows, setNotesOverflows] = useState(false);
  const notesContentRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Update attachments when initialAttachments change
  useEffect(() => {
    setAttachments(initialAttachments);
  }, [initialAttachments]);

  // Update image attachments when main attachments change
  useEffect(() => {
    const filtered = attachments.filter((a: UIAttachment) => 
      a.fileType.startsWith('image/') || a.fileType === 'application/pdf'
    );
    setImageAttachments(filtered);
  }, [attachments]);

  // Update summary when video changes
  useEffect(() => {
    setSummary(video?.summary || '');
  }, [video?.summary]);

  // Function to get storage path from full URL
  const getStoragePath = (url: string) => {
    if (!url) return '';
    if (!url.includes('attachments/')) return url;
    return decodeURIComponent(url.split('attachments/')[1]);
  };

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

  // Auto-resize function
  const autoResize = (textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return;
    textarea.style.height = 'inherit';
    textarea.style.height = `${Math.max(textarea.scrollHeight, 100)}px`;
  };

  // Auto-resize effect for transcript
  useEffect(() => {
    if (isEditingTranscript) {
      autoResize(transcriptTextareaRef.current);
    }
  }, [transcript, isEditingTranscript]);

  // Auto-resize effect for summary
  useEffect(() => {
    if (isEditingSummary) {
      autoResize(summaryTextareaRef.current);
    }
  }, [summary, isEditingSummary]);

  // Check for overflow
  useEffect(() => {
    const checkOverflow = () => {
      if (transcriptContentRef.current) {
        const lineHeight = parseInt(window.getComputedStyle(transcriptContentRef.current).lineHeight);
        const maxHeight = lineHeight * 12; // Height for 12 lines
        const scrollHeight = transcriptContentRef.current.scrollHeight;
        console.log('Transcript heights:', {
          scrollHeight,
          maxHeight,
          lineHeight,
          hasOverflow: scrollHeight > maxHeight
        });
        setTranscriptOverflows(scrollHeight > maxHeight);
      }
      if (summaryContentRef.current) {
        const lineHeight = parseInt(window.getComputedStyle(summaryContentRef.current).lineHeight);
        const maxHeight = lineHeight * 12; // Height for 12 lines
        const scrollHeight = summaryContentRef.current.scrollHeight;
        console.log('Summary heights:', {
          scrollHeight,
          maxHeight,
          lineHeight,
          hasOverflow: scrollHeight > maxHeight
        });
        setSummaryOverflows(scrollHeight > maxHeight);
      }
      if (notesContentRef.current) {
        const lineHeight = parseInt(window.getComputedStyle(notesContentRef.current).lineHeight);
        const maxHeight = lineHeight * 12; // Height for 12 lines
        const scrollHeight = notesContentRef.current.scrollHeight;
        console.log('Notes heights:', {
          scrollHeight,
          maxHeight,
          lineHeight,
          hasOverflow: scrollHeight > maxHeight
        });
        setNotesOverflows(scrollHeight > maxHeight);
      }
    };

    // Initial check
    checkOverflow();

    // Add resize listener to handle window size changes
    window.addEventListener('resize', checkOverflow);
    
    // Also check after a small delay to ensure content has rendered
    const timeoutId = setTimeout(checkOverflow, 100);

    return () => {
      window.removeEventListener('resize', checkOverflow);
      clearTimeout(timeoutId);
    };
  }, [transcript, summary, isTranscriptExpanded, isSummaryExpanded, isNotesExpanded]);

  // Update the max-height class to use the exact 12-line height
  const getContentStyle = (isExpanded: boolean) => ({
    maxHeight: isExpanded ? 'none' : '16em', // 16em is approximately 12 lines
    overflow: isExpanded ? 'visible' : 'hidden'
  });

  const handleSaveTranscript = async () => {
    if (!video?.id || !video?.TopicVideoTranscript?.[0]?.id) {
      toast.error("No transcript ID found");
      return;
    }

    const supabase = createClient();
    
    try {
      console.log('Saving transcript:', {
        transcriptId: video.TopicVideoTranscript[0].id,
        transcriptLength: transcript.length
      });

      const { data, error } = await supabase
        .from('TopicVideoTranscript')
        .update({ transcript })
        .eq('id', video.TopicVideoTranscript[0].id)
        .select()
        .single();

      if (error) {
        console.error('Error updating transcript:', error);
        toast.error("Failed to update transcript");
        return;
      }

      console.log('Transcript saved successfully:', data);
      setIsEditingTranscript(false);
      toast.success("Transcript updated successfully");
      
      // Check for overflow after a short delay to ensure content is rendered
      setTimeout(() => {
        if (transcriptContentRef.current) {
          const lineHeight = parseInt(window.getComputedStyle(transcriptContentRef.current).lineHeight);
          const maxHeight = lineHeight * 12;
          const scrollHeight = transcriptContentRef.current.scrollHeight;
          setTranscriptOverflows(scrollHeight > maxHeight);
        }
      }, 100);

      router.refresh();
    } catch (e) {
      console.error('Error in handleSaveTranscript:', e);
      toast.error("An unexpected error occurred");
    }
  };

  const handleSaveDate = async () => {
    if (!video?.id) return;

    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('TopicVideo')
        .update({ dateRecorded })
        .eq('id', video.id);

      if (error) throw error;
      setIsEditingDate(false);
      toast.success("Date updated successfully");
      await router.refresh();
    } catch (e) {
      console.error('Error updating date:', e);
      toast.error("Failed to update date");
    }
  };

  const handleDeleteVideo = async () => {
    if (!video?.id) return;

    try {
      setIsDeleting(true);
      const supabase = createClient();

      // First delete the video from Mux if there's a Mux asset ID
      if (video.muxAssetId) {
        const res = await fetch('/api/mux/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            muxAssetId: video.muxAssetId,
          }),
        });

        if (!res.ok) {
          throw new Error('Failed to delete video from Mux');
        }
      }

      // Delete the video record from the database
      const { error: videoError } = await supabase
        .from('TopicVideo')
        .delete()
        .eq('id', video.id);

      if (videoError) throw videoError;

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

  const handleGenerateSummary = async () => {
    if (!video?.id || !transcript) {
      toast.error("No transcript available", {
        description: "A transcript is required to generate a summary."
      });
      return;
    }

    try {
      setIsGeneratingSummary(true);
      setSummarySuccess(false);
      setPreviousSummary(summary);
      
      const generatedSummary = await generateAISummary({
        promptText: topicName,
        promptCategory: "Topic Video",
        firstName: "the speaker", // Generic for topic videos
        transcript,
        type: 'topic',
        videoId: video.id
      });

      setSummary(generatedSummary);
      setSummarySuccess(true);
      toast.success("AI Summary generated successfully", {
        description: "The summary has been generated and saved."
      });

      // Reset success state after a delay
      setTimeout(() => {
        setSummarySuccess(false);
      }, 3500);
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error("Failed to generate summary", {
        description: error instanceof Error ? error.message : "Please try again."
      });
      // Revert to previous summary on error
      if (previousSummary) {
        setSummary(previousSummary);
      }
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleSaveSummary = async () => {
    if (!video?.id) {
      toast.error("No video ID found");
      return;
    }

    const supabase = createClient();
    try {
      console.log('Saving summary:', {
        videoId: video.id,
        summaryLength: summary.length
      });

      const { data, error } = await supabase
        .from('TopicVideo')
        .update({ summary })
        .eq('id', video.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating summary:', error);
        toast.error("Failed to update summary");
        return;
      }

      console.log('Summary saved successfully:', data);
      setIsEditingSummary(false);
      toast.success("Summary updated successfully");
      
      // Check for overflow after a short delay to ensure content is rendered
      setTimeout(() => {
        if (summaryContentRef.current) {
          const lineHeight = parseInt(window.getComputedStyle(summaryContentRef.current).lineHeight);
          const maxHeight = lineHeight * 12;
          const scrollHeight = summaryContentRef.current.scrollHeight;
          setSummaryOverflows(scrollHeight > maxHeight);
        }
      }, 100);

      router.refresh();
    } catch (e) {
      console.error('Error in handleSaveSummary:', e);
      toast.error("An unexpected error occurred");
    }
  };

  const handleDownloadVideo = async (quality: 'high' | 'low') => {
    if (!video?.muxAssetId) {
      toast.error('No video asset found');
      return;
    }

    try {
      setIsDownloading(true);
      
      const res = await fetch('/api/mux/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          muxAssetId: video.muxAssetId,
          quality
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        if (res.status === 429) {
          toast.error('Daily download limit reached', {
            description: 'Please try again tomorrow'
          });
        } else {
          throw new Error(error.error || 'Failed to get download URL');
        }
        return;
      }

      const { url } = await res.json();
      
      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `${topicName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${quality}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Download started');
    } catch (error) {
      console.error('Error downloading video:', error);
      toast.error('Failed to download video');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!video && !userId) {
    return <div>Unable to load video section</div>;
  }

  if (!video) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center gap-6 bg-gray-50">
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-500">Create a summary video for this topic</p>
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
            promptId={topicId}
            onClose={() => setShowRecordingInterface(false)}
            onSave={async (blob: Blob): Promise<string> => {
              try {
                const supabase = createClient();

                // Create a video record for the topic
                const { data: videoData, error: videoError } = await supabase
                  .from('TopicVideo')
                  .insert({
                    promptCategoryId: topicId,
                    profileSharerId: userId,
                    status: 'UPLOADING'
                  })
                  .select()
                  .single();

                if (videoError) throw videoError;
                if (!videoData?.id) throw new Error('No video ID returned');

                // Upload the video with the video ID in the path
                const { data: uploadData, error: uploadError } = await supabase.storage
                  .from('videos')
                  .upload(`topics/${topicId}/${videoData.id}.webm`, blob);

                if (uploadError) {
                  // If upload fails, delete the video record
                  await supabase
                    .from('TopicVideo')
                    .delete()
                    .eq('id', videoData.id);
                  throw uploadError;
                }

                if (!uploadData?.path) throw new Error('No upload path returned');

                // Update the video record with the storage path
                const { error: updateError } = await supabase
                  .from('TopicVideo')
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
                throw error;
              }
            }}
          />
        )}

        {showUploadPopup && (
          <UploadPopup
            open={showUploadPopup}
            onClose={() => setShowUploadPopup(false)}
            promptId={topicId}
            onUploadSuccess={async (playbackId) => {
              if (onVideoUpload) {
                await onVideoUpload();
              }
              setShowUploadPopup(false);
            }}
            targetSharerId={userId as string}
          />
        )}
      </Card>
    );
  }

  return (
    <div className="container mx-auto px-3 my-3 max-w-5xl space-y-8">
      <Card className="p-4 md:p-8 border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55] transition-all duration-300">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-black">{topicName}</h2>
            <div className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
              Topic Summary
            </div>
          </div>

          {video?.muxPlaybackId && (
            <div className="rounded-lg overflow-hidden aspect-video bg-transparent">
              <MuxPlayer playbackId={video.muxPlaybackId} />
            </div>
          )}

          {/* Date and Download Section */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Date Recorded:</span>
              {isEditingDate ? (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateRecorded || ''}
                    onChange={(e) => setDateRecorded(e.target.value || null)}
                    className="px-2 py-1 border rounded text-sm"
                    aria-label="Date recorded"
                  />
                  <Button variant="ghost" size="icon" onClick={handleSaveDate} className="h-8 w-8 rounded-full">
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setIsEditingDate(false)} className="h-8 w-8 rounded-full">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                   <span className="text-sm text-gray-900">
                    {dateRecorded ? new Date(dateRecorded).toLocaleDateString() : 'Not set'}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => setIsEditingDate(true)} className="h-8 w-8 rounded-full">
                    <Pencil className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                    <span className="sr-only">Edit Date</span>
                  </Button>
                </div>
              )}
            </div>
            {video?.muxAssetId && (
              <VideoDownloadButton
                muxAssetId={video.muxAssetId}
                videoType="topic"
                userId={userId}
                promptCategoryName={topicName}
              />
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">All Topic Attachments</h3>
            </div>
            {attachments.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {attachments.map((attachment) => {
                  const thumbnailAttachment = toThumbnailAttachment({
                    ...attachment,
                    dateCaptured: attachment.dateCaptured ? (attachment.dateCaptured instanceof Date ? attachment.dateCaptured : new Date(attachment.dateCaptured)) : null
                  });
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
                      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8 rounded-full bg-white/80 hover:bg-white"
                          onClick={async (e) => {
                            e.stopPropagation();
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
                            e.stopPropagation();
                            const supabase = createClient();
                            try {
                              const filePath = attachment.fileUrl.includes('attachments/') 
                                ? attachment.fileUrl.split('attachments/')[1]
                                : attachment.fileUrl;
                              
                              const { error: storageError } = await supabase.storage
                                .from('attachments')
                                .remove([filePath]);

                              if (storageError) throw storageError;

                              const { error: dbError } = await supabase
                                .from('PromptResponseAttachment')
                                .delete()
                                .eq('id', attachment.id);

                              if (dbError) throw dbError;

                              setAttachments(prev => prev.filter(a => a.id !== attachment.id));
                              toast.success('Attachment deleted successfully');
                            } catch (error) {
                              console.error('Error deleting attachment:', error);
                              toast.error('Failed to delete attachment');
                            }
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
            ) : (
               <p className="text-sm text-gray-500">No attachments added for this topic yet.</p> 
            )}
          </div>
          
          <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">Transcript</h3>
                  <Button
                    variant="ghost"
                    size="icon" 
                    onClick={() => {
                      if (isEditingTranscript) {
                        handleSaveTranscript();
                      } else {
                        setIsEditingTranscript(true);
                      }
                    }}
                    className="h-8 w-8 rounded-full" 
                  >
                    {isEditingTranscript ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Pencil className="h-4 w-4" />
                    )}
                    <span className="sr-only">{isEditingTranscript ? 'Save Transcript' : 'Edit Transcript'}</span>
                  </Button>
                  {isEditingTranscript && (
                    <Button variant="ghost" size="icon" onClick={() => setIsEditingTranscript(false)} className="h-8 w-8 rounded-full">
                      <X className="h-4 w-4" />
                      <span className="sr-only">Cancel Edit Transcript</span>
                    </Button>
                  )}
                </div>
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

                        if (!video?.TopicVideoTranscript?.[0]?.id) {
                          toast.error("No transcript ID found", {
                            description: "The transcript must be saved before cleaning."
                          });
                          return;
                        }

                        setPreviousTranscript(transcript);
                        setIsCleaningTranscript(true);
                        setCleaningSuccess(false);

                        const cleanedTranscript = await cleanTranscript({
                          transcript,
                          transcriptId: video.TopicVideoTranscript[0].id,
                          type: 'topic'
                        });

                        // Update the local state
                        setTranscript(cleanedTranscript);
                        setCleaningSuccess(true);
                        toast.success("Transcript cleaned successfully");
                        
                        // Reset success state after a delay
                        setTimeout(() => {
                          setCleaningSuccess(false);
                        }, 3500);
                      } catch (error) {
                        console.error('Error cleaning transcript:', error);
                        toast.error("Failed to clean transcript");
                        // Revert to previous transcript on error
                        if (previousTranscript) {
                          setTranscript(previousTranscript);
                        }
                      } finally {
                        setIsCleaningTranscript(false);
                      }
                    }}
                    className="hover:bg-[#8fbc55] rounded-full"
                    disabled={isCleaningTranscript}
                  >
                    {isCleaningTranscript ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
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
                  className="min-h-[100px] w-full resize-none transition-height duration-150 whitespace-pre-wrap bg-white focus-visible:ring-0 border-0 focus-visible:ring-offset-0 text-base overflow-hidden"
                />
              ) : (
                <div className="space-y-2">
                  <div
                    ref={transcriptContentRef}
                    className={`relative bg-white rounded-lg whitespace-pre-wrap transition-all duration-200 text-base ${
                      isTranscriptExpanded ? "max-h-none overflow-visible" : "max-h-64 overflow-hidden"
                    } ${
                      !isTranscriptExpanded && transcriptOverflows ? "pb-20" : "" // Add padding for gradient
                    }`}
                  >
                    {transcript || 'No transcript available'}
                    {!isTranscriptExpanded && transcriptOverflows && (
                      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent" />
                    )}
                  </div>
                  {(transcriptOverflows || isTranscriptExpanded) && (
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">Summary</h3>
                  <Button
                    variant="ghost"
                    size="icon" 
                    onClick={() => {
                      if (isEditingSummary) {
                        handleSaveSummary();
                      } else {
                        setIsEditingSummary(true);
                      }
                    }}
                    className="h-8 w-8 rounded-full" 
                  >
                    {isEditingSummary ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Pencil className="h-4 w-4" />
                    )}
                     <span className="sr-only">{isEditingSummary ? 'Save Summary' : 'Edit Summary'}</span>
                  </Button>
                  {isEditingSummary && (
                    <Button variant="ghost" size="icon" onClick={() => setIsEditingSummary(false)} className="h-8 w-8 rounded-full">
                      <X className="h-4 w-4" />
                       <span className="sr-only">Cancel Edit Summary</span>
                    </Button>
                  )}
                </div>
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
                    onClick={handleGenerateSummary}
                    className="hover:bg-[#8fbc55] rounded-full"
                    disabled={isGeneratingSummary}
                  >
                    {isGeneratingSummary ? (
                      <>
                         <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
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
                  className="min-h-[100px] w-full resize-none transition-height duration-150 whitespace-pre-wrap bg-white focus-visible:ring-0 border-0 focus-visible:ring-offset-0 text-base overflow-hidden"
                  placeholder="Enter a summary..."
                />
              ) : (
                <div className="space-y-2">
                  <div
                    ref={summaryContentRef}
                    className={`relative bg-white rounded-lg whitespace-pre-wrap transition-all duration-200 text-base ${
                      isSummaryExpanded ? "max-h-none overflow-visible" : "max-h-64 overflow-hidden"
                    } ${
                      !isSummaryExpanded && summaryOverflows ? "pb-20" : "" // Add padding for gradient
                    }`}
                  >
                    {summary || 'No summary available'}
                    {!isSummaryExpanded && summaryOverflows && (
                      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent" />
                    )}
                  </div>
                  {(summaryOverflows || isSummaryExpanded) && (
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
          </div>
      </Card>

      <AttachmentDialog
        attachment={selectedImageIndex !== null && imageAttachments[selectedImageIndex] ? {
          id: imageAttachments[selectedImageIndex].id,
          fileUrl: imageAttachments[selectedImageIndex].fileUrl,
          fileName: imageAttachments[selectedImageIndex].fileName,
          fileType: imageAttachments[selectedImageIndex].fileType,
          description: imageAttachments[selectedImageIndex].description,
          dateCaptured: imageAttachments[selectedImageIndex].dateCaptured ? 
            (imageAttachments[selectedImageIndex].dateCaptured instanceof Date ? 
              imageAttachments[selectedImageIndex].dateCaptured : 
              new Date(imageAttachments[selectedImageIndex].dateCaptured as string)) : null,
          yearCaptured: imageAttachments[selectedImageIndex].yearCaptured,
          displayUrl: imageAttachments[selectedImageIndex].signedUrl || '',
          PersonTags: imageAttachments[selectedImageIndex].PersonTags || [],
          title: imageAttachments[selectedImageIndex].fileName
        } : null}
        isOpen={selectedImageIndex !== null}
        onClose={() => setSelectedImageIndex(null)}
        onNext={() => {
          if (selectedImageIndex !== null && selectedImageIndex < imageAttachments.length - 1) {
            setSelectedImageIndex(selectedImageIndex + 1);
          }
        }}
        onPrevious={() => {
          if (selectedImageIndex !== null && selectedImageIndex > 0) {
            setSelectedImageIndex(selectedImageIndex - 1);
          }
        }}
        hasNext={selectedImageIndex !== null && selectedImageIndex < imageAttachments.length - 1}
        hasPrevious={selectedImageIndex !== null && selectedImageIndex > 0}
        onSave={async () => {
          await router.refresh();
          return Promise.resolve();
        }}
        onDelete={async (attachmentId) => {
          const supabase = createClient();
          try {
            const attachment = imageAttachments.find(a => a.id === attachmentId);
            if (!attachment) throw new Error('Attachment not found');

            // Delete from storage
            const filePath = attachment.fileUrl.includes('attachments/') 
              ? attachment.fileUrl.split('attachments/')[1]
              : attachment.fileUrl;
            
            const { error: storageError } = await supabase.storage
              .from('attachments')
              .remove([filePath]);

            if (storageError) throw storageError;

            // Delete from database
            const { error: dbError } = await supabase
              .from('PromptResponseAttachment')
              .delete()
              .eq('id', attachmentId);

            if (dbError) throw dbError;

            // Update local state
            setAttachments(prev => prev.filter(a => a.id !== attachmentId));
            setSelectedImageIndex(null);
            toast.success('Attachment deleted successfully');
          } catch (error) {
            console.error('Error deleting attachment:', error);
            toast.error('Failed to delete attachment');
          }
        }}
        onDownload={async (attachment) => {
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
        }}
      />

      <Dialog open={showVideoDeleteConfirm} onOpenChange={setShowVideoDeleteConfirm}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Topic Video</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this topic video? This action cannot be undone and will remove the video and transcript.
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
    </div>
  );
} 