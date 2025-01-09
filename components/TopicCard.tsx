// components/TopicCard.tsx
// This component displays a card for a specific prompt category, showing its progress and allowing navigation to the topic's details page.
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PromptCategory } from '@/types/models';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Video, ListOrdered } from 'lucide-react';
import PromptListPopup from './PromptListPopup';

interface TopicCardProps {
  promptCategory: PromptCategory;
  onClick: () => void;
}

export default function TopicCard({ promptCategory, onClick }: TopicCardProps) {
  const router = useRouter();
  const [isPromptListOpen, setIsPromptListOpen] = useState(false);
  const completedCount = promptCategory.prompts.filter(p => p.videos.length > 0).length;
  const totalCount = promptCategory.prompts.length;
  const hasContextEstablishingPrompt = promptCategory.prompts.some(p => p.isContextEstablishing);

  return (
    <>
      <Card 
        className="w-full min-h-[150px] border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55] transition-all duration-300 relative flex flex-col rounded-2xl"
        onClick={onClick}
      >
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1">
              <CardTitle className="text-lg sm:text-xl line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem] flex-grow pr-2">
                {promptCategory.category}
              </CardTitle>
              {hasContextEstablishingPrompt && (
                <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-[#8fbc55] text-[#1B4332] rounded-full mt-2">
                  Start Here
                </span>
              )}
            </div>
            <div className="flex gap-1 sm:gap-2 flex-shrink-0">
              <TooltipProvider>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {completedCount}/{totalCount}
                  </span>
                </div>
              </TooltipProvider>
            </div>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
            {promptCategory.description}
          </p>
        </CardHeader>
      </Card>
    </>
  );
}

