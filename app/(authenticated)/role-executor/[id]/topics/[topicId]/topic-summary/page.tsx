// app/(authenticated)/role-executor/[id]/topics/[topicId]/topic-summary/page.tsx
// Displays the summary view for a specific topic for a specific sharer, from the executor's perspective.

'use client';

export const runtime = 'nodejs'; // Or 'edge' if preferred and compatible

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { TopicVideoResponseSection } from '@/components/TopicVideoResponseSection';
import { UIAttachment, toUIAttachment } from '@/types/component-interfaces';
import { PromptResponseAttachment } from '@/types/models';
import { ArrowLeft, AlertTriangle, Trash2 } from 'lucide-react';
// No need for getEffectiveSharerId here, sharerId comes from params
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ExecutorSharerHeader } from '@/components/executor/ExecutorSharerHeader'; // Import the header

// Helper function to validate UUID (optional but recommended)
const isValidUUID = (uuid: string): boolean => {
  if (!uuid) return false;
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return uuidRegex.test(uuid);
};

// Define the expected shape of the sharer profile data (mirroring the header component)
interface SharerProfileData {
  avatarUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  // Add other fields if needed by the header or page
}

export default function ExecutorTopicSummaryPage() {
  const params = useParams();
  const router = useRouter();

  // Extract IDs from params, ensuring they are strings
  const sharerIdParam = typeof params.id === 'string' ? params.id : '';
  const topicIdParam = typeof params.topicId === 'string' ? params.topicId : '';

  const [isLoading, setIsLoading] = useState(true);
  const [topicVideo, setTopicVideo] = useState<any>(null);
  const [attachments, setAttachments] = useState<UIAttachment[]>([]);
  const [topicName, setTopicName] = useState('');
  // userId here will represent the targetSharerId for the components
  const [targetSharerId, setTargetSharerId] = useState<string | null>(null);
  const [showVideoDeleteConfirm, setShowVideoDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sharerProfileData, setSharerProfileData] = useState<SharerProfileData | null>(null); // Add state for sharer profile
  const [isValidPage, setIsValidPage] = useState<boolean | null>(null); // Track validity

  // Validate Params and Fetch Data
  const validateAndFetchData = useCallback(async () => {
    console.log('[ExecutorTopicSummaryPage] Validating params:', { sharerIdParam, topicIdParam });

    if (!isValidUUID(sharerIdParam) || !isValidUUID(topicIdParam)) {
      console.error('[ExecutorTopicSummaryPage] Invalid UUID parameters.', { sharerIdParam, topicIdParam });
      toast.error('Invalid page URL.');
      setIsValidPage(false);
      setIsLoading(false);
      // Optionally redirect, or just show an error state
      // router.push('/role-executor'); // Example redirect
      return;
    }

    console.log('[ExecutorTopicSummaryPage] Params validated. Setting targetSharerId.');
    setTargetSharerId(sharerIdParam); // Set the target sharer ID for fetching
    setIsValidPage(true);

    // Proceed with fetching data using the validated IDs
    const supabase = createClient();
    try {
      // --- Verify Executor Access (Important!) ---
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('[ExecutorTopicSummaryPage] Authentication error:', userError);
        toast.error('Authentication failed. Please log in.');
        router.push('/login');
        return;
      }

      // Call RPC function to check if the current user is an executor for sharerIdParam
      // This RPC function should internally use the secure `has_sharer_access` or similar check
      const { data: accessData, error: accessError } = await supabase.rpc(
        'is_executor_for_sharer', 
        { sharer_id: sharerIdParam } // Correct function uses only sharer_id and implicitly checks auth.uid()
      );

      if (accessError) {
        console.error(`[ExecutorTopicSummaryPage] Error verifying executor access for user ${user.id} and sharer ${sharerIdParam}:`, accessError);
        toast.error('Failed to verify your permissions.');
        setIsValidPage(false); // Mark page as invalid due to access error
        setIsLoading(false);
        router.push('/role-executor'); // Redirect if access check fails
        return;
      }

      if (!accessData) { // accessData should return true if authorized
        console.warn(`[ExecutorTopicSummaryPage] Access Denied: User ${user.id} is not an executor for sharer ${sharerIdParam}.`);
        toast.error('You do not have permission to view this page.');
        setIsValidPage(false); // Mark page as invalid
        setIsLoading(false);
        router.push('/role-executor'); // Redirect if not authorized
        return;
      }
      console.log(`[ExecutorTopicSummaryPage] Access confirmed for user ${user.id} to sharer ${sharerIdParam}.`);
      // --- End Access Verification ---

      // --- Fetch Sharer Profile Details for Header ---
      console.log(`[ExecutorTopicSummaryPage] Fetching sharer profile details for header: ${sharerIdParam}`);
      const { data: sharerDetails, error: sharerDetailsError } = await supabase.rpc(
        'get_sharer_details_for_executor',
        { p_sharer_id: sharerIdParam } // Pass the validated sharer ID
      );

      if (sharerDetailsError) {
        console.error(`[ExecutorTopicSummaryPage] Error fetching sharer details for header:`, sharerDetailsError);
        toast.error("Could not load sharer's details.");
        // Decide if this is a fatal error for the page
        // setIsValidPage(false);
        // setIsLoading(false);
        // return;
      } else {
        console.log('[ExecutorTopicSummaryPage] Sharer details fetched:', sharerDetails);
        // Adapt the fetched data to the SharerProfileData interface if needed
        // Assuming the RPC returns fields like profile_first_name, profile_last_name, profile_avatar_url
        const profile = sharerDetails?.[0]; // Get the first object from the array
        if (profile) {
          setSharerProfileData({
            firstName: profile.profile_first_name,
            lastName: profile.profile_last_name,
            avatarUrl: profile.profile_avatar_url,
          });
        } else {
          console.warn('[ExecutorTopicSummaryPage] Sharer details array was empty or null.');
          setSharerProfileData(null); // Set to null if no profile found
        }
      }
      // --- End Fetch Sharer Profile ---

      // Fetch topic name
      const { data: topicData, error: topicError } = await supabase
        .from('PromptCategory')
        .select('category')
        .eq('id', topicIdParam) // Use validated topicIdParam
        .single();

      if (topicError) throw topicError;
      setTopicName(topicData?.category || '');

      // Fetch video using the validated topicIdParam and sharerIdParam
      console.log('[ExecutorTopicSummaryPage] Fetching video for topicId:', topicIdParam, 'and profileSharerId:', sharerIdParam);
      const { data: videoData, error: videoError } = await supabase
        .from('TopicVideo')
        .select(`
          id,
          muxPlaybackId,
          muxAssetId,
          dateRecorded,
          profileSharerId,
          status,
          summary,
          TopicVideoTranscript (
            id,
            transcript,
            source,
            type,
            language,
            muxTrackId,
            muxAssetId,
            createdAt
          )
        `)
        .eq('promptCategoryId', topicIdParam)
        .eq('profileSharerId', sharerIdParam)
        .maybeSingle();

      if (videoError) throw videoError;
      console.log('[ExecutorTopicSummaryPage] Raw video data (WITH nested transcript attempt):', videoData);

      // --- USE DIRECT videoData --- 
      setTopicVideo(videoData); // Directly set the fetched video data (which should include transcript)

      // Log transcript status after setting state
      if (videoData?.TopicVideoTranscript && videoData.TopicVideoTranscript.length > 0) {
        console.log('[ExecutorTopicSummaryPage] Transcript successfully included in main query:', videoData.TopicVideoTranscript);
      } else {
        console.log('[ExecutorTopicSummaryPage] Transcript NOT included in main query result.');
      }

      // Fetch attachments (this section might need adjustments based on how attachments are linked)
      // Assuming attachments are primarily linked via PromptResponses which are linked to Prompts in the Category

      // Fetch all prompts in this category
      const { data: prompts, error: promptError } = await supabase
        .from('Prompt')
        .select('id')
        .eq('promptCategoryId', topicIdParam);

      if (promptError) throw promptError;

      if (prompts?.length) {
        // Get all prompt responses for these prompts AND the specific sharer
        const { data: filteredResponses, error: responseError } = await supabase
          .from('PromptResponse')
          .select('id') // Only need IDs to find attachments
          .in('promptId', prompts.map((p: { id: string }) => p.id))
          .eq('profileSharerId', sharerIdParam); // Filter by sharer ID from params

        if (responseError) throw responseError;

        if (filteredResponses?.length) {
          // Get all attachments for these responses, ensuring they belong to the correct sharer
          const { data: attachmentData, error: attachmentError } = await supabase
            .from('PromptResponseAttachment')
            .select(`
              *,
              PromptResponseAttachmentPersonTag (
                PersonTag (
                  id,
                  name,
                  relation,
                  profileSharerId
                )
              )
            `)
            .in('promptResponseId', filteredResponses.map((r: { id: string }) => r.id))
             // Double-check the attachment belongs to the target sharer (important for RLS/security)
            .eq('profileSharerId', sharerIdParam)
            .order('dateCaptured', { ascending: false, nullsFirst: false });

          if (attachmentError) throw attachmentError;
          console.log('[ExecutorTopicSummaryPage] Attachments found:', {
            responseIds: filteredResponses.map((r: { id: string }) => r.id),
            profileSharerId: sharerIdParam,
            attachmentCount: attachmentData?.length
          });

          // Get signed URLs
          const uiAttachments = await Promise.all(attachmentData?.map(async (att: PromptResponseAttachment) => {
            let signedUrl = null;
            if (att.fileUrl?.includes('attachments/')) { // Add null check for fileUrl
              const filePath = att.fileUrl.split('attachments/')[1];
              const { data: urlData, error: urlError } = await supabase.storage
                .from('attachments')
                .createSignedUrl(filePath, 3600); // 1 hour expiry

              if (urlError) {
                console.error(`[ExecutorTopicSummaryPage] Error creating signed URL for ${filePath}:`, urlError);
              } else {
                signedUrl = urlData?.signedUrl;
              }
            }
            return toUIAttachment({ ...att, signedUrl, displayUrl: att.fileUrl });
          }) ?? []);

          setAttachments(uiAttachments);
        } else {
           console.log('[ExecutorTopicSummaryPage] No prompt responses found for this topic/sharer, thus no attachments.');
           setAttachments([]); // Ensure attachments are cleared if no responses found
        }
      } else {
         console.log('[ExecutorTopicSummaryPage] No prompts found in this category, thus no attachments.');
         setAttachments([]); // Ensure attachments are cleared if no prompts found
      }

    } catch (error) {
      console.error('[ExecutorTopicSummaryPage] Error fetching data:', error);
      toast.error('Failed to load topic details.');
      // Consider setting isValidPage to false here too
    } finally {
      setIsLoading(false);
    }
  }, [sharerIdParam, topicIdParam, router]); // Add dependencies

  useEffect(() => {
    validateAndFetchData();
  }, [validateAndFetchData]); // Rerun validation and fetch if IDs change

  const handleDeleteVideo = async () => {
     // Ensure we use the validated IDs from state or params
    if (!topicIdParam || !targetSharerId) {
       console.error('[ExecutorTopicSummaryPage] Missing topicId or targetSharerId for delete.');
       toast.error('Cannot delete video: Missing information.');
       return;
    }
    if (!topicVideo || !topicVideo.id) {
       console.error('[ExecutorTopicSummaryPage] No video record found to delete.');
       toast.error('Cannot delete video: Video not found.');
       return;
    }

    const videoIdToDelete = topicVideo.id;
    const muxAssetIdToDelete = topicVideo.muxAssetId;

    const supabase = createClient();
    setIsDeleting(true);
    console.log(`[ExecutorTopicSummaryPage] Attempting to delete video ID: ${videoIdToDelete} (Mux Asset: ${muxAssetIdToDelete}) for Sharer: ${targetSharerId}`);

    try {
        // Get user again for potential permission checks in backend function/RLS
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated for delete');

        // --- Option 1: Call an RPC function (Recommended for complex logic/permissions) ---
        /*
        const { error: rpcError } = await supabase.rpc('delete_topic_video_as_executor', {
            p_video_id: videoIdToDelete,
            p_sharer_id: targetSharerId,
            // p_executor_id: user.id // Pass executor ID if needed by RPC
        });
        if (rpcError) throw rpcError;
        */

        // --- Option 2: Direct Deletion (Ensure RLS allows executor deletion) ---
        // This requires RLS on TopicVideo to allow DELETE by authorized executors.

        // 1. Delete Mux Asset via backend API route (safer than direct Mux client use here)
        // We need an API route like /api/mux/delete-asset
        if (muxAssetIdToDelete) {
            const deleteMuxResponse = await fetch('/api/mux/delete-asset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assetId: muxAssetIdToDelete })
            });
            if (!deleteMuxResponse.ok) {
                const errorData = await deleteMuxResponse.json();
                console.error('[ExecutorTopicSummaryPage] Failed to delete Mux asset via API:', errorData.error || deleteMuxResponse.statusText);
                // Decide if you want to proceed with DB deletion even if Mux fails
                // toast.warning("Could not delete video file, but removing record.");
            } else {
                 console.log(`[ExecutorTopicSummaryPage] Successfully requested Mux asset deletion for: ${muxAssetIdToDelete}`);
            }
        } else {
             console.warn(`[ExecutorTopicSummaryPage] No Mux Asset ID found for video ${videoIdToDelete}, skipping Mux deletion.`);
        }


        // 2. Delete the TopicVideo record from the database
        console.log(`[ExecutorTopicSummaryPage] Deleting TopicVideo record ID: ${videoIdToDelete} from database.`);
        const { error: dbError } = await supabase
            .from('TopicVideo')
            .delete()
            .eq('id', videoIdToDelete)
            // Add sharerId match for extra safety, though RLS should handle this
            .eq('profileSharerId', targetSharerId);

        if (dbError) {
            console.error('[ExecutorTopicSummaryPage] Error deleting video from database:', dbError);
            throw dbError; // Throw to trigger catch block
        }
        // --- End Option 2 ---


        console.log(`[ExecutorTopicSummaryPage] Successfully deleted video record: ${videoIdToDelete}`);
        toast.success('Topic video deleted successfully.');
        setTopicVideo(null); // Clear video state
        setShowVideoDeleteConfirm(false); // Close dialog

        // Optionally re-fetch data to ensure consistency, though clearing state might be sufficient
        // validateAndFetchData();

    } catch (error) {
        console.error('[ExecutorTopicSummaryPage] Error during video deletion:', error);
        toast.error(`Failed to delete video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
        setIsDeleting(false);
    }
};


  // --- Render Logic ---

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-5xl px-4 space-y-6 py-6">
        <div className="border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] rounded-lg p-6 text-center">
          <p>Loading Topic Summary...</p>
          {/* Add a spinner here */}
        </div>
      </div>
    );
  }

  if (isValidPage === false) {
     // Render an error state if params were invalid or access denied after loading
    return (
      <div className="container mx-auto max-w-5xl px-4 space-y-6 py-6">
         <div className="border-2 border-red-600 shadow-[6px_6px_0_0_#fecaca] rounded-lg p-6 text-center">
           <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
           <p className="text-red-600 font-semibold">Could not load page</p>
           <p className="text-sm text-gray-600">The requested topic summary could not be loaded. Please check the URL or your permissions.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/role-executor/${sharerIdParam}/topics`)} // Navigate back to the topics list for this sharer
              className="mt-4 rounded-full"
            >
              Back to Topics
            </Button>
         </div>
       </div>
    );
  }

  // Render page content if valid and loaded
  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      {/* Ensure sharerIdParam is valid before using in navigation */}
      {isValidUUID(sharerIdParam) && isValidUUID(topicIdParam) && (
        <button 
          onClick={() => router.push(`/role-executor/${sharerIdParam}/topics/${topicIdParam}`)}
          className="flex items-center gap-1 px-4 py-1 rounded-full text-black hover:bg-[#8fbc55] transition-all duration-300 mb-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Topic</span>
        </button>
      )}

      {/* Add the ExecutorSharerHeader below the back button */}
      <div className="mb-2">
          <ExecutorSharerHeader sharerProfile={sharerProfileData} />
      </div>

      {/* Pass targetSharerId (which is sharerIdParam) to the section */}
      <TopicVideoResponseSection
        topicId={topicIdParam}
        topicName={topicName}
        video={topicVideo}
        attachments={attachments}
        onVideoUpload={validateAndFetchData} // Re-fetch on upload
        userId={targetSharerId} // Pass the target sharer's ID
      />

      {/* Delete Section - Only show if video exists */}
      {topicVideo && (
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
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete topic video
            </Button>
          </div>
           <p className="text-xs text-gray-500 mt-1">Deleting the video will remove it permanently for the sharer.</p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showVideoDeleteConfirm} onOpenChange={setShowVideoDeleteConfirm}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Topic Video</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this topic video for the sharer? This action cannot be undone and will remove the video and any associated transcript.
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
                'Delete Video' // Clarify action button text
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// TODO:
// 1. Ensure an RPC function like `is_executor_for_sharer(p_executor_id uuid, p_sharer_id uuid)` exists and is secure.
// 2. Ensure RLS on `TopicVideo` allows DELETE by authorized executors OR implement the RPC deletion approach.
// 3. Create the `/api/mux/delete-asset` API route if using direct DB deletion approach.
// 4. Verify `TopicVideoResponseSection` correctly uses `userId` (as targetSharerId) and potentially the `isExecutorView` prop.

