import React from 'react';
import VideoPlayer from '@/components/VideoPlayer';
import { getPromptResponseById } from '@/db/queries/prompt_responses-queries';

export default async function PromptResponsePage({ params }: { params: { id: string } }) {
  const promptResponse = await getPromptResponseById(BigInt(params.id));

  if (!promptResponse) {
    return <div>Prompt response not found.</div>;
  }

  return (
    <div>
      <h1>{promptResponse.prompt?.prompt || 'No prompt available'}</h1>
      <VideoPlayer playbackId={promptResponse.video?.muxPlaybackId} />
      {/* Add any additional information you want to display */}
    </div>
  );
}