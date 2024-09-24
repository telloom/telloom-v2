import React from 'react';
import VideoPlayer from '@/components/VideoPlayer';
import { getPromptResponseById } from '@/db/queries/prompt_responses-queries';
import Header from '@/components/Header';
import MuxUploaderComponent from '@/components/MuxUploader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default async function PromptResponsePage({ params }: { params: { id: string } }) {
  const promptResponse = await getPromptResponseById(BigInt(params.id));

  if (!promptResponse) {
    return <div>Prompt response not found.</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="flex-grow container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>{promptResponse.prompt?.prompt || 'No prompt available'}</CardTitle>
          </CardHeader>
          <CardContent>
            <VideoPlayer playbackId={promptResponse.video?.muxPlaybackId} />
          </CardContent>
        </Card>

        {/* Mux Uploader */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Your Response</CardTitle>
            </CardHeader>
            <CardContent>
              <MuxUploaderComponent promptId={params.id} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}