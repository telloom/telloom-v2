'use client';

// app/(authenticated)/role-listener/[id]/topics/[topicId]/ListenerTopicPageClient.tsx
// Client component for displaying topic content (prompts and responses) for a Listener.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { ErrorBoundary } from 'react-error-boundary';
// Use a simplified content component or adapt TopicPageContent if possible
// For now, we'll define the structure within this file.
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Info } from 'lucide-react'; // Added necessary icons
import type { Database } from '@/lib/database.types';
import { PersonTag } from '@/types/models';
import { useAuth } from '@/hooks/useAuth';
import { RealtimeChannel } from '@supabase/supabase-js';

// Import newly created listener-specific components
import { ListenerVideoPopup } from '@/components/listener/ListenerVideoPopup';
import { ListenerAttachmentDialog, Attachment as ListenerAttachmentType } from '@/components/listener/ListenerAttachmentDialog';
import ListenerPromptDisplayCard from '@/components/listener/ListenerPromptDisplayCard';
import { ListenerTopicVideoCard } from '@/components/listener/ListenerTopicVideoCard'; // Corrected import path

// IMPORT SHARED TYPES
import type { 
    ListenerTopicData as RpcListenerTopicData,
    RpcTopicAttachment
} from '@/types/listener-topic-types';

// StatefulAttachment will no longer hold signedFileUrl directly.
// It will be looked up from a separate map.
type StatefulAttachment = RpcTopicAttachment;

interface StatefulPromptResponse {
  id: string;
    videoId: string | null;
    summary: string | null;
    responseNotes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
    video_muxPlaybackId?: string | null;
    video_duration?: number | null;
  video_status?: string | null; // Consider using a specific enum/literal type if available
  is_favorite?: boolean;
  attachments?: StatefulAttachment[];
}

interface StatefulTopicPrompt {
  id: string;
    promptText: string;
    isContextEstablishing: boolean;
  sharerResponse: StatefulPromptResponse | null; // Changed from optional to required (but can be null)
}

interface StatefulTopicData {
  id: string;
    category: string;
  description?: string | null;
  theme?: string | null;
  prompts?: StatefulTopicPrompt[];
}

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

// Props for the Listener client component
interface ListenerTopicPageClientProps {
  profileSharerId: string; // This is ProfileSharer.id
  sharerProfileId: string; // This is Profile.id of the sharer
  topicId: string; // This is PromptCategory.id
  categoryName: string; // Added to accept categoryName from server component
}

// Main Component
export default function ListenerTopicPageClient({ 
    profileSharerId, 
    sharerProfileId, 
    topicId, 
    categoryName
}: ListenerTopicPageClientProps) {
  const supabase = createClient();
  const { user } = useAuth(); // Get current user (Listener)

  // State for ListenerVideoPopup
  const [playbackIdForPopup, setPlaybackIdForPopup] = useState<string | null>(null);
  const [videoTitleForPopup, setVideoTitleForPopup] = useState<string>('Video Response');
  const [showVideoPopup, setShowVideoPopup] = useState<boolean>(false);
  
  // State for main topic data and loading/error
  const [topicData, setTopicData] = useState<StatefulTopicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false); 
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  // const signedUrlsProcessedRef = useRef<string | null>(null); // No longer needed with this new pattern

  // NEW: State for signed URLs, mapping attachment ID to its signed URL or null if fetch failed
  const [gallerySignedUrls, setGallerySignedUrls] = useState<Record<string, string | null>>({});

  // State for ListenerAttachmentDialog (new flow)
  // Ensure ListenerAttachmentType is compatible or also extended if it uses signedFileUrl
  const [selectedAttachmentForDialog, setSelectedAttachmentForDialog] = useState<ListenerAttachmentType | null>(null);
  const [currentPromptForAttachments, setCurrentPromptForAttachments] = useState<StatefulTopicPrompt | null>(null);
  const [currentAttachmentIndexInPrompt, setCurrentAttachmentIndexInPrompt] = useState(0);

  const fetchData = useCallback(async (showLoading = true) => {
    if (!user?.id) {
      console.log('[ListenerClient fetchData] No listener user ID found.');
      setError('Authentication error.');
      setLoading(false);
      return;
    }
    if (!sharerProfileId) {
        console.log('[ListenerClient fetchData] Sharer Profile ID missing.');
        setError('Configuration error: Sharer ID missing.');
        setLoading(false);
        return;
    }
    if (showLoading) setLoading(true);
    setError(null);
    console.log(`[ListenerClient fetchData] Fetching data for topic: ${topicId}, sharerProfileId: ${sharerProfileId}, listenerUserId: ${user.id}`);
    try {
        const { data, error: rpcError } = await supabase.rpc('get_listener_topic_prompts_and_responses', {
            p_prompt_category_id: topicId,
            p_sharer_profile_id: sharerProfileId,
            p_listener_profile_id: user.id
        });

        if (rpcError) throw new Error(`Failed to load topic data: ${rpcError.message}`);

        if (!data) {
            console.log(`[ListenerClient fetchData] No data returned by RPC for topic: ${topicId}, sharerProfileId: ${sharerProfileId}`);
            setTopicData(null);
        } else {
            console.log(`[ListenerClient fetchData] TOPIC_ID: ${topicId} --- Received RAW data from RPC. Stringified full data:`, JSON.stringify(data, null, 2));
            // Cast RPC data to our StatefulTopicData. This might require careful mapping if structures differ significantly.
            // For now, assuming a direct cast is mostly okay and the effect will process it.
            const fetchedRpcData = data as RpcListenerTopicData;
            setTopicData(fetchedRpcData as unknown as StatefulTopicData); // Initial set, effect will add signed URLs
            setIsInitialLoadComplete(true);
        }
    } catch (err: any) {
        console.error("[ListenerClient fetchData] Error:", err);
        setError(err.message || "An unexpected error occurred.");
    } finally {
        if (showLoading) setLoading(false);
    }
  }, [topicId, sharerProfileId, user?.id, supabase]);

  useEffect(() => { // Realtime for Video
    if (!supabase || !profileSharerId || !topicId || !isInitialLoadComplete) return;
    const videoChannel = supabase.channel(`topic_video_updates:${profileSharerId}:${topicId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'Video' },
        (payload) => {
          console.log('[Realtime Video Update]', payload);
          const updatedVideo = payload.new as Database['public']['Tables']['Video']['Row'];
          setTopicData(currentTopicData => {
            if (!currentTopicData?.prompts) return currentTopicData;
            return {
              ...currentTopicData,
              prompts: currentTopicData.prompts.map(p => {
                if (p.sharerResponse?.videoId === updatedVideo.id) {
                  return {
                    ...p,
                    sharerResponse: {
                      ...p.sharerResponse,
                      video_muxPlaybackId: updatedVideo.muxPlaybackId,
                      video_duration: updatedVideo.duration,
                      video_status: updatedVideo.status,
                    }
                  };
                }
                return p;
              })
            };
          });
        }
      )
      .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
              console.log(`[Realtime] Subscribed to Video updates for topic ${topicId}`);
          } else {
              console.log(`[Realtime] Video channel status: ${status}`);
          }
      });
    realtimeChannelRef.current = videoChannel;
    return () => {
      if (realtimeChannelRef.current) {
        console.log(`[Realtime] Unsubscribing from Video updates for topic ${topicId}`);
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [supabase, profileSharerId, topicId, isInitialLoadComplete]);

  useEffect(() => { // Initial data fetch
    if (user?.id && sharerProfileId && topicId) {
      // Reset gallerySignedUrls when topicId changes
      setGallerySignedUrls({}); 
      fetchData();

      // <<< TEMPORARY DIAGNOSTIC CODE START >>>
      // const diagnosticTest = async () => {
      //   console.log("[DIAGNOSTIC_TEST] Attempting to get signed URL for a known root file: tully-joecreativity-and-art_4923ecbc.png");
      //   try {
      //     const { data, error } = await supabase.storage
      //       .from('attachments')
      //       .createSignedUrl('tully-joecreativity-and-art_4923ecbc.png', 60 * 5); // 5 min expiry
      //     if (error) {
      //       console.error("[DIAGNOSTIC_TEST] Error: ", error.message, error);
      //     } else {
      //       console.log("[DIAGNOSTIC_TEST] Success! Signed URL: ", data.signedUrl);
      //     }
      //   } catch (e) {
      //     console.error("[DIAGNOSTIC_TEST] Exception: ", (e as Error).message, e);
      //   }
      // };
      // if (supabase) { // Ensure supabase client is available
      //   void diagnosticTest();
      // }
      // <<< TEMPORARY DIAGNOSTIC CODE END >>>

      // <<< AUTH_ROLE_TEST CODE START >>>
      // const testAuthRole = async () => {
      //   if (!supabase) return;
      //   console.log("[AUTH_ROLE_TEST] Calling get_my_auth_role RPC...");
      //   try {
      //     const { data: roleData, error: roleError } = await supabase.rpc('get_my_auth_role');
      //     if (roleError) {
      //       console.error("[AUTH_ROLE_TEST] Error calling RPC: ", roleError.message, roleError);
      //     } else {
      //       console.log("[AUTH_ROLE_TEST] RPC returned role: ", roleData);
      //     }
      //   } catch (e) {
      //     console.error("[AUTH_ROLE_TEST] Exception calling RPC: ", (e as Error).message, e);
      //   }
      // };
      // if (supabase) {
      //   void testAuthRole();
      // }
      // <<< AUTH_ROLE_TEST CODE END >>>

    }
  }, [user?.id, sharerProfileId, topicId, fetchData]);

  // useEffect to fetch signed URLs for attachments when topicData.prompts is populated
  useEffect(() => {
    if (!topicData || !topicData.prompts || !isInitialLoadComplete) {
      return;
    }

    const fetchAllSignedUrls = async () => {
      console.log("[ListenerClient fetchAllSignedUrls] Starting to process attachments for signed URLs.");

      const allAttachments: { id: string; fileUrl: string | null }[] = [];
      topicData.prompts?.forEach(prompt => {
        prompt.sharerResponse?.attachments?.forEach(att => {
          if (att.id && att.fileUrl && gallerySignedUrls[att.id] === undefined) { // Only fetch if not already attempted (undefined)
            allAttachments.push({ id: att.id, fileUrl: att.fileUrl });
          }
        });
      });

      if (allAttachments.length === 0) {
        console.log("[ListenerClient fetchAllSignedUrls] No new attachments to fetch signed URLs for.");
        return;
      }

      const newUrlsMap: Record<string, string | null> = {};

      await Promise.all(
        allAttachments.map(async (att) => {
          if (!att.fileUrl) {
            console.log(`[ListenerClient fetchAllSignedUrls] Attachment ID: ${att.id} has no fileUrl. Skipping.`);
            newUrlsMap[att.id] = null; // Mark as processed (failed)
            return;
          }

          const path = att.fileUrl; // Assuming root path for now
          console.log(`[ListenerClient fetchAllSignedUrls] Attempting to sign URL for Attachment ID: ${att.id}, Path: "${path}"`);
          try {
            const { data, error: signError } = await supabase.storage
              .from('attachments')
              .createSignedUrl(path, 60 * 60); // 1 hour

            if (signError) {
              console.error(`[ListenerClient fetchAllSignedUrls] Error creating signed URL for Attachment ID: ${att.id}, Path: "${path}":`, signError.message);
              newUrlsMap[att.id] = null; // Mark as processed (failed)
            } else if (data?.signedUrl) {
              console.log(`[ListenerClient fetchAllSignedUrls] Successfully created signed URL for Attachment ID: ${att.id}, Path: "${path}"`);
              newUrlsMap[att.id] = data.signedUrl;
            } else {
              console.warn(`[ListenerClient fetchAllSignedUrls] No signed URL and no error for Attachment ID: ${att.id}, Path: "${path}"`);
              newUrlsMap[att.id] = null; // Mark as processed (failed)
            }
          } catch (e: any) {
            console.error(`[ListenerClient fetchAllSignedUrls] Exception creating signed URL for Attachment ID: ${att.id}, Path: "${path}":`, e.message);
            newUrlsMap[att.id] = null; // Mark as processed (failed)
          }
        })
      );
      
      if (Object.keys(newUrlsMap).length > 0) {
        console.log("[ListenerClient fetchAllSignedUrls] Updating gallerySignedUrls state.");
        setGallerySignedUrls(prev => ({ ...prev, ...newUrlsMap }));
      }
    };

    void fetchAllSignedUrls();

  // Rerun if topicData.prompts changes (new attachments appear) or initial load completes.
  // Avoids re-running just because gallerySignedUrls changes.
  }, [topicData, supabase, isInitialLoadComplete, gallerySignedUrls]); 
  
  const handleResetError = () => {
    setError(null);
    setLoading(true); // Set loading to true to re-trigger fetch
    fetchData(); // Re-fetch data
  };

  const handlePlayVideo = (response: StatefulPromptResponse, promptText: string) => {
    if (response.video_muxPlaybackId && response.video_muxPlaybackId.trim() !== '') {
      setPlaybackIdForPopup(response.video_muxPlaybackId);
      setVideoTitleForPopup(promptText || 'Video Response');
      setShowVideoPopup(true);
    } else {
      toast.info('Video playback ID is not available.');
    }
  };

  const openAttachmentDialogForPrompt = (prompt: StatefulTopicPrompt, attachmentIndex: number) => {
    if (prompt.sharerResponse?.attachments && prompt.sharerResponse.attachments[attachmentIndex]) {
      const attachmentFromState = prompt.sharerResponse.attachments[attachmentIndex];

      // Construct the object for the dialog. 
      // ListenerAttachmentType (Attachment in ListenerAttachmentDialog) expects specific fields.
      // It does NOT expect signedFileUrl, as the dialog fetches its own.
      const attachmentForDialog: ListenerAttachmentType = {
        id: attachmentFromState.id!,
        fileUrl: attachmentFromState.fileUrl!,
        // displayUrl can be set here if needed, or dialog can use fileUrl if signed fails
        displayUrl: gallerySignedUrls[attachmentFromState.id!] || attachmentFromState.fileUrl!, 
        fileType: attachmentFromState.fileType!,
        fileName: attachmentFromState.fileName!,
        title: attachmentFromState.title,
        description: attachmentFromState.description,
        // Ensure dateCaptured is a Date object or null for the dialog if it expects that.
        // The ListenerAttachmentDialog seems to handle string or Date for dateCaptured.
        dateCaptured: attachmentFromState.dateCaptured ? new Date(attachmentFromState.dateCaptured) : null,
        yearCaptured: attachmentFromState.yearCaptured,
        PersonTags: (attachmentFromState.PersonTags || []) as PersonTag[], // Cast if necessary
        profileSharerId: attachmentFromState.profileSharerId,
        // DO NOT ADD signedFileUrl HERE
      };

      setSelectedAttachmentForDialog(attachmentForDialog);
      setCurrentPromptForAttachments(prompt);
      setCurrentAttachmentIndexInPrompt(attachmentIndex);
    } else {
      toast.error("Attachment not found.");
    }
  };

  const handleCloseAttachmentDialog = () => {
    setSelectedAttachmentForDialog(null);
    setCurrentPromptForAttachments(null);
  };

  const handleNextAttachmentInPrompt = () => {
    if (currentPromptForAttachments && currentPromptForAttachments.sharerResponse?.attachments) {
      const nextIndex = currentAttachmentIndexInPrompt + 1;
      if (nextIndex < currentPromptForAttachments.sharerResponse.attachments.length) {
        openAttachmentDialogForPrompt(currentPromptForAttachments, nextIndex);
      }
    }
  };

  const handlePreviousAttachmentInPrompt = () => {
    if (currentPromptForAttachments && currentPromptForAttachments.sharerResponse?.attachments) {
      const prevIndex = currentAttachmentIndexInPrompt - 1;
      if (prevIndex >= 0) {
        openAttachmentDialogForPrompt(currentPromptForAttachments, prevIndex);
      }
    }
  };

  const handleAttachmentDownload = async (attachmentToDownload: ListenerAttachmentType) => {
    if (!attachmentToDownload || !attachmentToDownload.id || !attachmentToDownload.fileName) {
      toast.error("Attachment details are missing or incomplete.");
      return;
    }

    // Get the signed URL from the gallerySignedUrls map
    const signedUrl = gallerySignedUrls[attachmentToDownload.id];

    if (!signedUrl) {
      toast.error("Could not retrieve download URL. Please try again.");
      console.warn(`[ListenerClient handleAttachmentDownload] Missing signed URL for attachment ID: ${attachmentToDownload.id}`);
      return;
    }

    try {
      // Fetch the file content from the signed URL
      const response = await fetch(signedUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();

      // Create an object URL from the blob
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachmentToDownload.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url); // Clean up the object URL
      toast.success(`Downloading ${attachmentToDownload.fileName}`);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file. Check console for details.');
    }
  };

  // Ensure topicData has prompts before sorting or mapping
  const sortedPrompts = [...(topicData?.prompts || [])].filter(prompt => !!prompt.sharerResponse).sort((a, b) => {
    if (a.isContextEstablishing && !b.isContextEstablishing) return -1;
    if (!a.isContextEstablishing && b.isContextEstablishing) return 1;
    // Fallback to sorting by promptText if creation/order is not available
    return (a.promptText || '').localeCompare(b.promptText || '');
  });

  // --- Render Logic ---
  if (loading && !isInitialLoadComplete) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>;
  }

  if (error && !isInitialLoadComplete) {
    return <ErrorFallback error={error} resetErrorBoundary={handleResetError} />;
  }

  if (!topicData && !categoryName) {
    return (
      <Alert className="my-4">
          <Info className="h-4 w-4" />
          <AlertTitle>No Topic Data</AlertTitle>
          <AlertDescription>Could not load data for this topic.</AlertDescription>
      </Alert>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={handleResetError}>
        <div className="space-y-8 mt-2">
            {/* Display Topic title and description from fetched topicData if available */}
            {topicData && (
            <div className="pb-4 border-b">
                    <h1 className="text-2xl font-semibold text-gray-800">{topicData.category || categoryName}</h1>
                {topicData.description && (
                    <p className="mt-2 text-gray-600">{topicData.description}</p>
                )}
            </div>
            )}

            {/* Render ListenerTopicVideoCard AFTER title/description if categoryName is available */}
            {categoryName && topicId && (
                 <div className="my-8"> {/* Adjusted margin to my-8 for spacing */}
                    <ListenerTopicVideoCard
                        promptCategoryId={topicId} 
                        categoryName={categoryName} 
                        targetSharerId={profileSharerId} // This is ProfileSharer.id
                        roleContext="LISTENER" // Keep if this prop exists and is used
                    />
                 </div>
            )}

            {/* Apply grid layout here */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {sortedPrompts.length === 0 && (
                    <p className="text-center text-gray-500 md:col-span-2 lg:col-span-3">No prompts found for this topic.</p>
                )}
                {sortedPrompts.map((prompt, index) => (
                    <ListenerPromptDisplayCard 
                        key={prompt.id} 
                        prompt={prompt} 
                        promptIndex={index} 
                        sharerId={profileSharerId} // <<< --- ENSURE THIS IS CORRECTLY PASSED --- >>>
                        onPlayVideo={handlePlayVideo} 
                        onViewAttachment={openAttachmentDialogForPrompt}
                        gallerySignedUrls={gallerySignedUrls}
                    />
                ))}
            </div>
        </div>
        
        {/* Video Player Popup - USE ListenerVideoPopup */}
        {showVideoPopup && playbackIdForPopup && (
            <ListenerVideoPopup
                open={showVideoPopup}
                videoId={playbackIdForPopup}
                promptText={videoTitleForPopup}
                onClose={() => setShowVideoPopup(false)}
            />
        )}

        {/* Attachment Dialog - USE ListenerAttachmentDialog */}
        {selectedAttachmentForDialog && currentPromptForAttachments && (
            <ListenerAttachmentDialog
                attachment={selectedAttachmentForDialog}
                isOpen={!!selectedAttachmentForDialog} // Control dialog visibility directly
                onClose={handleCloseAttachmentDialog}
                onNext={currentAttachmentIndexInPrompt < (currentPromptForAttachments.sharerResponse?.attachments?.length || 0) - 1 
                    ? handleNextAttachmentInPrompt 
                    : undefined}
                onPrevious={currentAttachmentIndexInPrompt > 0 
                    ? handlePreviousAttachmentInPrompt 
                    : undefined}
                hasNext={currentAttachmentIndexInPrompt < (currentPromptForAttachments.sharerResponse?.attachments?.length || 0) - 1}
                hasPrevious={currentAttachmentIndexInPrompt > 0}
                onDownload={handleAttachmentDownload}
            />
        )}
    </ErrorBoundary>
  );
} 