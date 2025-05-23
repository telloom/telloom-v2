// components/MuxPlayer.tsx
// This component renders a Mux video player for a given playback ID

'use client';

import React from 'react'; // Ensure React is imported for forwardRef
import MuxPlayerReact from '@mux/mux-player-react';
import './MuxPlayer.css'; // Import the CSS file
import { cn } from '@/lib/utils'; // Import cn for combining classes
// Ensure no lingering import of MuxPlayerElement from '@mux/mux-player'

interface MuxPlayerProps {
  playbackId: string;
  onEnded?: () => void;
  autoFocus?: boolean;
  style?: React.CSSProperties; // Use React.CSSProperties for better type checking
  className?: string; // Allow className to be passed
  [key: string]: any; // Allow other props like data-vaul-no-drag
}

// Using 'any' for the ref type temporarily to resolve typing issues.
// We expect the ref to be an element with a .play() method.
export const MuxPlayer = React.forwardRef<any, MuxPlayerProps>(
  ({ playbackId, onEnded, autoFocus, style, className, ...rest }, ref) => { // Capture style and rest props
    // Log props received by MuxPlayer component
    console.log(`[MuxPlayer INSTANTIATING] playbackId: ${playbackId}, onEnded provided: ${!!onEnded}, autoFocus: ${autoFocus}, style:`, style);

    if (!playbackId) {
      // Added a specific log for this case too
      console.log('[MuxPlayer] No playbackId provided, rendering null.');
      return null;
    }

    // Prepare props for MuxPlayerReact
    const muxPlayerProps: any = {
      ref,
      playbackId,
      streamType: "on-demand",
      accentColor: "#8fbc55",
      // Apply the CSS class and merge with any passed `style` prop for dynamic styles
      style: style, // Dynamic styles from props are still applied here
      className: cn('mux-player-react-element-styles', className), // Base styles from CSS, merge with passed className
      metadata: {
        video_title: "Video Response",
      },
      onEnded: onEnded, // Pass through onEnded
      onPlay: () => console.log(`[MuxPlayer EVENT] onPlay triggered for playbackId: ${playbackId}`),
      onPause: () => console.log(`[MuxPlayer EVENT] onPause triggered for playbackId: ${playbackId}`),
      onError: (error?: any) => console.error(`[MuxPlayer ERROR] PlaybackId: ${playbackId}`, error),
      ...rest // Spread rest props here
    };

    if (autoFocus) {
      muxPlayerProps.autoFocus = true; // Try passing as a prop, hoping React converts to attribute
    }

    console.log('[MuxPlayer] Rendering MuxPlayerReact with props:', muxPlayerProps);

    return (
      <div className="relative w-full h-full mux-player-wrapper-styles"> {/* Ensure parent div takes full space */}
        <MuxPlayerReact {...muxPlayerProps} />
      </div>
    );
  }
);

MuxPlayer.displayName = 'MuxPlayer'; // For better debugging

// Removed global type declaration as we are using 'any' for the ref type for now. 