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
    <div className="relative w-full h-full">
      <MuxPlayerReact
        playbackId={playbackId}
        streamType="on-demand"
        accentColor="#8fbc55"
        style={{ height: '100%', width: '100%', maxWidth: '100%', maxHeight: '100%' }}
        metadata={{
          videoTitle: "Video Response",
        }}
      />
    </div>
  );
} 