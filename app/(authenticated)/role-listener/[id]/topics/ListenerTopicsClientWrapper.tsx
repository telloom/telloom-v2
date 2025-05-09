'use client';

// app/(authenticated)/role-listener/[id]/topics/ListenerTopicsClientWrapper.tsx
// Client component wrapper for displaying topics for a specific Sharer viewed by a Listener.

import ListenerTopicsTable from '@/components/listener/ListenerTopicsTable'; // Import the LISTENER-specific table component
import { PromptCategory } from '@/types/models';

// Interface for the data passed from the server page
interface ListenerTopicCategory extends PromptCategory {
  completedPromptCount?: number;
  totalPromptCount?: number;
  isFavorite?: boolean;
  isInQueue?: boolean;
}

interface ListenerTopicsClientWrapperProps {
  initialPromptCategories: ListenerTopicCategory[];
  sharerId: string;
}

export default function ListenerTopicsClientWrapper({
  initialPromptCategories,
  sharerId
}: ListenerTopicsClientWrapperProps) {
  return (
    <div className="container mx-auto px-4 pt-2 pb-8">
      {/* Reduced bottom margin from previous step */}
      <h1 className="text-3xl font-bold mb-4">
        Topics
      </h1>
      <ListenerTopicsTable // Use the LISTENER-specific component
        initialPromptCategories={initialPromptCategories}
        sharerId={sharerId}
      />
    </div>
  );
} 