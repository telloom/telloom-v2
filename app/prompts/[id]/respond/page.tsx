// app/prompts/[id]/respond/page.tsx

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';
import Header from '@/components/Header';
import MuxUploader from '@mux/mux-uploader-react';
import MuxPlayer from '@mux/mux-player-react';

// Define the Prompt interface
interface Prompt {
  id: string;
  prompt: string;
  prompt_type: string | null;
  context_establishing_question: string | null;
  airtable_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  category_airtable_id: string | null;
  object_prompt?: boolean | null; // Made optional
}

const RespondPage = () => {
  const { id: promptId } = useParams();
  const supabase = createClientComponentClient<Database>();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoPlaybackId, setVideoPlaybackId] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState<string>('waiting');

  // Fetch the prompt
  useEffect(() => {
    const fetchPrompt = async () => {
      const { data, error } = await supabase
        .from('prompts_primary')
        .select('*')
        .eq('id', promptId)
        .single();

      if (error) console.error('Error fetching prompt:', error);
      else setPrompt(data as unknown as Prompt);
    };

    fetchPrompt();
  }, [promptId, supabase]);

  // Create upload URL
  useEffect(() => {
    const createUploadUrl = async () => {
      const res = await fetch('/api/videos/upload-url', {
        method: 'POST',
        body: JSON.stringify({ prompt_id: promptId }),
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (res.ok) setUploadUrl(data.url);
      else console.error('Error creating upload URL:', data.error);
    };

    if (!uploadUrl) {
      createUploadUrl();
    }
  }, [uploadUrl, promptId]);

  // Handle upload success
  const handleUploadSuccess = (event: any) => {
    console.log('Upload complete:', event);
    setUploadSuccess(true);
    setVideoId(event.detail.upload.id);
  };

  // Poll for video status
  useEffect(() => {
    if (uploadSuccess && videoId) {
      const interval = setInterval(async () => {
        const { data, error } = await supabase
          .from('videos')
          .select('*')
          .eq('mux_upload_id', videoId)
          .single();

        if (error) {
          console.error('Error fetching video data:', error);
          return;
        }

        if (data) {
          setVideoStatus(data.status ?? 'waiting');

          if (data.status === 'ready') {
            setVideoPlaybackId(data.mux_playback_id);
            clearInterval(interval);
          }
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [uploadSuccess, supabase, videoId]);

  return (
    <div>
      <Header />
      {prompt ? (
        <div>
          <h1>{prompt.prompt}</h1>
          {prompt.context_establishing_question && (
            <p>{prompt.context_establishing_question}</p>
          )}
          {!uploadSuccess ? (
            uploadUrl ? (
              <MuxUploader
                endpoint={uploadUrl}
                onSuccess={handleUploadSuccess}
              />
            ) : (
              <p>Loading upload URL...</p>
            )
          ) : (
            <>
              {videoStatus === 'ready' ? (
                <MuxPlayer
                  playbackId={videoPlaybackId!}
                  style={{ width: '100%', maxWidth: '600px' }}
                />
              ) : (
                <p>Your video is being processed. Current status: {videoStatus}</p>
              )}
            </>
          )}
        </div>
      ) : (
        <p>Loading prompt...</p>
      )}
    </div>
  );
};

export default RespondPage;