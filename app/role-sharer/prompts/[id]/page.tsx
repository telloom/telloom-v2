'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import { VideoResponseSection } from './video-response-section';

interface PageProps {
  params: { id: string }
}

interface Video {
  id: string;
  muxPlaybackId: string;
  muxAssetId: string;
  VideoTranscript: Array<{
    id: string;
    transcript: string;
  }>;
}

interface PromptResponse {
  id: string;
  profileSharerId: string;
  summary: string | null;
  createdAt: string;
  Video: Video | null;
  PromptResponseAttachment: Array<{
    id: string;
    fileUrl: string;
    fileType: string;
    fileName: string;
    description?: string | null;
    dateCaptured?: string | null;
    yearCaptured?: number | null;
  }>;
}

interface Prompt {
  id: string;
  promptText: string;
  promptType: string;
  isContextEstablishing: boolean;
  promptCategoryId: string;
  PromptCategory?: {
    id: string;
    category: string;
  };
  PromptResponse: PromptResponse[];
}

interface GetPromptDataResult {
  prompt: Prompt;
  profileSharer: { id: string };
  siblingPrompts?: {
    previousPrompt?: { id: string; promptText: string } | null;
    nextPrompt?: { id: string; promptText: string } | null;
  };
}

interface GetPromptDataError {
  error: string;
  redirectTo?: string;
}

async function getPromptData(promptId: string) {
  const supabase = createClient();

  // Verify authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'Unauthorized' };
  }

  // Get ProfileSharer record with role validation
  const { data: userRoles, error: rolesError } = await supabase
    .from('ProfileRole')
    .select('role')
    .eq('profileId', user.id);

  if (rolesError || !userRoles?.some(({ role }) => role === 'SHARER' || role === 'ADMIN')) {
    return { error: 'Unauthorized' };
  }

  // Get ProfileSharer record
  const { data: profileSharer, error: sharerError } = await supabase
    .from('ProfileSharer')
    .select('id')
    .eq('profileId', user.id)
    .single();

  if (sharerError || !profileSharer) {
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
    console.error('Error fetching prompt:', promptError);
    return { error: 'Prompt not found' };
  }

  console.log('Fetched prompt:', prompt); // Add logging to debug

  // Fetch sibling prompts
  const { data: siblingPrompts, error: siblingError } = await supabase
    .from('Prompt')
    .select('id, promptText, isContextEstablishing')
    .eq('promptCategoryId', prompt.promptCategoryId)
    .order('isContextEstablishing', { ascending: false })
    .order('id');

  if (siblingError) {
    console.error('Error fetching sibling prompts:', siblingError);
    return { prompt: prompt as unknown as Prompt, profileSharer };
  }

  // Find current prompt index and get previous/next
  const currentIndex = siblingPrompts.findIndex(p => p.id === promptId);
  const previousPrompt = currentIndex > 0 ? siblingPrompts[currentIndex - 1] : null;
  const nextPrompt = currentIndex < siblingPrompts.length - 1 ? siblingPrompts[currentIndex + 1] : null;

  return { 
    prompt: prompt as unknown as Prompt, 
    profileSharer,
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
      if (!params?.id || typeof params.id !== 'string') {
        router.push('/role-sharer/topics');
        return;
      }

      try {
        const result = await getPromptData(params.id);
        
        if ('error' in result) {
          if (result.error === 'redirect' && 'redirectTo' in result) {
            router.push(`/role-sharer/prompts/${result.redirectTo}`);
            return;
          }
          setError(result.error || 'Unknown error');
          return;
        }

        setPromptData(result);
      } catch (err) {
        console.error('Error fetching prompt:', err);
        setError('Failed to load prompt');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [params?.id, router]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card className="p-6 border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55]">
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please wait while we load your prompt...</p>
          </CardContent>
        </Card>
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

  // Transform the response to match the VideoResponseSection props
  const transformedResponse = userResponse ? {
    id: userResponse.id,
    summary: userResponse.summary || undefined,
    video: userResponse.Video ? {
      id: userResponse.Video.id,
      muxPlaybackId: userResponse.Video.muxPlaybackId,
      VideoTranscript: userResponse.Video.VideoTranscript || undefined
    } : undefined,
    PromptResponseAttachment: userResponse.PromptResponseAttachment?.map(attachment => ({
      ...attachment,
      description: attachment.description || undefined,
      dateCaptured: attachment.dateCaptured || undefined,
      yearCaptured: attachment.yearCaptured || undefined
    }))
  } : null;

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="ghost" 
            onClick={() => router.push(`/role-sharer/topics/${prompt.promptCategoryId}`)}
            className="-ml-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Topic
          </Button>
          <div className="flex gap-2">
            {promptData?.siblingPrompts?.previousPrompt && (
              <Button
                variant="outline"
                onClick={() => router.push(`/role-sharer/prompts/${promptData?.siblingPrompts?.previousPrompt?.id}`)}
                className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55]"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous Prompt
              </Button>
            )}
            {promptData?.siblingPrompts?.nextPrompt && (
              <Button
                variant="outline"
                onClick={() => router.push(`/role-sharer/prompts/${promptData?.siblingPrompts?.nextPrompt?.id}`)}
                className="border-[#1B4332] text-[#1B4332] hover:bg-[#8fbc55]"
              >
                Next Prompt
                <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
              </Button>
            )}
          </div>
        </div>
        <Card className="border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{prompt.promptText}</CardTitle>
              {prompt.isContextEstablishing && (
                <div className="px-3 py-1 text-sm font-medium bg-[#8fbc55] text-[#1B4332] rounded-full">
                  Start Here
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <VideoResponseSection 
              promptId={prompt.id}
              promptCategoryId={prompt.promptCategoryId}
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