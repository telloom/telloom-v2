// File: stores/userStore.ts
// This file defines a Zustand store for managing user and profile state.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@supabase/supabase-js';
import { Profile } from '@/types/models';

interface UserState {
  user: User | null;
  profile: Profile | null;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setInitialized: (initialized: boolean) => void;
  updateProfileField: <K extends keyof Profile>(field: K, value: Profile[K]) => void;
}

const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      isInitialized: false,
      setUser: (user) => set({ user }),
      setProfile: (profile) => {
        set({ profile });
      },
      setInitialized: (initialized) => set({ isInitialized: initialized }),
      updateProfileField: (field, value) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, [field]: value } : null,
        })),
    }),
    {
      name: 'user-store',
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            state.setInitialized(true);
          }
        };
      },
    }
  )
);

export { useUserStore };