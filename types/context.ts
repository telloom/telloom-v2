// context.ts
/**
 * Contains interfaces for React contexts used throughout the app, such as
 * UserContext, SharerContext, and ListenerContext. These contexts provide
 * global state management for user profiles and role-specific data.
 * 
 * As you introduce new contexts or expand existing ones, update this file
 * with the relevant interfaces.
 */

import { Profile, ProfileSharer, ProfileListener } from './models';

export interface UserContextType {
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
}

export interface SharerContextType {
  sharerProfile: ProfileSharer | null;
  setSharerProfile: (profile: ProfileSharer | null) => void;
}

export interface ListenerContextType {
  listenerProfile: ProfileListener | null;
  setListenerProfile: (profile: ProfileListener | null) => void;
}