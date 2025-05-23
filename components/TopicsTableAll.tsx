// components/TopicsTableAll.tsx
'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const TopicsTableAllClient = dynamic(() => import('./TopicsTableAllClient'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-12">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      <span className="ml-2 text-gray-500">Loading topics...</span>
    </div>
  )
});

interface TopicsTableAllProps {
  initialPromptCategories: any[];
  userId: string;
  currentRole?: 'SHARER' | 'EXECUTOR' | 'LISTENER';
  relationshipId?: string;
  sharerId?: string;
}

export default function TopicsTableAll(props: TopicsTableAllProps) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading topics...</span>
      </div>
    }>
      <TopicsTableAllClient {...props} />
    </Suspense>
  );
}

