'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PromptActionsProps {
  currentPromptId: string;
  previousPrompt: { id: string; promptText: string } | null;
  nextPrompt: { id: string; promptText: string } | null;
  sharerId: string;
}

export default function PromptActions({
  currentPromptId,
  previousPrompt,
  nextPrompt,
  sharerId
}: PromptActionsProps) {
  return (
    <div className="flex justify-between items-center">
      {previousPrompt ? (
        <Link href={`/role-executor/${sharerId}/prompts/${previousPrompt.id}`}>
          <Button
            variant="outline"
            className="flex items-center gap-2 border-2 border-[#1B4332] shadow-[4px_4px_0_0_#8fbc55] hover:shadow-[6px_6px_0_0_#8fbc55] transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous Prompt
          </Button>
        </Link>
      ) : (
        <div /> {/* Empty div for spacing */}
      )}

      {nextPrompt ? (
        <Link href={`/role-executor/${sharerId}/prompts/${nextPrompt.id}`}>
          <Button
            variant="outline"
            className="flex items-center gap-2 border-2 border-[#1B4332] shadow-[4px_4px_0_0_#8fbc55] hover:shadow-[6px_6px_0_0_#8fbc55] transition-all"
          >
            Next Prompt
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      ) : (
        <div /> {/* Empty div for spacing */}
      )}
    </div>
  );
} 