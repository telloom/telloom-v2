// app/(authenticated)/role-listener/[id]/topics/[topicId]/topic-summary/page.tsx
// Displays the summary view for a specific topic for a specific sharer, from the listener\'s perspective.

'use client';

export const runtime = 'nodejs'; // Or 'edge' if preferred and compatible

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ListenerTopicVideoDisplay } from '@/components/listener/ListenerTopicVideoDisplay';
import { UIAttachment, toUIAttachment } from '@/types/component-interfaces';
import { PromptResponseAttachment } from '@/types/models';
import { ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { toast } from 'sonner';

// Helper function to validate UUID (optional but recommended)
const isValidUUID = (uuid: string): boolean => {
  if (!uuid) return false;
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return uuidRegex.test(uuid);
};

// Interface for the expected structure from get_listener_topic_prompts_and_responses RPC
interface ListenerTopicDetailsRpcResponse {
  id: string; // promptCategoryId
  category: string; // topicName
  description?: string;
  theme?: string;
  prompts: Array<{
    id: string; // promptId
    promptText: string;
    isContextEstablishing: boolean;
    sharerResponse?: {
      id: string; // promptResponseId
      videoId?: string;
      summary?: string;
      video_muxPlaybackId?: string;
      attachments: Array<PromptResponseAttachment & { PersonTags?: any[] }>; // Includes raw attachments
    };
  }>;
}

export default function ListenerTopicSummaryPage() {
  const params = useParams();
  const router = useRouter();

  const sharerIdParam = typeof params.id === 'string' ? params.id : ''; // This is ProfileSharer.id
  const topicIdParam = typeof params.topicId === 'string' ? params.topicId : '';

  const [isLoading, setIsLoading] = useState(true);
  const [topicVideo, setTopicVideo] = useState<any>(null); // Main video for the topic
  const [attachments, setAttachments] = useState<UIAttachment[]>([]);
  const [topicName, setTopicName] = useState('');
  const [targetSharerId, setTargetSharerId] = useState<string | null>(null); // This is sharerIdParam (ProfileSharer.id)
  const [isValidPage, setIsValidPage] = useState<boolean | null>(null);

  const validateAndFetchData = useCallback(async () => {
    console.log('[ListenerTopicSummaryPage V2] Validating params:', { sharerIdParam, topicIdParam });

    if (!isValidUUID(sharerIdParam) || !isValidUUID(topicIdParam)) {
      console.error('[ListenerTopicSummaryPage V2] Invalid UUID parameters.', { sharerIdParam, topicIdParam });
      toast.error('Invalid page URL.');
      setIsValidPage(false);
      setIsLoading(false);
      return;
    }

    console.log('[ListenerTopicSummaryPage V2] Params validated. Setting targetSharerId (ProfileSharer.id).');
    setTargetSharerId(sharerIdParam); // This is ProfileSharer.id
    setIsValidPage(true);

    const supabase = createClient();
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('[ListenerTopicSummaryPage V2] Authentication error:', userError);
        toast.error('Authentication failed. Please log in.');
        router.push('/login');
        return;
      }
      console.log(`[ListenerTopicSummaryPage V2] User ID: ${user.id}`);

      const { data: accessData, error: accessError } = await supabase.rpc(
        'check_listener_access',
        { p_sharer_id: sharerIdParam } // p_sharer_id is ProfileSharer.id
      );

      if (accessError) {
        console.error(`[ListenerTopicSummaryPage V2] Error verifying listener access for user ${user.id} and sharer ${sharerIdParam}:`, accessError);
        toast.error('Failed to verify your permissions to view this content.');
        setIsValidPage(false);
        setIsLoading(false);
        router.push('/select-role');
        return;
      }

      if (!accessData) {
        console.warn(`[ListenerTopicSummaryPage V2] Access Denied: User ${user.id} is not an approved listener for sharer ${sharerIdParam}.`);
        toast.error('You do not have permission to view this content.');
        setIsValidPage(false);
        setIsLoading(false);
        router.push('/select-role');
        return;
      }
      console.log(`[ListenerTopicSummaryPage V2] Listener access confirmed for user ${user.id} to sharer ${sharerIdParam}.`);

      // Fetch main TopicVideo for the topic summary
      console.log('[ListenerTopicSummaryPage V2] Fetching main TopicVideo for topicId:', topicIdParam, 'and profileSharerId:', sharerIdParam);
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
        .eq('profileSharerId', sharerIdParam) // This is ProfileSharer.id
        .maybeSingle();

      if (videoError) {
        console.error('[ListenerTopicSummaryPage V2] Error fetching main TopicVideo data:', videoError);
        // Not throwing, page might still work without a main video if attachments/text are main content
        toast.error('Could not load the main video for this topic.');
        setTopicVideo(null);
      } else {
        console.log('[ListenerTopicSummaryPage V2] Main TopicVideo data:', videoData);
        setTopicVideo(videoData);
      }

      // Get Sharer's Profile.id to use with the main RPC
      console.log(`[ListenerTopicSummaryPage V2] Fetching sharer's Profile.id for ProfileSharer.id: ${sharerIdParam}`);
      const { data: sharerProfileDotIdData, error: sharerProfileDotIdError } = await supabase.rpc(
        'get_profile_id_for_sharer',
        { p_sharer_id: sharerIdParam } // p_sharer_id is ProfileSharer.id
      );

      if (sharerProfileDotIdError || !sharerProfileDotIdData) {
        console.error(`[ListenerTopicSummaryPage V2] Error fetching sharer's Profile.id:`, sharerProfileDotIdError, 'Data:', sharerProfileDotIdData);
        toast.error("Could not retrieve essential sharer identification for loading topic details.");
        setIsValidPage(false);
        setIsLoading(false);
        return;
      }
      const actualSharerProfileDotId = sharerProfileDotIdData as string; // RPC returns just the UUID string
      console.log(`[ListenerTopicSummaryPage V2] Successfully fetched sharer's Profile.id: ${actualSharerProfileDotId}`);


      // Fetch topic details (name, prompts, responses, attachments) using RPC
      console.log(`[ListenerTopicSummaryPage V2] Fetching topic details via RPC 'get_listener_topic_prompts_and_responses' with topicId: ${topicIdParam}, sharerProfileId: ${actualSharerProfileDotId}, listenerId: ${user.id}`);
      const { data: topicDetailsRpc, error: topicDetailsError } = await supabase.rpc(
        'get_listener_topic_prompts_and_responses',
        {
          p_prompt_category_id: topicIdParam,
          p_sharer_profile_id: actualSharerProfileDotId, // This is Profile.id
          p_listener_profile_id: user.id
        }
      );

      if (topicDetailsError) {
        console.error('[ListenerTopicSummaryPage V2] Error fetching topic details via RPC:', topicDetailsError);
        toast.error('Failed to load topic content: ' + (topicDetailsError.message || 'Unknown RPC error'));
        setIsValidPage(false); // Or handle more gracefully, maybe allow page if video loaded
        setIsLoading(false);
        return;
      }
      
      const rpcData = topicDetailsRpc as ListenerTopicDetailsRpcResponse | null;
      console.log('[ListenerTopicSummaryPage V2] Raw RPC response for topic details:', rpcData);

      if (!rpcData || rpcData.id !== topicIdParam) { // Check if RPC returned data and for correct topic
        console.warn('[ListenerTopicSummaryPage V2] Topic details from RPC are null, empty, or for a different topicId. RPC Data:', rpcData);
        toast.error('Could not load topic content details.');
        setTopicName('Topic details unavailable');
        setAttachments([]);
      } else {
        setTopicName(rpcData.category || 'Unnamed Topic');
        console.log(`[ListenerTopicSummaryPage V2] Topic name set to: ${rpcData.category}`);

        const allRawAttachments: PromptResponseAttachment[] = [];
        if (rpcData.prompts && rpcData.prompts.length > 0) {
          rpcData.prompts.forEach(prompt => {
            if (prompt.sharerResponse && prompt.sharerResponse.attachments && prompt.sharerResponse.attachments.length > 0) {
              allRawAttachments.push(...prompt.sharerResponse.attachments);
            }
          });
        }
        console.log(`[ListenerTopicSummaryPage V2] Found ${allRawAttachments.length} raw attachments from RPC.`);

        if (allRawAttachments.length > 0) {
          const uiAttachments = await Promise.all(allRawAttachments.map(async (att) => {
            let signedUrl = null;
            let signError = null;
            // Ensure att.fileUrl is a string and correctly formatted for Supabase storage path
            const fullPath = att.fileUrl; // Assuming fileUrl from RPC is already bucket/path or just path
            
            // Check if fullPath looks like a storage path needing signing
            // This logic might need adjustment based on actual fileUrl format from RPC
            // Example: "public/attachments/user_id/file.jpg" or "attachments/user_id/file.jpg"
            // For now, we assume it's the path *within* the 'attachments' bucket.
            let filePathInBucket = '';
            if (typeof fullPath === 'string') {
                if (fullPath.startsWith('attachments/')) {
                    filePathInBucket = fullPath.substring('attachments/'.length);
                } else if (fullPath.includes('/attachments/')) { 
                    // If it includes bucket name like 'public/attachments/...'
                    filePathInBucket = fullPath.split('/attachments/')[1];
                } else {
                    // If it's already just the path in bucket or unhandled format
                    filePathInBucket = fullPath; 
                }
            }

            if (filePathInBucket) {
              try {
                console.log(`[ListenerTopicSummaryPage V2] Attempting to sign URL for path in bucket: ${filePathInBucket}`);
                const { data: urlData, error: urlError } = await supabase.storage
                  .from('attachments') // Assuming 'attachments' is the correct bucket name
                  .createSignedUrl(filePathInBucket, 3600); // 1 hour expiry
                if (urlError) {
                  signError = urlError;
                  console.error('[ListenerTopicSummaryPage V2] Error creating signed URL for attachment:', { filePathInBucket, error: urlError.message });
                } else {
                  signedUrl = urlData?.signedUrl || null;
                   console.log(`[ListenerTopicSummaryPage V2] Signed URL for ${filePathInBucket}: ${signedUrl ? 'OK' : 'Failed to get URL string'}`);
                }
              } catch (e: any) {
                signError = e;
                console.error('[ListenerTopicSummaryPage V2] Exception during signed URL creation:', { filePathInBucket, error: e.message });
              }
            } else {
                console.warn(`[ListenerTopicSummaryPage V2] fileUrl for attachment ID ${att.id} is invalid or missing for signing: ${fullPath}`);
            }

            if (signError) {
               console.warn(`[ListenerTopicSummaryPage V2] Failed to sign URL for attachment ID ${att.id}, path: ${fullPath}`);
            }
            // The toUIAttachment function expects 'signedUrl' and 'displayUrl'
            return toUIAttachment({ ...att, signedUrl: signedUrl, displayUrl: signedUrl || att.fileUrl });
          }));
          console.log(`[ListenerTopicSummaryPage V2] Setting attachments state with ${uiAttachments.length} processed attachments.`);
          setAttachments(uiAttachments);
        } else {
          console.log('[ListenerTopicSummaryPage V2] No attachments found in RPC response, setting attachments state to [].');
          setAttachments([]);
        }
      }

    } catch (error: any) {
      console.error('[ListenerTopicSummaryPage V2] Error fetching topic summary data:', error);
      toast.error('Failed to load topic summary: ' + (error.message || 'Unknown error'));
      setIsValidPage(false);
    } finally {
      setIsLoading(false);
      console.log('[ListenerTopicSummaryPage V2] Fetch data finished. Loading state:', false);
    }
  }, [sharerIdParam, topicIdParam, router]);

  useEffect(() => {
    console.log('[ListenerTopicSummaryPage V2] useEffect triggered. sharerIdParam:', sharerIdParam, 'topicIdParam:', topicIdParam);
    if (sharerIdParam && topicIdParam) {
      validateAndFetchData();
    } else if (params.id && params.topicId) {
        console.log('[ListenerTopicSummaryPage V2] Params just became available, re-validating.')
        validateAndFetchData();
    } else {
        console.log('[ListenerTopicSummaryPage V2] Params not yet available for initial fetch.');
    }
  }, [sharerIdParam, topicIdParam, validateAndFetchData, params.id, params.topicId]);

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
      </div>
    );
  }

  // Render invalid page state (e.g., bad UUIDs or failed access check before redirect)
  if (isValidPage === false && !isLoading) { // Check isValidPage is explicitly false
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-red-700 mb-2">Access Denied or Invalid Page</h1>
        <p className="text-gray-600 mb-6">
          There was an issue accessing this page. This could be due to an invalid URL or insufficient permissions.
        </p>
        <Button onClick={() => router.push('/select-role')} variant="outline">
          Go to Dashboard
        </Button>
      </div>
    );
  }
  
  // Render if targetSharerId is not set (should be caught by isLoading or isValidPage generally)
  if (!targetSharerId) {
    // This case should ideally be handled by the isValidPage check or initial loading.
    // If it occurs, it means params might not have been correctly processed.
    console.warn('[ListenerTopicSummaryPage V2] targetSharerId not set, rendering minimal error.');
     return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold text-yellow-700 mb-2">Page Not Ready</h1>
        <p className="text-gray-600 mb-6">
         The necessary information to display this page is missing. Please try again or contact support if the issue persists.
        </p>
        <Button onClick={() => router.back()} variant="outline" className="mr-2">
           <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
        <Button onClick={() => router.push('/select-role')} >
          Go to Dashboard
        </Button>
      </div>
    );
  }

  // Main component render
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
      {targetSharerId ? (
        <ListenerTopicVideoDisplay
          topicName={topicName}
          sharerId={targetSharerId}
          video={topicVideo}
          attachments={attachments}
        />
      ) : (
        <div className="text-center p-8">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-lg text-gray-700">Sharer information is not available.</p>
        </div>
      )}
    </div>
  );
}
