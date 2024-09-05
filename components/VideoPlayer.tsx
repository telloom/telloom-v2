// components/VideoPlayer.tsx
import React from 'react';
import MuxPlayer from '@mux/mux-player-react';

interface VideoPlayerProps {
  playbackId?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ playbackId }) => {
  if (!playbackId) {
    return <div>No video available</div>;
  }

  return (
    <MuxPlayer
      streamType="on-demand"
      playbackId={playbackId}
      metadata={{
        video_id: playbackId,
        video_title: 'Telloom Video',
      }}
      className="w-full h-full"
    />
  );
};

export default VideoPlayer;