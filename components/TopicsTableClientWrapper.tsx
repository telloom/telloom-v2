'use client';

import dynamic from 'next/dynamic';
import { PromptCategory } from '@/types/models';

const TopicsTableAll = dynamic(() => import('./TopicsTableAll'), { ssr: false });

interface TopicsTableClientWrapperProps {
  initialPromptCategories: PromptCategory[];
  currentRole?: 'SHARER' | 'EXECUTOR';
  relationshipId?: string;
  sharerId?: string;
}

export default function TopicsTableClientWrapper(props: TopicsTableClientWrapperProps) {
  return <TopicsTableAll {...props} />;
} 