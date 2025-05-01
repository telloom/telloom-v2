// app/(authenticated)/role-sharer/topics/[id]/topic-summary/page.tsx

'use client';

export const runtime = 'nodejs';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { TopicVideoResponseSection } from '@/components/TopicVideoResponseSection';
import { UIAttachment, toUIAttachment } from '@/types/component-interfaces';
import { PromptResponseAttachment } from '@/types/models';
import { ArrowLeft, AlertTriangle, Trash2 } from 'lucide-react';
import { getEffectiveSharerId } from '@/utils/supabase/role-helpers';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function TopicSummaryPage() {
  const params = useParams();
  const router = useRouter();
  const topicId = typeof params.id === 'string' ? params.id : '';

  const [isLoading, setIsLoading] = useState(true);
  const [topicVideo, setTopicVideo] = useState<any>(null);
  const [attachments, setAttachments] = useState<UIAttachment[]>([]);
  const [topicName, setTopicName] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [showVideoDeleteConfirm, setShowVideoDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Function to fetch all data
  const fetchData = async () => {
    if (!topicId) return;
    
    const supabase = createClient();
    try {
      // First get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user?.id) {
        console.error('No user found');
        return;
      }

      // Check if user has SHARER or EXECUTOR role directly from JWT metadata
      const rolesFromJwt = user?.app_metadata?.roles || [];
      console.log('[TopicSummaryPage] Roles from JWT:', rolesFromJwt);

      const hasSharerOrExecutorRole = rolesFromJwt.includes('SHARER') || rolesFromJwt.includes('EXECUTOR');

      if (!hasSharerOrExecutorRole) {
        console.error('[TopicSummaryPage] User does not have SHARER or EXECUTOR role based on JWT');
        router.push('/select-role'); // Or handle appropriately
        return;
      }

      // Get the effective sharer ID using the helper function
      const effectiveSharerId = await getEffectiveSharerId(user.id, supabase);
      if (!effectiveSharerId) {
        console.error('No effective sharer ID found for user:', user.id);
        router.push('/select-role');
        return;
      }

      console.log('Effective sharer ID found:', effectiveSharerId);
      setUserId(effectiveSharerId);

      // Fetch topic name
      const { data: topicData, error: topicError } = await supabase
        .from('PromptCategory')
        .select('category')
        .eq('id', topicId)
        .single();

      if (topicError) throw topicError;
      setTopicName(topicData?.category || '');

      // First get the video with detailed logging
      console.log('Fetching video for topicId:', topicId, 'and profileSharerId:', effectiveSharerId);
      
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
        .eq('promptCategoryId', topicId)
        .eq('profileSharerId', effectiveSharerId)
        .maybeSingle();

      if (videoError) {
        console.error('Error fetching video:', videoError);
        throw videoError;
      }
      
      console.log('Raw video data:', videoData);
      
      if (videoData) {
        console.log('Video found:', {
          id: videoData.id,
          muxPlaybackId: videoData.muxPlaybackId,
          status: videoData.status,
          transcriptCount: videoData.TopicVideoTranscript?.length,
          transcripts: videoData.TopicVideoTranscript
        });

        // If we have a video but no transcript in the join, try querying the transcript table directly
        // with debug info about the relationships
        if (!videoData.TopicVideoTranscript || videoData.TopicVideoTranscript.length === 0) {
          console.log('No transcript in join query, checking transcript table directly');
          const { data: transcriptData, error: transcriptError } = await supabase
            .from('TopicVideoTranscript')
            .select(`
              id,
              topicVideoId,
              transcript,
              createdAt,
              TopicVideo (
                id,
                profileSharerId,
                ProfileSharer (
                  id,
                  profileId
                )
              )
            `)
            .eq('topicVideoId', videoData.id);
            
          if (transcriptError) {
            console.error('Error checking transcripts directly:', transcriptError);
          } else {
            console.log('Direct transcript check results:', transcriptData);
          }
        }
      } else {
        console.log('No video found for topic');
      }

      setTopicVideo(videoData);

      // Fetch all prompts in this category
      const { data: prompts, error: promptError } = await supabase
        .from('Prompt')
        .select('id')
        .eq('promptCategoryId', topicId);

      console.log('Prompts found:', prompts);
      if (promptError) throw promptError;

      if (prompts?.length) {
        // Get all prompt responses for these prompts with more details
        const { data: responses, error: responseError } = await supabase
          .from('PromptResponse')
          .select(`
            id,
            promptId,
            profileSharerId,
            createdAt
          `)
          .in('promptId', prompts.map((p: { id: string }) => p.id));

        console.log('All responses for prompts:', {
          promptIds: prompts.map((p: { id: string }) => p.id),
          responses,
          responseError
        });

        // Now try with the profile sharer filter
        const { data: filteredResponses } = await supabase
          .from('PromptResponse')
          .select(`
            id,
            promptId,
            profileSharerId,
            createdAt
          `)
          .in('promptId', prompts.map((p: { id: string }) => p.id))
          .eq('profileSharerId', effectiveSharerId);

        console.log('Filtered responses:', {
          profileSharerId: effectiveSharerId,
          filteredResponses
        });

        if (responseError) throw responseError;

        if (filteredResponses?.length) {
          // Get all attachments for these responses
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
            .eq('profileSharerId', effectiveSharerId)
            .order('dateCaptured', { ascending: false, nullsFirst: false });

          console.log('Attachments found:', {
            responseIds: filteredResponses.map((r: { id: string }) => r.id),
            profileSharerId: effectiveSharerId,
            attachmentCount: attachmentData?.length,
            attachmentData,
            attachmentError
          });

          if (attachmentError) throw attachmentError;

          // Get signed URLs for all attachments
          const uiAttachments = await Promise.all(attachmentData?.map(async (att: PromptResponseAttachment) => {
            // Get signed URL for the attachment
            let signedUrl = null;
            if (att.fileUrl.includes('attachments/')) {
              const filePath = att.fileUrl.split('attachments/')[1];
              const { data: { signedUrl: url } } = await supabase.storage
                .from('attachments')
                .createSignedUrl(filePath, 3600);
              signedUrl = url;
            }

            // Transform to UIAttachment
            const transformed = toUIAttachment({
              ...att,
              signedUrl,
              displayUrl: att.fileUrl // Use fileUrl as displayUrl
            });

            console.log('Transformed attachment:', { original: att, transformed });
            return transformed;
          }) ?? []);
          
          setAttachments(uiAttachments);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [topicId]);

  const handleDeleteVideo = async () => {
    if (!topicId) return;
    
    const supabase = createClient();
    try {
      setIsDeleting(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user?.id) {
        console.error('No user found');
        return;
      }

      // Delete the video from Supabase storage
      const { data: videoData, error: videoError } = await supabase
        .from('TopicVideo')
        .delete()
        .eq('id', topicId);

      if (videoError) {
        console.error('Error deleting video:', videoError);
        throw videoError;
      }

      // Delete the video from the database
      const { error: dbError } = await supabase
        .from('TopicVideo')
        .delete()
        .eq('id', topicId);

      if (dbError) {
        console.error('Error deleting video from database:', dbError);
        throw dbError;
      }

      // Fetch the updated topic video
      const { data: updatedVideoData, error: updatedVideoError } = await supabase
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
        .eq('promptCategoryId', topicId)
        .eq('profileSharerId', user.id)
        .maybeSingle();

      if (updatedVideoError) {
        console.error('Error fetching updated video:', updatedVideoError);
        throw updatedVideoError;
      }

      setTopicVideo(updatedVideoData);

      // Fetch all prompts in this category
      const { data: prompts, error: promptError } = await supabase
        .from('Prompt')
        .select('id')
        .eq('promptCategoryId', topicId);

      console.log('Prompts found:', prompts);
      if (promptError) throw promptError;

      if (prompts?.length) {
        // Get all prompt responses for these prompts with more details
        const { data: responses, error: responseError } = await supabase
          .from('PromptResponse')
          .select(`
            id,
            promptId,
            profileSharerId,
            createdAt
          `)
          .in('promptId', prompts.map((p: { id: string }) => p.id));

        console.log('All responses for prompts:', {
          promptIds: prompts.map((p: { id: string }) => p.id),
          responses,
          responseError
        });

        // Now try with the profile sharer filter
        const { data: filteredResponses } = await supabase
          .from('PromptResponse')
          .select(`
            id,
            promptId,
            profileSharerId,
            createdAt
          `)
          .in('promptId', prompts.map((p: { id: string }) => p.id))
          .eq('profileSharerId', user.id);

        console.log('Filtered responses:', {
          profileSharerId: user.id,
          filteredResponses
        });

        if (responseError) throw responseError;

        if (filteredResponses?.length) {
          // Get all attachments for these responses
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
            .eq('profileSharerId', user.id)
            .order('dateCaptured', { ascending: false, nullsFirst: false });

          console.log('Attachments found:', {
            responseIds: filteredResponses.map((r: { id: string }) => r.id),
            profileSharerId: user.id,
            attachmentCount: attachmentData?.length,
            attachmentData,
            attachmentError
          });

          if (attachmentError) throw attachmentError;

          // Get signed URLs for all attachments
          const uiAttachments = await Promise.all(attachmentData?.map(async (att: PromptResponseAttachment) => {
            // Get signed URL for the attachment
            let signedUrl = null;
            if (att.fileUrl.includes('attachments/')) {
              const filePath = att.fileUrl.split('attachments/')[1];
              const { data: { signedUrl: url } } = await supabase.storage
                .from('attachments')
                .createSignedUrl(filePath, 3600);
              signedUrl = url;
            }

            // Transform to UIAttachment
            const transformed = toUIAttachment({
              ...att,
              signedUrl,
              displayUrl: att.fileUrl // Use fileUrl as displayUrl
            });

            console.log('Transformed attachment:', { original: att, transformed });
            return transformed;
          }) ?? []);
          
          setAttachments(uiAttachments);
        }
      }
    } catch (error) {
      console.error('Error deleting video:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <div className="border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55] transition-all duration-300 rounded-lg p-6">
          <p>Loading Topic Summary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 space-y-6 py-6">
      <button 
        onClick={() => router.push(`/role-sharer/topics/${topicId}`)}
        className="flex items-center gap-1 px-4 py-1 rounded-full text-black hover:bg-[#8fbc55] transition-all duration-300"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Topic</span>
      </button>
      <TopicVideoResponseSection
        topicId={topicId}
        topicName={topicName}
        video={topicVideo}
        attachments={attachments}
        onVideoUpload={fetchData}
        userId={userId}
      />

      {/* Conditionally render Delete Video Section outside the Card */}
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
              onClick={() => setShowVideoDeleteConfirm(true)} // Need to manage this state in the page now
              className="bg-white hover:bg-red-50 hover:text-red-600 text-red-600 rounded-full border border-red-200"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete topic video
            </Button>
          </div>
        </div>
      )}

      {/* Need to also move the Delete Confirmation Dialog state and logic here */}
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
              disabled={isDeleting} // Need this state too
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteVideo} // Need this handler too
              className="rounded-full bg-red-600 hover:bg-red-700 transition-colors duration-200"
              disabled={isDeleting} // Need this state too
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