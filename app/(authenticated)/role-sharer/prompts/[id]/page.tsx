// app/(authenticated)/role-sharer/prompts/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import { VideoResponseSection } from '@/components/prompt-response-section/video-response-section';
import { GetPromptDataResult, GetPromptDataError, Prompt } from '@/types/models';
import { getEffectiveSharerId } from '@/utils/supabase/role-helpers';

async function getPromptData(promptId: string): Promise<GetPromptDataResult | GetPromptDataError> {
  console.log('getPromptData: Starting to fetch data for prompt ID:', promptId);
  
  const supabase = createClient();

  // Verify authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.log('getPromptData: Authentication error:', userError);
    return { error: 'Unauthorized' };
  }

  // Get user roles with role validation
  const { data: userRoles, error: rolesError } = await supabase
    .from('ProfileRole')
    .select('role')
    .eq('profileId', user.id);

  if (rolesError || !userRoles?.some(({ role }: { role: string }) => role === 'SHARER' || role === 'EXECUTOR' || role === 'ADMIN')) {
    console.log('getPromptData: Role validation error:', rolesError);
    return { error: 'Unauthorized' };
  }

  // Get effective sharer ID (either the user's own sharer ID or the sharer ID they're executing for)
  const effectiveSharerId = await getEffectiveSharerId(user.id, supabase);
  if (!effectiveSharerId) {
    console.log('getPromptData: Effective sharer ID not found');
    return { error: 'Profile not found' };
  }

  // Fetch prompt data with all related data
  const { data: prompt, error: promptError } = await supabase
    .from('Prompt')
    .select(`
      id,
      promptText,
      promptType,
      isContextEstablishing,
      promptCategoryId,
      PromptCategory (
        id,
        category
      ),
      PromptResponse (
        id,
        profileSharerId,
        summary,
        createdAt,
        Video!videoId (
          id,
          muxPlaybackId,
          muxAssetId,
          dateRecorded,
          VideoTranscript (
            id,
            transcript
          )
        ),
        PromptResponseAttachment (
          id,
          fileUrl,
          fileType,
          fileName,
          description,
          dateCaptured,
          yearCaptured
        )
      )
    `)
    .eq('id', promptId)
    .single();

  if (promptError) {
    console.error('getPromptData: Error fetching prompt:', promptError);
    return { error: 'Prompt not found' };
  }

  console.log('getPromptData: Fetched prompt:', {
    id: prompt.id,
    promptText: prompt.promptText,
    promptType: prompt.promptType,
    promptCategoryId: prompt.promptCategoryId,
    responseCount: prompt.PromptResponse?.length || 0,
    attachmentCount: prompt.PromptResponse?.reduce((acc: number, r: { PromptResponseAttachment?: any[] }) => acc + (r.PromptResponseAttachment?.length || 0), 0) || 0,
    attachments: prompt.PromptResponse?.map((r: { PromptResponseAttachment?: any[] }) => r.PromptResponseAttachment?.map((a: { id: string; fileUrl: string; fileType: string; fileName: string; description?: string; dateCaptured?: string; yearCaptured?: number; signedUrl?: string }) => ({
      id: a.id,
      fileUrl: a.fileUrl,
      fileType: a.fileType,
      fileName: a.fileName,
      description: a.description,
      dateCaptured: a.dateCaptured,
      yearCaptured: a.yearCaptured,
      signedUrl: a.signedUrl
    })))
  });

  // Fetch sibling prompts
  const { data: siblingPrompts, error: siblingError } = await supabase
    .from('Prompt')
    .select('id, promptText, isContextEstablishing')
    .eq('promptCategoryId', prompt.promptCategoryId)
    .order('isContextEstablishing', { ascending: false })
    .order('id');

  if (siblingError) {
    console.error('Error fetching sibling prompts:', siblingError);
    return { 
      prompt: prompt as unknown as Prompt, 
      profileSharer: { id: effectiveSharerId } 
    };
  }

  // Find current prompt index and get previous/next
  const currentIndex = siblingPrompts.findIndex((p: { id: string }) => p.id === promptId);
  const previousPrompt = currentIndex > 0 ? siblingPrompts[currentIndex - 1] : null;
  const nextPrompt = currentIndex < siblingPrompts.length - 1 ? siblingPrompts[currentIndex + 1] : null;

  return { 
    prompt: prompt as unknown as Prompt, 
    profileSharer: { id: effectiveSharerId },
    siblingPrompts: {
      previousPrompt,
      nextPrompt
    }
  };
}

export default function PromptPage() {
  const router = useRouter();
  const params = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promptData, setPromptData] = useState<GetPromptDataResult | null>(null);

  useEffect(() => {
    async function fetchData() {
      console.log('PromptPage: Starting fetchData with params:', params);
      
      if (!params?.id || typeof params.id !== 'string') {
        console.log('PromptPage: Invalid params, redirecting to topics');
        router.push('/role-sharer/topics');
        return;
      }

      try {
        console.log('PromptPage: Fetching prompt data for ID:', params.id);
        const result = await getPromptData(params.id);
        
        if ('error' in result) {
          console.log('PromptPage: Error in result:', result.error);
          if (result.error === 'redirect' && 'redirectTo' in result) {
            router.push(`/role-sharer/prompts/${result.redirectTo}`);
            return;
          }
          setError(result.error || 'Unknown error');
          return;
        }

        setPromptData(result);
      } catch (err) {
        console.error('PromptPage: Error fetching prompt:', err);
        setError('Failed to load prompt');
      } finally {
        setIsLoading(false);
      }
    }

    void fetchData();
  }, [params, router]);

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <div className="border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55] transition-all duration-300 rounded-lg p-6">
          <p>Loading Prompt Response...</p>
        </div>
      </div>
    );
  }

  if (error || !promptData) {
    return notFound();
  }

  const { prompt, profileSharer } = promptData;

  // Get the user's response if it exists
  const userResponse = prompt.PromptResponse?.find(
    response => response.profileSharerId === profileSharer.id
  );

  // Log the raw user response data
  console.log('Raw user response:', {
    id: userResponse?.id,
    hasVideo: !!userResponse?.Video,
    attachmentCount: userResponse?.PromptResponseAttachment?.length || 0,
    rawAttachments: userResponse?.PromptResponseAttachment
  });

  // Transform the response to match the VideoResponseSection props
  console.log('Starting response transformation:', {
    userResponseId: userResponse?.id,
    hasVideo: !!userResponse?.Video,
    attachmentCount: userResponse?.PromptResponseAttachment?.length || 0
  });

  const transformedResponse = userResponse ? {
    id: userResponse.id,
    profileSharerId: userResponse.profileSharerId,
    summary: userResponse.summary || null,
    responseNotes: null,
    dateRecorded: null,
    video: userResponse.Video ? {
      id: userResponse.Video.id,
      muxPlaybackId: userResponse.Video.muxPlaybackId,
      muxAssetId: userResponse.Video.muxAssetId,
      dateRecorded: userResponse.Video.dateRecorded,
      VideoTranscript: userResponse.Video.VideoTranscript
    } : undefined,
    PromptResponseAttachment: userResponse.PromptResponseAttachment?.map(attachment => ({
      id: attachment.id,
      promptResponseId: userResponse.id,
      profileSharerId: userResponse.profileSharerId,
      fileUrl: attachment.fileUrl,
      fileType: attachment.fileType,
      fileName: attachment.fileName,
      fileSize: null,
      title: null,
      description: attachment.description || null,
      estimatedYear: null,
      uploadedAt: new Date().toISOString(),
      dateCaptured: attachment.dateCaptured || null,
      yearCaptured: attachment.yearCaptured || null,
      PromptResponseAttachmentPersonTag: []
    }))
  } : undefined;

  console.log('Final transformed response:', {
    id: transformedResponse?.id,
    hasVideo: !!transformedResponse?.video,
    attachmentCount: transformedResponse?.PromptResponseAttachment?.length || 0,
    attachments: transformedResponse?.PromptResponseAttachment
  });

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="ghost" 
            onClick={() => router.push(`/role-sharer/topics/${prompt.promptCategoryId}`)}
            className="-ml-2 text-gray-600 hover:text-gray-900 rounded-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Topic
          </Button>
          <div className="flex gap-2">
            {promptData?.siblingPrompts?.previousPrompt && (
              <Button
                variant="outline"
                onClick={() => router.push(`/role-sharer/prompts/${promptData?.siblingPrompts?.previousPrompt?.id}`)}
                className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous Prompt
              </Button>
            )}
            {promptData?.siblingPrompts?.nextPrompt && (
              <Button
                variant="outline"
                onClick={() => router.push(`/role-sharer/prompts/${promptData?.siblingPrompts?.nextPrompt?.id}`)}
                className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55] rounded-full"
              >
                Next Prompt
                <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
              </Button>
            )}
          </div>
        </div>
        <Card className="border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55]">
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4">
              <CardTitle className="text-xl">{prompt.promptText}</CardTitle>
              {prompt.PromptCategory?.category && (
                <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm whitespace-nowrap flex-shrink-0 flex items-center justify-center">
                  {prompt.PromptCategory.category}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <VideoResponseSection 
              promptId={prompt.id}
              promptText={prompt.promptText}
              promptCategory={prompt.PromptCategory?.category || ""}
              response={transformedResponse}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}