// app/(authenticated)/role-sharer/topics/[id]/topic-summary/page.tsx

'use client';

export const runtime = 'nodejs';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { TopicVideoResponseSection } from '@/components/TopicVideoResponseSection';
import { UIAttachment, toUIAttachment } from '@/types/component-interfaces';
import { PromptResponseAttachment } from '@/types/models';
import { ArrowLeft } from 'lucide-react';
import { getEffectiveSharerId } from '@/utils/supabase/role-helpers';

export default function TopicSummaryPage() {
  const params = useParams();
  const router = useRouter();
  const topicId = typeof params.id === 'string' ? params.id : '';

  const [isLoading, setIsLoading] = useState(true);
  const [topicVideo, setTopicVideo] = useState<any>(null);
  const [attachments, setAttachments] = useState<UIAttachment[]>([]);
  const [topicName, setTopicName] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

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

      // Check if user has SHARER or EXECUTOR role
      const { data: roles, error: rolesError } = await supabase
        .from('ProfileRole')
        .select('role')
        .eq('profileId', user.id);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        return;
      }

      const hasSharerOrExecutorRole = roles?.some(r => r.role === 'SHARER' || r.role === 'EXECUTOR');
      if (!hasSharerOrExecutorRole) {
        console.error('User does not have SHARER or EXECUTOR role');
        router.push('/select-role');
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
            .order('dateCaptured', { ascending: false, nullsLast: true });

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
    <div className="container mx-auto space-y-6 py-6">
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
    </div>
  );
}