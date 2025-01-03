// app/page.tsx
import { redirect } from 'next/navigation';
import { getUser } from '@/utils/supabase/server';
import { Role } from '@/types/models';
import { useCallback, useState } from 'react';

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);
  
  const handleUploadSuccess = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    <main className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {prompts.map((prompt) => (
          <PromptCard
            key={`${prompt.id}-${refreshKey}`}
            prompt={prompt}
            onUploadSuccess={handleUploadSuccess}
          />
        ))}
      </div>
    </main>
  );
}
