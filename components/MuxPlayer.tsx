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
    <div className="absolute inset-0">
      <MuxPlayerReact
        streamType="on-demand"
        playbackId={playbackId}
        metadata={{
          video_title: 'Response Video',
        }}
        style={{
          height: '100%',
          width: '100%',
          maxHeight: '100%',
          borderRadius: '0.75rem',
          overflow: 'hidden',
        }}
        className={`rounded-xl object-cover ${className}`}
        nohotkeys={true}
      />
    </div>
  );
} 