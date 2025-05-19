// app/(authenticated)/role-listener/[id]/prompts/[promptId]/page.tsx
// Displays a specific prompt and its response for a listener.

'use client';

export const runtime = 'nodejs';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ListenerPromptResponseDisplay } from '@/components/listener/ListenerPromptResponseDisplay';
import { UIAttachment, toUIAttachment } from '@/types/component-interfaces';
import { ArrowLeft, AlertTriangle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatTopicNameForListener } from '@/utils/formatting';

const isValidUUID = (uuid: string): boolean => {
  if (!uuid) return false;
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return uuidRegex.test(uuid);
};

interface PromptResponseDetails {
  promptId: string;
  promptText: string;
  topicId: string;
  topicName: string;
  responseId: string | null;
  responseVideoId: string | null;
  responseVideoMuxPlaybackId: string | null;
  responseVideoMuxAssetId: string | null;
  responseDateRecorded: string | null;
  responseSummary: string | null;
  responseTranscriptId: string | null;
  responseTranscriptText: string | null;
  responseAttachments: any | null; // JSONB, will be parsed into UIAttachment[]
  navigablePromptIds?: string[] | null; // Added for navigation
  currentPromptIndex?: number | null;   // Added for navigation
}

export default function ListenerPromptResponsePage() {
  const params = useParams();
  const router = useRouter();

  const sharerProfileSharerId = typeof params.id === 'string' ? params.id : ''; // This is ProfileSharer.id from URL
  const promptIdFromParams = typeof params.promptId === 'string' ? params.promptId : '';

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promptDetails, setPromptDetails] = useState<PromptResponseDetails | null>(null);
  const [attachments, setAttachments] = useState<UIAttachment[]>([]);
  const [sharerProfileId, setSharerProfileId] = useState<string | null>(null); // Actual Profile.id of sharer

  const validateAndFetchData = useCallback(async (currentPromptId: string) => {
    console.log('[ListenerPromptResponsePage] Validating params:', { sharerProfileSharerId, currentPromptId });
    setIsLoading(true);
    setError(null);

    if (!isValidUUID(sharerProfileSharerId) || !isValidUUID(currentPromptId)) {
      console.error('[ListenerPromptResponsePage] Invalid UUID parameters.');
      toast.error('Invalid page URL.');
      setError('Invalid page URL.');
      setIsLoading(false);
      return;
    }

    const supabase = createClient();
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('[ListenerPromptResponsePage] Auth error:', userError);
        toast.error('Authentication failed.');
        router.push('/login');
        return;
      }

      // 1. Get Sharer's Profile.id from ProfileSharer.id (sharerProfileSharerId)
      if (!sharerProfileId) { // Fetch only if not already set
        console.log(`[ListenerPromptResponsePage] Fetching sharer's Profile.id for ProfileSharer.id: ${sharerProfileSharerId}`);
        const { data: profileIdData, error: profileIdError } = await supabase.rpc(
          'get_profile_id_for_sharer',
          { p_sharer_id: sharerProfileSharerId }
        );
        if (profileIdError || !profileIdData) {
          console.error('[ListenerPromptResponsePage] Error fetching sharer Profile.id:', profileIdError, profileIdData);
          toast.error('Could not identify the sharer.');
          setError('Could not identify the sharer.');
          setIsLoading(false);
          return;
        }
        setSharerProfileId(profileIdData as string);
        console.log(`[ListenerPromptResponsePage] Sharer Profile.id: ${profileIdData}`);
      }
      
      const actualSharerProfileId = sharerProfileId || (await supabase.rpc('get_profile_id_for_sharer', { p_sharer_id: sharerProfileSharerId })).data as string;
      if(!actualSharerProfileId){
        console.error('[ListenerPromptResponsePage] Failed to obtain actualSharerProfileId');
        toast.error('Sharer identification failed.');
        setError('Sharer identification failed.');
        setIsLoading(false);
        return;
      }

      // 2. Fetch prompt details using the RPC
      console.log(`[ListenerPromptResponsePage] Fetching prompt details via RPC with promptId: ${currentPromptId} sharerProfileId: ${actualSharerProfileId} listenerId: ${user.id}`);
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_listener_prompt_response_details',
        {
          p_prompt_id: currentPromptId,
          p_sharer_profile_id: actualSharerProfileId, // This is Profile.id
          p_listener_profile_id: user.id
        }
      );

      if (rpcError) {
        console.error('[ListenerPromptResponsePage] RPC error fetching prompt details:', rpcError);
        toast.error('Failed to load prompt details: ' + rpcError.message);
        setError('Failed to load prompt details: ' + rpcError.message);
        setPromptDetails(null);
      } else if (rpcData && rpcData.length > 0) {
        const details = rpcData[0] as PromptResponseDetails;
        console.log('[ListenerPromptResponsePage] RPC response for prompt details:', details);
        setPromptDetails(details);

        if (details.responseAttachments && Array.isArray(details.responseAttachments)) {
          const uiAttachments = await Promise.all(details.responseAttachments.map(async (att: any) => {
            let signedUrl = null;
            const fullPath = att.fileUrl; 
            let filePathInBucket = '';
            if (typeof fullPath === 'string') {
                if (fullPath.startsWith('attachments/')) {
                    filePathInBucket = fullPath.substring('attachments/'.length);
                } else if (fullPath.includes('/attachments/')) { 
                    filePathInBucket = fullPath.split('/attachments/')[1];
                } else {
                    filePathInBucket = fullPath; 
                }
            }
            if (filePathInBucket) {
              try {
                const { data: urlData, error: urlError } = await supabase.storage
                  .from('attachments')
                  .createSignedUrl(filePathInBucket, 3600);
                if (urlError) console.error('[ListenerPromptResponsePage] Error creating signed URL:', urlError.message);
                else signedUrl = urlData?.signedUrl || null;
              } catch (e: any) {
                console.error('[ListenerPromptResponsePage] Exception during signed URL creation:', e.message);
              }
            }
            return toUIAttachment({ ...att, signedUrl: signedUrl, displayUrl: signedUrl || att.fileUrl });
          }));
          setAttachments(uiAttachments);
        } else {
          setAttachments([]);
        }
      } else {
        console.log('[ListenerPromptResponsePage] No data returned from RPC for prompt details.');
        toast.message('No details found for this prompt.');
        setPromptDetails(null);
        setAttachments([]);
      }
    } catch (e: any) {
      console.error('[ListenerPromptResponsePage] General error in validateAndFetchData:', e);
      toast.error('An unexpected error occurred: ' + e.message);
      setError('An unexpected error occurred: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  }, [router, sharerProfileSharerId, sharerProfileId]); // Added sharerProfileId to dependencies

  useEffect(() => {
    if (promptIdFromParams) {
      validateAndFetchData(promptIdFromParams);
    }
  }, [promptIdFromParams, validateAndFetchData]);

  const handleNavigate = (newPromptId: string | undefined) => {
    if (newPromptId) {
      router.push(`/role-listener/${sharerProfileSharerId}/prompts/${newPromptId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !promptDetails) {
    return (
      <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-semibold text-red-700 mb-2">Error Loading Prompt</h2>
        <p className="text-gray-600 mb-6 text-center">{error || 'Could not load the prompt details. It might not exist or you may not have permission.'}</p>
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }
  
  const { navigablePromptIds, currentPromptIndex } = promptDetails;
  const canGoPrevious = typeof currentPromptIndex === 'number' && currentPromptIndex > 0 && navigablePromptIds && navigablePromptIds.length > 0;
  const canGoNext = typeof currentPromptIndex === 'number' && navigablePromptIds && currentPromptIndex < navigablePromptIds.length - 1;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
      <div className="flex justify-end items-center mb-6">
        <div className="flex space-x-2">
          <Button 
            onClick={() => handleNavigate(navigablePromptIds?.[currentPromptIndex! - 1])} 
            disabled={!canGoPrevious}
            variant="outline"
            size="sm"
            className="rounded-full"
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Previous
          </Button>
          <Button 
            onClick={() => handleNavigate(navigablePromptIds?.[currentPromptIndex! + 1])} 
            disabled={!canGoNext}
            variant="outline"
            size="sm"
            className="rounded-full"
          >
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <ListenerPromptResponseDisplay
        promptText={promptDetails.promptText}
        topicName={formatTopicNameForListener(promptDetails.topicName)}
        sharerId={sharerProfileSharerId}
        video={promptDetails.responseVideoMuxPlaybackId && promptDetails.responseVideoMuxAssetId ? {
          muxPlaybackId: promptDetails.responseVideoMuxPlaybackId,
          muxAssetId: promptDetails.responseVideoMuxAssetId,
          dateRecorded: promptDetails.responseDateRecorded,
        } : undefined}
        transcriptText={promptDetails.responseTranscriptText}
        summaryText={promptDetails.responseSummary}
        attachments={attachments}
      />
    </div>
  );
}
