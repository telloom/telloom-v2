'use client';

import TopicsTableAll from '@/components/TopicsTableAll';
import { PromptCategory } from '@/types/models';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import UserAvatar from '@/components/UserAvatar';

interface TopicsClientWrapperProps {
  initialPromptCategories: PromptCategory[];
  currentRole: 'EXECUTOR' | 'SHARER';
  relationshipId?: string;
  sharerId: string;
  sharerName: string;
  sharerAvatarUrl: string | null;
}

export default function TopicsClientWrapper({
  initialPromptCategories,
  currentRole,
  relationshipId,
  sharerId,
  sharerName,
  sharerAvatarUrl
}: TopicsClientWrapperProps) {
  const router = useRouter();

  // Add debug log for navigation
  const handleBackClick = () => {
    console.log('[TOPICS_CLIENT_WRAPPER] Navigating back to:', `/role-executor/${sharerId}`);
    router.push(`/role-executor/${sharerId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Remove the BackButton from this component */}
      {/* 
      <Button
        variant="ghost"
        className="mb-6 -ml-2 text-muted-foreground hover:text-[#1B4332] rounded-full"
        onClick={handleBackClick}
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back
      </Button>
      */}

      {/* Remove flex container and UserAvatar, simplify title */}
      {/* <div className="flex items-center justify-between mb-8"> */}
        {/* <div className="flex items-center gap-4"> */}
          {/* Remove UserAvatar */}
          {/* 
          <UserAvatar 
            avatarImageUrl={sharerAvatarUrl}
            firstName={sharerName.split(' ')[0] || ''}
            lastName={sharerName.split(' ')[1] || ''}
            size="h-12 w-12"
          />
          */}
          {/* Change title to static "Topics" and add bottom margin */}
          <h1 className="text-3xl font-bold mb-8">
            Topics
          </h1>
        {/* </div> */}
      {/* </div> */}

      <TopicsTableAll 
        initialPromptCategories={initialPromptCategories}
        currentRole={currentRole}
        relationshipId={relationshipId}
        sharerId={sharerId}
      />
    </div>
  );
} 