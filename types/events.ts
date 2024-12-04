// events.ts
/**
 * Defines interfaces for custom events and analytics tracking within the application.
 * It standardizes the structure of event data for user interactions, video playback,
 * and other analytics.
 * 
 * As you implement new features that require event tracking, add new interfaces or
 * extend existing ones here.
 */

export interface AnalyticsEvent {
    eventName: string;
    payload: Record<string, unknown>;
  }
  
  export interface UserInteractionEvent {
    userId: string;
    action: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }
  
  export interface VideoPlaybackEvent {
    videoId: string;
    userId: string;
    action: 'play' | 'pause' | 'stop' | 'seek';
    timestamp: Date;
    currentTime: number;
  }