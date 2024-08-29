// app/videos/page.tsx
import React from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import VideoNavigation from '@/components/VideoNavigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function getVideos() {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching videos:', error);
    return [];
  }

  return data;
}

export default async function VideoListPage() {
  const videos = await getVideos();

  return (
    <div className="container mx-auto px-4 py-8">
      <VideoNavigation />
      <h1 className="text-3xl font-bold mb-6">Your Videos</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => (
          <Link href={`/videos/${video.id}`} key={video.id} className="block">
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <img 
                src={`https://image.mux.com/${video.mux_playback_id}/thumbnail.jpg?time=0`} 
                alt={`Thumbnail for video ${video.id}`}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h2 className="text-xl font-semibold mb-2">Video {video.id}</h2>
                <p className="text-gray-600">Created at: {new Date(video.created_at).toLocaleString()}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}