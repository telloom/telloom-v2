// components/MuxPlayer.tsx
// This component renders a Mux video player for a given playback ID

'use client';

import MuxPlayerReact from '@mux/mux-player-react';

interface MuxPlayerProps {
  playbackId: string;
  className?: string;
}

export function MuxPlayer({ playbackId, className = '' }: MuxPlayerProps) {
  if (!playbackId) return null;

  return (
    <div className="max-w-xl mx-auto">
      <MuxPlayerReact
        streamType="on-demand"
        playbackId={playbackId}
        metadata={{
          video_title: 'Response Video',
        }}
        style={{
          aspectRatio: '16/9',
          width: '100%',
        }}
        className={`rounded-lg ${className}`}
      />
    </div>
  );
} 