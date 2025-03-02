'use client';

import TopicsTableAll from '@/components/TopicsTableAll';
import { PromptCategory } from '@/types/models';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import UserAvatar from '@/components/UserAvatar';

interface TopicsClientWrapperProps {
  initialPromptCategories: PromptCategory[];
  currentRole: 'EXECUTOR';
  relationshipId: string;
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

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        className="mb-6 -ml-2 text-muted-foreground hover:text-[#1B4332] rounded-full"
        onClick={() => router.push(`/role-executor/${sharerId}`)}
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back
      </Button>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <UserAvatar 
            avatarImageUrl={sharerAvatarUrl}
            firstName={sharerName.split(' ')[0] || ''}
            lastName={sharerName.split(' ')[1] || ''}
            size="h-12 w-12"
          />
          <h1 className="text-3xl font-bold">
            Topics for {sharerName}
          </h1>
        </div>
      </div>

      <TopicsTableAll 
        initialPromptCategories={initialPromptCategories}
        currentRole={currentRole}
        relationshipId={relationshipId}
        sharerId={sharerId}
      />
    </div>
  );
} 