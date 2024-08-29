// app/videos/[id]/page.tsx
import React from 'react';
import { createClient } from '@supabase/supabase-js';
import VideoPlayer from '@/components/VideoPlayer';
import VideoNavigation from '@/components/VideoNavigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function getVideo(id: string) {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching video:', error);
    return null;
  }

  return data;
}

export default async function VideoPage({ params }: { params: { id: string } }) {
  const video = await getVideo(params.id);

  if (!video) {
    return <div className="container mx-auto px-4 py-8">Video not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <VideoNavigation />
      <h1 className="text-3xl font-bold mb-6">Video {video.id}</h1>
      <div className="aspect-w-16 aspect-h-9 mb-6">
        <VideoPlayer playbackId={video.mux_playback_id} />
      </div>
      <div className="bg-white shadow-md rounded-lg p-6">
        <p className="text-gray-600 mb-2">Created at: {new Date(video.created_at).toLocaleString()}</p>
        <p className="text-gray-600">Status: {video.status}</p>
      </div>
    </div>
  );
}