import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ViewPreferences {
  sharerTopicsView: 'grid' | 'table';
  executorTopicsView: 'grid' | 'table';
  setSharerTopicsView: (view: 'grid' | 'table') => void;
  setExecutorTopicsView: (view: 'grid' | 'table') => void;
}

export const useViewPreferences = create<ViewPreferences>()(
  persist(
    (set) => ({
      sharerTopicsView: 'grid',
      executorTopicsView: 'grid',
      setSharerTopicsView: (view) => set({ sharerTopicsView: view }),
      setExecutorTopicsView: (view) => set({ executorTopicsView: view }),
    }),
    {
      name: 'telloom-view-preferences',
    }
  )
); 