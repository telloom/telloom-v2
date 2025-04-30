'use client';

// app/(authenticated)/role-executor/[id]/topics/[topicId]/ExecutorTopicPageClient.tsx
// Client component wrapper for displaying topic content for an executor.

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { ErrorBoundary } from 'react-error-boundary';
import { TopicPageContent } from '@/app/(authenticated)/role-sharer/topics/[id]/page';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import type { Database } from '@/lib/database.types';
import { Attachment, AttachmentDialog } from '@/components/AttachmentDialog';
import { PersonTag } from '@/types/models'; // <-- Add import for PersonTag
import { RecordingInterface as RecordingPopup } from '@/components/RecordingInterface'; // CORRECTED Import RecordingInterface as RecordingPopup
import { UploadPopup } from '@/components/UploadPopup'; // Import UploadPopup
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RealtimeChannel } from '@supabase/supabase-js'; // Import RealtimeChannel type

// --- Type Definitions ---
type ProfileSharer = Database['public']['Tables']['ProfileSharer']['Row'];
type TopicPromptCategory = Database['public']['Tables']['PromptCategory']['Row'] & {
    Prompt?: TopicPrompt[];
};
type TopicPrompt = Database['public']['Tables']['Prompt']['Row'] & {
    PromptResponse?: TopicPromptResponse[];
};
type TopicPromptResponse = Database['public']['Tables']['PromptResponse']['Row'] & {
    PromptResponseAttachment?: TopicPromptResponseAttachment[];
    Video?: TopicVideo;
    // videoStatus?: 'PROCESSING' | 'READY' | 'ERROR' | null; // REMOVED: No longer needed
};
type TopicPromptResponseAttachment = Database['public']['Tables']['PromptResponseAttachment']['Row'];
type TopicVideo = Database['public']['Tables']['Video']['Row'] & {
    VideoTranscript?: any[];
    // Explicitly add promptResponseId if needed for filtering/updates
    promptResponseId?: string | null;
};

// Error boundary fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error | string; resetErrorBoundary: () => void }) => {
  const errorMessage = error instanceof Error ? error.message : error;
  return (
    <div className="container mx-auto py-8">
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Topic</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={resetErrorBoundary}>
          Try again
        </Button>
    </div>
  );
};

interface ExecutorTopicPageClientProps {
  targetSharerId: string;
  topicId: string;
  initialSharerProfile?: ProfileSharer | null; // Pass from server if needed
}

export default function ExecutorTopicPageClient({ targetSharerId, topicId, initialSharerProfile }: ExecutorTopicPageClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth(); // Get current user (Executor)

  // State Hooks
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [sortByStatus, setSortByStatus] = useState<boolean>(false);
  const [selectedPrompt, setSelectedPrompt] = useState<TopicPrompt | null>(null);
  const [selectedPromptResponse, setSelectedPromptResponse] = useState<TopicPromptResponse | null>(null);
  const [isVideoPopupOpen, setIsVideoPopupOpen] = useState<boolean>(false);
  const [isRecordingPopupOpen, setIsRecordingPopupOpen] = useState<boolean>(false);
  const [isUploadPopupOpen, setIsUploadPopupOpen] = useState<boolean>(false);
  const [showSuccessView, setShowSuccessView] = useState(false);
  const [successPlaybackId, setSuccessPlaybackId] = useState<string | null>(null);
  const [isAttachmentUploadOpen, setIsAttachmentUploadOpen] = useState(false);
  // Use 'any' for attachment state temporarily to avoid type conflicts
  const [selectedAttachment, setSelectedAttachment] = useState<any | null>(null);
  const [currentAttachmentIndex, setCurrentAttachmentIndex] = useState<number>(0);
  const [galleryAttachments, setGalleryAttachments] = useState<any[]>([]); // Use any[]
  const [gallerySignedUrls, setGallerySignedUrls] = useState<Record<string, string>>({});
  const [areUrlsLoading, setAreUrlsLoading] = useState<boolean>(false);
  const [promptCategory, setPromptCategory] = useState<TopicPromptCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharerProfileData] = useState<ProfileSharer | null>(initialSharerProfile || null);
  const [trackingVideoId, setTrackingVideoId] = useState<string | null>(null); // NEW: Track the video ID for Realtime updates
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false); // Track initial data load
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);

  // --- Navigation and Download Handlers ---
  const handleNextAttachment = useCallback(() => {
    setCurrentAttachmentIndex((prevIndex) => {
      const nextIndex = prevIndex + 1;
      if (nextIndex < galleryAttachments.length) {
        setSelectedAttachment(galleryAttachments[nextIndex]);
        return nextIndex;
      } else {
        setSelectedAttachment(galleryAttachments[0]);
        return 0; 
      }
    });
  }, [galleryAttachments]);

  const handlePreviousAttachment = useCallback(() => {
    setCurrentAttachmentIndex((prevIndex) => {
      const prevIdx = prevIndex - 1;
      if (prevIdx >= 0) {
        setSelectedAttachment(galleryAttachments[prevIdx]);
        return prevIdx;
      } else {
        const lastIndex = galleryAttachments.length - 1;
        setSelectedAttachment(galleryAttachments[lastIndex]);
        return lastIndex;
      }
    });
  }, [galleryAttachments]);

  const hasNext = useMemo(() => galleryAttachments.length > 1, [galleryAttachments.length]);
  const hasPrevious = useMemo(() => galleryAttachments.length > 1, [galleryAttachments.length]);

  const handleDownloadAttachment = useCallback(async (attachmentToDownload: any) => {
    if (!attachmentToDownload?.fileUrl) {
      toast.error("Cannot download: file information missing.");
      return;
    }
    const downloadToast = toast.loading("Preparing download...");
    try {
      const filePath = attachmentToDownload.fileUrl;
      const { data, error } = await supabase.storage
        .from('attachments')
        .download(filePath);
      if (error) throw error;
      if (data) {
        const url = URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.download = attachmentToDownload.fileName || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("Download started!", { id: downloadToast });
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: downloadToast });
    }
  }, [supabase.storage]);

  // --- Data Fetching Logic ---
  const fetchAllSignedUrls = useCallback(async (attachments: TopicPromptResponseAttachment[], p_sharer_id: string) => {
    if (!p_sharer_id || !attachments || attachments.length === 0) {
      setGalleryAttachments([]);
      setGallerySignedUrls({});
      setAreUrlsLoading(false);
      return;
    }
    setAreUrlsLoading(true);
    const newSignedUrls: Record<string, string> = {};
    const allUiAttachments: any[] = []; // Use any[]

    const urlPromises = attachments.map(async (attachment) => {
        const filePath = attachment.fileUrl;
        if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
             return { attachment, signedUrl: null, error: 'Invalid file path' };
        }
         try {
             const fullStoragePath = filePath;
             const { data: signedUrlData, error: signError } = await supabase.storage
                .from('attachments')
                .createSignedUrl(fullStoragePath, 3600);
            if (signError) return { attachment, signedUrl: null, error: signError.message };
            if (!signedUrlData?.signedUrl) return { attachment, signedUrl: null, error: 'No signed URL returned' };
            return { attachment, signedUrl: signedUrlData.signedUrl, error: null };
        } catch (err) {
            return { attachment, signedUrl: null, error: err instanceof Error ? err.message : 'Unknown signing error' };
        }
    });

    const results = await Promise.allSettled(urlPromises);

     results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
            const { attachment: rawDbAttachment, signedUrl, error } = result.value;
            // Basic conversion, potentially losing some type safety temporarily
            const processedAttachment: any = {
               ...rawDbAttachment,
               signedUrl: signedUrl,
               displayUrl: signedUrl || rawDbAttachment.fileUrl,
               PersonTags: (rawDbAttachment as any).PromptResponseAttachmentPersonTag?.map(
                 (joinEntry: any) => joinEntry.PersonTag
               ).filter((tag: PersonTag | null): tag is PersonTag => tag !== null) ?? [],
            };
            allUiAttachments.push(processedAttachment);
            if (signedUrl) {
                newSignedUrls[rawDbAttachment.id] = signedUrl;
            } else {
                 console.warn(`[Executor fetchAllSignedUrls] Failed signed URL for ${rawDbAttachment.id}. Error: ${error || 'Unknown reason'}`);
            }
        } else if (result.status === 'rejected') {
            console.error('[Executor fetchAllSignedUrls] Promise rejected:', result.reason);
        }
    });

    console.log(`[fetchAllSignedUrls] Finished fetching. Total Processed: ${allUiAttachments.length}`);
    setGallerySignedUrls(prev => ({ ...prev, ...newSignedUrls }));
    setGalleryAttachments(allUiAttachments);
    setAreUrlsLoading(false);
  }, [supabase]);

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    console.log(`[ExecutorClient fetchData] Fetching data for topic: ${topicId}, sharer: ${targetSharerId}`);
    try {
        // Use RPC function optimized for fetching details needed by the executor view
        const { data, error: rpcError } = await supabase.rpc('get_prompt_category_with_details', {
            p_category_id: topicId,
            p_sharer_id: targetSharerId
        });

        if (rpcError) throw new Error(`Failed to load topic data: ${rpcError.message}`);

        if (!data) {
            console.log(`[ExecutorClient fetchData] No data returned by RPC for topic: ${topicId}, sharer: ${targetSharerId}`);
            setPromptCategory(null);
            setGalleryAttachments([]);
        } else {
            console.log(`[ExecutorClient fetchData] Received data from RPC for topic: ${topicId}`);
            const topicData = data as TopicPromptCategory;
            setPromptCategory(topicData);

            // Fetch signed URLs for attachments if any
            const allAttachmentsRaw = topicData.Prompt?.flatMap(
                (p: TopicPrompt) => p.PromptResponse?.flatMap(pr => pr.PromptResponseAttachment || []) || []
            ) || [];
             if (allAttachmentsRaw.length > 0) {
                await fetchAllSignedUrls(allAttachmentsRaw, targetSharerId);
             } else {
                setGalleryAttachments([]);
                setGallerySignedUrls({});
                setAreUrlsLoading(false);
             }
        }
    } catch (err) {
        console.error('[ExecutorClient] Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        setPromptCategory(null);
        setGalleryAttachments([]);
        setGallerySignedUrls({});
    } finally {
        if (showLoading) setLoading(false);
        // Mark initial load complete after first successful fetch or error
        if (!isInitialLoadComplete) setIsInitialLoadComplete(true);
        console.log(`[ExecutorClient fetchData] Finished fetching data for topic: ${topicId}`);
    }
  }, [topicId, targetSharerId, supabase, fetchAllSignedUrls, isInitialLoadComplete]); // Added isInitialLoadComplete

  const refreshData = useCallback(async () => {
    // Fetch without showing the main loading spinner for a smoother refresh
    await fetchData(false);
  }, [fetchData]);

  // --- Initial Data Load Effect ---
  useEffect(() => {
    if (!isInitialLoadComplete) { // Only run the *initial* fetch once
        fetchData(true);
    }
  }, [fetchData, isInitialLoadComplete]); // Depend on isInitialLoadComplete

  // --- Realtime Subscription Effect ---
  useEffect(() => {
    if (!supabase || !trackingVideoId || !isInitialLoadComplete) { // Wait for initial load
       // If we were tracking before but aren't now, ensure cleanup
      if (realtimeChannelRef.current) {
        console.log(`[Realtime] Cleaning up previous channel for ${realtimeChannelRef.current.topic}`);
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
      return;
    }

    console.log(`[Realtime] Setting up subscription for Video ID: ${trackingVideoId}`);

    // Ensure previous channel is removed before creating a new one
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
      console.log(`[Realtime] Removed previous channel.`);
    }

    // Subscribe to Video table using trackingVideoId
    const channel = supabase.channel(`video_update_${trackingVideoId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'Video', // Listen to Video table
          filter: `id=eq.${trackingVideoId}` // Filter by Video ID
        },
        (payload) => {
          console.log('[Realtime] Received UPDATE on Video table:', payload);
          // Check status on the Video payload
          const updatedVideo = payload.new as TopicVideo;

          // Check if the video status is now 'READY'
          if (updatedVideo.status === 'READY') {
            console.log(`[Realtime] Video ${trackingVideoId} is READY. Refreshing data...`);
            toast.success('Video processing complete!');
            refreshData(); // Refresh the entire dataset to get the updated video info
            setTrackingVideoId(null); // Stop tracking this video ID
            // Optionally unsubscribe here if only tracking one at a time aggressively
            // supabase.removeChannel(channel);
            // realtimeChannelRef.current = null;
          } else {
              console.log(`[Realtime] Video ${trackingVideoId} status updated to: ${updatedVideo.status}. Waiting for READY.`);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Successfully subscribed to Video ID: ${trackingVideoId}`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`[Realtime] Subscription error for Video ID ${trackingVideoId}:`, status, err);
          setError('Realtime connection error. Video status updates might be delayed.');
          setTrackingVideoId(null); // Stop tracking if subscription fails
        } else {
          console.log(`[Realtime] Subscription status for Video ${trackingVideoId}: ${status}`);
        }
      });

    realtimeChannelRef.current = channel;

    // Cleanup function
    return () => {
      if (realtimeChannelRef.current) {
        console.log(`[Realtime] Unsubscribing from Video ID: ${trackingVideoId}`);
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [supabase, trackingVideoId, refreshData, isInitialLoadComplete]); // Dependency includes trackingVideoId, refreshData, and isInitialLoadComplete

  // --- Function: Fetch and update a single attachment ---
  // Returns 'any' temporarily
  const fetchAndUpdateSingleAttachment = useCallback(async (attachmentId: string): Promise<any | null> => {
    try {
      const { data: updatedDbAttachment, error: fetchError } = await supabase
        .from('PromptResponseAttachment')
        .select(`*, PromptResponseAttachmentPersonTag (PersonTag (*))`)
        .eq('id', attachmentId)
        .maybeSingle();
      if (fetchError) throw new Error("Failed to fetch updated attachment data.");
      if (!updatedDbAttachment) {
        toast.warning("Could not find the updated attachment.");
        return null;
      }
      const tags = (updatedDbAttachment.PromptResponseAttachmentPersonTag || []).map(
          (joinEntry: any) => joinEntry.PersonTag
      ).filter((tag: PersonTag | null): tag is PersonTag => tag !== null);

      // Basic conversion
      const processedAttachment: any = {
        ...updatedDbAttachment,
        PersonTags: tags,
        signedUrl: null, // Assume needs refresh
      };
      return processedAttachment;
    } catch (error) {
      console.error('[ExecutorClient] Error in fetchAndUpdateSingleAttachment:', error);
      throw error;
    }
  }, [supabase]);

  // --- Video Saving Logic for Executor ---
  const upsertVideoForPrompt = useCallback(async (
    promptId: string,
    videoBlob?: Blob,
    muxPlaybackId?: string,
    muxAssetId?: string // Accept asset ID from recording upload
  ): Promise<string> => {
    if (!user || !targetSharerId || !promptId) throw new Error("User, sharer ID, or prompt ID is missing.");
    const toastId = toast.loading("Saving video...");
    try {
      // Step 1: Find or Create PromptResponse to get its ID
      let promptResponseId: string;
      const { data: existingResponse, error: selectError } = await supabase
        .from('PromptResponse')
        .select('id')
        .eq('promptId', promptId)
        .eq('profileSharerId', targetSharerId)
        .maybeSingle();

      if (selectError && selectError.code !== 'PGRST116') {
        console.error('[upsertVideoForPrompt] Error checking PromptResponse:', selectError);
        throw new Error(`Failed to check for existing response: ${selectError.message}`);
      }

      if (existingResponse) {
        promptResponseId = existingResponse.id;
        console.log(`[upsertVideoForPrompt] Found existing PromptResponse ID: ${promptResponseId}`);
      } else {
        console.log(`[upsertVideoForPrompt] Creating new PromptResponse for prompt ${promptId}, sharer ${targetSharerId}`);
        const { data: newResponse, error: insertResponseError } = await supabase
          .from('PromptResponse')
          .insert({
            promptId,
            profileSharerId: targetSharerId,
            userId: user.id, // Ensure userId is set if needed by policy/trigger
            responseType: 'VIDEO', // Set response type
            privacyLevel: 'Private' // Set default privacy
          })
          .select('id')
          .single();

        if (insertResponseError) {
          console.error('[upsertVideoForPrompt] Error inserting PromptResponse:', insertResponseError);
          throw new Error(`Failed to create new prompt response: ${insertResponseError.message}`);
        }
        promptResponseId = newResponse.id;
        console.log(`[upsertVideoForPrompt] Created new PromptResponse ID: ${promptResponseId}`);
      }

      // Step 2: Call RPC with the obtained PromptResponse ID
      console.log('[upsertVideoForPrompt] Calling RPC upsert_video_for_prompt_response with:', { p_prompt_response_id: promptResponseId, p_sharer_id: targetSharerId, p_mux_playback_id: muxPlaybackId, p_mux_asset_id: muxAssetId });
      const { data: rpcData, error: rpcError } = await supabase.rpc('upsert_video_for_prompt_response', {
        p_prompt_response_id: promptResponseId, // Pass the obtained ID
        p_sharer_id: targetSharerId,
        p_mux_playback_id: muxPlaybackId,
        p_mux_asset_id: muxAssetId // Pass asset ID if available
      });

      if (rpcError) throw new Error(`Failed to save video via RPC: ${rpcError.message}`);

      // The RPC returns { "video_id": "uuid" }
      const returnedVideoId = rpcData?.video_id;
      if (!returnedVideoId) throw new Error("Failed to get video ID from RPC response.");

      // Set the state to start tracking this video via Realtime
      console.log(`[upsertVideoForPrompt] Setting trackingVideoId to: ${returnedVideoId}`);
      setTrackingVideoId(returnedVideoId);

      toast.success("Video uploaded successfully!", { id: toastId });
      return returnedVideoId; // Return the video ID (might be useful)

    } catch (error) {
      console.error('[upsertVideoForPrompt] Error:', error);
      toast.error(`Error saving video: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId });
      setTrackingVideoId(null); // Clear tracking on error
      throw error; // Rethrow to be caught by calling function
    }
  }, [supabase, user, targetSharerId]);

  // --- Functional Handlers for Executor ---
  const handleVideoComplete = useCallback(async (blob: Blob): Promise<string> => {
    if (!selectedPrompt || !targetSharerId) throw new Error("Missing prompt or sharer context");
    const uploadToast = toast.loading("Uploading recorded video...");
    try {
        const formData = new FormData();
        formData.append('video', blob, 'recorded_video.webm');
        formData.append('promptId', selectedPrompt.id);
        formData.append('targetSharerId', targetSharerId); // Use targetSharerId

        // Call the new API endpoint for recorded videos
        const response = await fetch('/api/mux/upload-recorded-video', {
             method: 'POST',
             body: formData,
             // Include authorization if needed by the endpoint
             // headers: { 'Authorization': `Bearer ${session.access_token}` }
         });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown upload error' }));
            throw new Error(errorData.message || `Failed to upload recorded video (Status: ${response.status})`);
        }

        const { videoId, playbackId, assetId } = await response.json();
        if (!videoId || !playbackId || !assetId) throw new Error("API did not return necessary Mux IDs after upload.");
        toast.dismiss(uploadToast);

        await upsertVideoForPrompt(selectedPrompt.id, undefined, playbackId, assetId);

        setSuccessPlaybackId(playbackId);
        setShowSuccessView(true);
        return videoId; // Return the video ID from the API response
    } catch (error) {
        toast.error(`Failed to save recorded video: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: uploadToast });
        throw error;
    }
  }, [selectedPrompt, targetSharerId, upsertVideoForPrompt]);

  // This handler is called by UploadInterface after Mux's direct upload is complete
  // It only receives the playbackId because the Video record might not be READY yet
  const handleUploadFinished = useCallback(async (playbackId: string) => {
      if (!selectedPrompt || !targetSharerId) throw new Error("Missing prompt or sharer context");
      try {
          await upsertVideoForPrompt(selectedPrompt.id, undefined, playbackId, undefined);
          await refreshData(); 
          setSuccessPlaybackId(playbackId);
          setShowSuccessView(true);
      } catch (error) {
          console.error("[handleUploadFinished] Error after upsertVideoForPrompt:", error);
          toast.error(`Failed to link uploaded video: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
  }, [selectedPrompt, targetSharerId, upsertVideoForPrompt, refreshData]);

  const handleCloseRecording = useCallback(() => {
    setIsRecordingPopupOpen(false);
    setSelectedPrompt(null);
    setShowSuccessView(false);
    setSuccessPlaybackId(null);
    setTrackingVideoId(null); // Clear tracking when closing popup
  }, []);

  const handleCloseUpload = useCallback(() => {
    setIsUploadPopupOpen(false);
    setSelectedPrompt(null);
    setShowSuccessView(false);
    setSuccessPlaybackId(null);
    setTrackingVideoId(null); // Clear tracking when closing popup
  }, []);

  // Attachment Handlers
  // Accepts Attachment type from dialog
  const handleAttachmentSave = useCallback(async (attachmentFromDialog: Attachment) => {
    const toastId = toast.loading("Saving attachment details...");
    if (!attachmentFromDialog?.id) {
      toast.error("Cannot save: Attachment data is missing.", { id: toastId });
      return;
    }
    const personTagIds = (attachmentFromDialog.PersonTags || []).map(tag => tag.id);
    try {
      const { error: rpcError } = await supabase.rpc('update_attachment_details', {
        p_attachment_id: attachmentFromDialog.id,
        p_title: attachmentFromDialog.title,
        p_description: attachmentFromDialog.description,
        p_date_captured: attachmentFromDialog.dateCaptured && attachmentFromDialog.dateCaptured instanceof Date
                           ? attachmentFromDialog.dateCaptured.toISOString().split('T')[0]
                           : null,
        p_year_captured: attachmentFromDialog.yearCaptured,
        p_person_tag_ids: personTagIds
      });
      if (rpcError) throw new Error(rpcError.message || "Failed to save attachment details.");

      // Fetch the updated attachment data (returns 'any' temporarily)
      const refreshedAttachment = await fetchAndUpdateSingleAttachment(attachmentFromDialog.id);

      if (refreshedAttachment) {
        // Update gallery state
        setGalleryAttachments(prevGallery => {
          const index = prevGallery.findIndex(att => att.id === refreshedAttachment.id);
          if (index !== -1) {
            const newGallery = [...prevGallery];
            newGallery[index] = refreshedAttachment;
            return newGallery;
          }
          return prevGallery;
        });
        // Update selected attachment state
        setSelectedAttachment(refreshedAttachment);
        toast.success("Attachment saved.", { id: toastId });
      } else {
         toast.error("Attachment saved, but failed to refresh data.", { id: toastId });
         setSelectedAttachment(null); // Close dialog if refresh fails
      }
    } catch (error) {
      console.error('[ExecutorClient] Error in handleAttachmentSave:', error);
      toast.error(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId });
    }
  }, [supabase, fetchAndUpdateSingleAttachment]);

  const handleAttachmentDelete = useCallback(async (attachmentId: string) => {
     const toastId = toast.loading("Deleting attachment...");
     try {
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
        console.warn("Simulated delete for attachment:", attachmentId);
        setGalleryAttachments(prev => prev.filter(att => att.id !== attachmentId));
        setSelectedAttachment(null);
        toast.success("Attachment deleted (simulated).", { id: toastId });
     } catch (error) {
        console.error('[ExecutorClient] Error deleting attachment:', error);
        toast.error(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId });
     }
   }, []);

  // --- Render Logic ---
  if (loading && !promptCategory) {
    return <div className="flex justify-center items-center h-[calc(100vh-200px)]"><Loader2 className="h-12 w-12 animate-spin text-gray-500" /></div>;
  }
  if (error && !loading) { // Show error only if not loading initially
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error Loading Topic</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
        <Button onClick={() => fetchData(true)} className="mt-4">Retry</Button>
      </div>
    );
  }
  if (!promptCategory && !loading && !error) { // Handle no data found state
    return (
      <div className="container mx-auto px-4 py-8">
         <Alert><AlertCircle className="h-4 w-4" /><AlertTitle>Topic Not Found</AlertTitle><AlertDescription>No data found for this topic for the selected sharer.</AlertDescription></Alert>
      </div>
    );
  }

  // Prepare props for TopicPageContent, using 'any' where needed for now
  const topicPageContentProps: any = {
    promptCategory,
    targetSharerId,
    sharerProfileData,
    viewMode,
    sortByStatus,
    setViewMode,
    setSortByStatus,
    selectedPrompt,
    selectedPromptResponse,
    setSelectedPrompt,
    setSelectedPromptResponse,
    isVideoPopupOpen,
    isRecordingPopupOpen,
    isUploadPopupOpen,
    isAttachmentUploadOpen,
    setIsVideoPopupOpen,
    setIsRecordingPopupOpen,
    setIsUploadPopupOpen,
    setIsAttachmentUploadOpen,
    handleCloseRecording,
    handleCloseUpload,
    handleVideoComplete,
    handleUploadFinished,
    handleAttachmentSave, // Pass directly, expect TopicPageContent to handle 'any'
    handleAttachmentDelete,
    gallerySignedUrls,
    areUrlsLoading,
    galleryAttachments,
    selectedAttachment,
    currentAttachmentIndex,
    setSelectedAttachment,
    setCurrentAttachmentIndex,
    refreshData,
    router,
    handleNextAttachment,
    handlePreviousAttachment,
    hasNext,
    hasPrevious,
    handleDownloadAttachment,
    roleContext: 'EXECUTOR',
  };

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => fetchData(true)} 
    >
      <TopicPageContent
        {...topicPageContentProps}
      />

      {/* Render AttachmentDialog */}
       {selectedAttachment && galleryAttachments.length > 0 && (
         <AttachmentDialog
           isOpen={!!selectedAttachment}
           onClose={() => setSelectedAttachment(null)}
           // Pass selectedAttachment (any) directly, dialog expects Attachment
           attachment={selectedAttachment as Attachment}
           onSave={handleAttachmentSave} // Pass the handler expecting Attachment
           onDelete={handleAttachmentDelete}
           onDownload={handleDownloadAttachment}
           onNext={handleNextAttachment}
           onPrevious={handlePreviousAttachment}
           hasNext={hasNext}
           hasPrevious={hasPrevious}
         />
       )}

      {/* --- Render Recording Interface inside a Dialog --- */}
      {selectedPrompt && (
        <>
          <Dialog open={isRecordingPopupOpen} onOpenChange={handleCloseRecording}>
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 m-4 overflow-hidden" aria-describedby="recording-dialog-description">
              <DialogHeader className="sr-only">
                <DialogTitle>Record Video Response</DialogTitle>
                <DialogDescription id="recording-dialog-description">{selectedPrompt.promptText}</DialogDescription>
              </DialogHeader>
              {/* Render RecordingInterface only when dialog is open */}
              {isRecordingPopupOpen && (
                <RecordingPopup // Use the alias
                  promptId={selectedPrompt.id}
                  onClose={handleCloseRecording}
                  onSave={handleVideoComplete} // This triggers the upload -> upsert -> tracking flow
                />
              )}
            </DialogContent>
          </Dialog>
          {/* UploadPopup remains the same */}
          <UploadPopup
            open={isUploadPopupOpen}
            onClose={handleCloseUpload}
            promptId={selectedPrompt.id}
            promptText={selectedPrompt.promptText || ''}
            onUploadSuccess={handleUploadFinished} // This triggers the upsert -> tracking flow
            showSuccessView={showSuccessView}
            muxPlaybackId={successPlaybackId}
            targetSharerId={targetSharerId}
          />
        </>
      )}
      {/* --- END --- */}
    </ErrorBoundary>
  );
} 