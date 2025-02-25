// components/TopicsTableAll.tsx
'use client';

import dynamic from 'next/dynamic';

const TopicsTableAllClient = dynamic(() => import('./TopicsTableAllClient'), {
  ssr: false
});

interface TopicsTableAllProps {
  initialPromptCategories: any[];
  currentRole?: 'SHARER' | 'EXECUTOR';
  relationshipId?: string;
  sharerId?: string;
}

export default function TopicsTableAll(props: TopicsTableAllProps) {
  return <TopicsTableAllClient {...props} />;
}

