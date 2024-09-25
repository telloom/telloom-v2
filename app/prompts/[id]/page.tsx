// app/prompts/[id]/respond/page.tsx
import React from 'react';
import { getPromptById } from '@/db/queries/prompts-primary-queries';
import VideoUploader from '@/components/VideoUploader';
import { createClient } from '@/utils/supabase/server';

export default async function PromptPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const [prompt] = await getPromptById(params.id);

  if (!prompt) {
    return <div>Prompt not found</div>;
  }

  return (
    <div>
      <h1>{prompt.prompt}</h1>
      {session ? (
        <VideoUploader promptId={prompt.id} userId={session.user.id} />
      ) : (
        <p>Please sign in to upload a video response.</p>
      )}
    </div>
  );
}