// stores/userStore.ts
// This store manages the authenticated user state across the app

import { create } from 'zustand';
import { User } from '@supabase/supabase-js';

interface UserState {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));