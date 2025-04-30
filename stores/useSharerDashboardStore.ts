// stores/useSharerDashboardStore.ts
// Zustand store for managing the state of topic categories on the Sharer dashboard.

import { create } from 'zustand';

// Re-use or import the interface definition
interface TopicSectionCategory {
    id: string;
    category: string;
    description: string | null;
    theme: string | null;
    completedPromptCount?: number; 
    totalPromptCount?: number;   
    isFavorite?: boolean;
    isInQueue?: boolean;
    Prompt?: any[]; 
}

interface SharerDashboardState {
  categories: TopicSectionCategory[];
  setCategories: (categories: TopicSectionCategory[]) => void;
  toggleFavorite: (categoryId: string) => void;
  toggleQueue: (categoryId: string) => void;
}

export const useSharerDashboardStore = create<SharerDashboardState>((set) => ({
  categories: [], // Initial state is an empty array
  
  // Action to initialize or completely replace categories
  setCategories: (categories) => set({ categories }),

  // Action to toggle the favorite status of a specific category
  toggleFavorite: (categoryId) => set((state) => ({
    categories: state.categories.map(cat => 
      cat.id === categoryId 
        ? { ...cat, isFavorite: !cat.isFavorite } 
        : cat
    ),
  })),

  // Action to toggle the queue status of a specific category
  toggleQueue: (categoryId) => set((state) => ({
    categories: state.categories.map(cat => 
      cat.id === categoryId 
        ? { ...cat, isInQueue: !cat.isInQueue } 
        : cat
    ),
  })),
})); 