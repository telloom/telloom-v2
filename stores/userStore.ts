// stores/userStore.ts
// This store manages the authenticated user state across the app


import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { Profile } from '@prisma/client';

interface UserState {
  user: User | null;
  profile: Profile | null;
  setUser: (user: User | null) => void;
  setProfile: (profileOrUpdater: Profile | null | ((prev: Profile | null) => Profile | null)) => void;
  updateProfileField: <K extends keyof Profile>(field: K, value: Profile[K]) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  profile: null,
  setUser: (user) => set({ user }),
  setProfile: (profileOrUpdater) => 
    set((state) => ({
      profile: typeof profileOrUpdater === 'function' 
        ? profileOrUpdater(state.profile)
        : profileOrUpdater
    })),
  updateProfileField: (field, value) =>
    set((state) => ({
      profile: state.profile ? { ...state.profile, [field]: value } : null
    })),
}));
