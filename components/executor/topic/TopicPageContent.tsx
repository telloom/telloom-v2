'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';
import { PromptCategory } from '@/types/models';
import { Table } from '@/components/ui/table';

interface TopicPageContentProps {
  topic: PromptCategory;
  relationshipId: string;
  sharerId: string;
  sharerName: string;
  sharerAvatarUrl: string | null;
  currentRole: 'EXECUTOR' | 'SHARER';
}

export default function TopicPageContent({
  topic,
  relationshipId,
  sharerId,
  sharerName,
  sharerAvatarUrl,
  currentRole,
}: TopicPageContentProps) {
  const router = useRouter();

  const handleBack = () => {
    console.log('[TOPIC_PAGE_CONTENT] Navigating back to:', `/role-executor/${sharerId}/topics`);
    router.push(`/role-executor/${sharerId}/topics`);
  };

  return (
    <div className="container max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button
            onClick={handleBack}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <UserAvatar
              avatarImageUrl={sharerAvatarUrl}
              firstName={sharerName.split(' ')[0]}
              lastName={sharerName.split(' ')[1]}
              size="md"
            />
            <h1 className="text-2xl font-semibold">
              {topic.category} for {sharerName}
            </h1>
          </div>
        </div>

        {topic.description && (
          <p className="text-muted-foreground">{topic.description}</p>
        )}

        <div className="mt-6">
          <Table>
            <thead>
              <tr>
                <th>Prompt</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {topic.Prompt.map((prompt) => (
                <tr key={prompt.id}>
                  <td>{prompt.promptText}</td>
                  <td>{/* Add status */}</td>
                  <td>{/* Add actions */}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </div>
    </div>
  );
} 