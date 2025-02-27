import { Suspense } from 'react';
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import VideoResponseSection from './video-response-section';
import BackButton from '@/components/BackButton';
import PromptActions from './prompt-actions';
import { GetPromptDataResult, Prompt } from '@/types/models';

interface Props {
  params: {
    id: string; // sharer id
    promptId: string; // prompt id
  };
}

async function getPromptData(promptId: string, sharerId: string): Promise<GetPromptDataResult | null> {
  const supabase = createClient();

  // Get the prompt and its category
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
        responseNotes,
        Video (
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
    return null;
  }

  // Get sibling prompts (previous and next)
  const { data: siblingPrompts, error: siblingError } = await supabase
    .from('Prompt')
    .select('id, promptText')
    .eq('promptCategoryId', prompt.promptCategoryId)
    .order('id');

  if (siblingError) {
    console.error('Error fetching sibling prompts:', siblingError);
    return null;
  }

  // Find the indices for navigation
  const currentIndex = siblingPrompts.findIndex(p => p.id === promptId);
  const previousPrompt = currentIndex > 0 ? siblingPrompts[currentIndex - 1] : null;
  const nextPrompt = currentIndex < siblingPrompts.length - 1 ? siblingPrompts[currentIndex + 1] : null;

  return {
    prompt,
    profileSharer: { id: sharerId },
    siblingPrompts: {
      previousPrompt,
      nextPrompt
    }
  };
}

export default async function SharerExecutorPromptPage({ params }: Props) {
  try {
    // Resolve params before using them
    const resolvedParams = await Promise.resolve(params);
    const { id: sharerId, promptId } = resolvedParams;

    const supabase = createClient();

    // Verify executor relationship
    const { data: executorRelationship, error: relationshipError } = await supabase
      .from('ProfileExecutor')
      .select('id, sharerId')
      .eq('sharerId', sharerId)
      .single();

    if (relationshipError || !executorRelationship) {
      console.error('Invalid executor relationship:', relationshipError);
      notFound();
    }

    // Get prompt data
    const promptData = await getPromptData(promptId, sharerId);
    if (!promptData) {
      notFound();
    }

    return (
      <div className="container mx-auto py-8 space-y-8">
        <div>
          <BackButton 
            href={`/role-executor/${sharerId}/prompts`} 
            label="Back to Prompts" 
          />
        </div>

        <Card className="border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55]">
          <CardHeader>
            <CardTitle>{promptData.prompt.promptText}</CardTitle>
            {promptData.prompt.isContextEstablishing && (
              <div className="text-sm text-muted-foreground">
                This is a context-establishing prompt to help set the stage for this topic.
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>Loading video response section...</div>}>
              <VideoResponseSection
                promptId={promptId}
                promptText={promptData.prompt.promptText}
                promptCategory={promptData.prompt.PromptCategory?.category || ''}
                response={promptData.prompt.PromptResponse?.[0]}
              />
            </Suspense>
          </CardContent>
        </Card>

        <PromptActions
          currentPromptId={promptId}
          previousPrompt={promptData.siblingPrompts?.previousPrompt}
          nextPrompt={promptData.siblingPrompts?.nextPrompt}
          sharerId={sharerId}
        />
      </div>
    );
  } catch (error) {
    console.error('Error in SharerExecutorPromptPage:', error);
    notFound();
  }
} 