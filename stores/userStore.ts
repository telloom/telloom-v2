// stores/userStore.ts
// This store manages the authenticated user state across the app


import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { Profile } from '@prisma/client';

interface UserState {
  user: User | null;
  profile: Profile | null;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  profile: null,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
}));