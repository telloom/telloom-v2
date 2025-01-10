// components/MuxPlayer.tsx
// This component renders a Mux video player for a given playback ID

'use client';

import MuxPlayerReact from '@mux/mux-player-react';

export function MuxPlayer({ playbackId }: { playbackId: string }) {
  if (!playbackId) return null;

  return (
    <div className="relative w-full">
      <div className="aspect-video bg-black">
        <MuxPlayerReact
          playbackId={playbackId}
          streamType="on-demand"
          accentColor="#8fbc55"
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%'
          }}
          metadata={{
            videoTitle: "Video Response",
          }}
        />
      </div>
    </div>
  );
} 