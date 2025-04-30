// components/MuxPlayer.tsx
// This component renders a Mux video player for a given playback ID

'use client';

import MuxPlayerReact from '@mux/mux-player-react';

interface MuxPlayerProps {
  playbackId: string;
  onEnded?: () => void;
}

export function MuxPlayer({ playbackId, onEnded }: MuxPlayerProps) {
  if (!playbackId) return null;

  return (
    <div className="relative w-full">
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        <MuxPlayerReact
          playbackId={playbackId}
          streamType="on-demand"
          accentColor="#8fbc55"
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            borderRadius: '0.5rem' // 8px to match rounded-lg
          }}
          metadata={{
            videoTitle: "Video Response",
          }}
          onEnded={onEnded}
          suppressHydrationWarning
        />
      </div>
    </div>
  );
} 