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
import { createClient } from '@/utils/supabase/client';
import { ArrowRight } from 'lucide-react';
import PromptListPopup from './PromptListPopup';

interface TopicCardProps {
  promptCategory: PromptCategory;
  onClick?: () => void;
  onFavoriteClick?: (e: React.MouseEvent) => void;
  onQueueClick?: (e: React.MouseEvent) => void;
}

export default function TopicCard({ 
  promptCategory, 
  onClick,
  onFavoriteClick,
  onQueueClick 
}: TopicCardProps) {
  const router = useRouter();
  const [isPromptListOpen, setIsPromptListOpen] = useState(false);

  return (
    <>
      <Card 
        className="w-full h-[150px] border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55] transition-all duration-300 relative flex flex-col rounded-2xl"
        onClick={onClick}
      >
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <CardTitle className="text-xl line-clamp-2 min-h-[3rem]">{promptCategory.category}</CardTitle>
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onFavoriteClick}
                      className="h-9 w-9 p-0 hover:bg-transparent rounded-full"
                    >
                      <svg 
                        width="20" 
                        height="20" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className={cn(
                          "transition-colors",
                          promptCategory.isFavorite 
                            ? "fill-[#1B4332] text-[#1B4332]" 
                            : "text-gray-400 hover:text-[#8fbc55] hover:fill-[#8fbc55]"
                        )}
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{promptCategory.isFavorite ? "Remove from favorites" : "Add to favorites"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onQueueClick}
                      className="h-9 w-9 p-0 hover:bg-transparent rounded-full"
                    >
                      <svg 
                        width="20" 
                        height="20" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="3" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className={cn(
                          "transition-colors",
                          promptCategory.isInQueue 
                            ? "text-[#1B4332]" 
                            : "text-gray-400 hover:text-[#8fbc55]"
                        )}
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{promptCategory.isInQueue ? "Remove from queue" : "Add to queue"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-4 flex-1 flex flex-col justify-end">
          <div className="flex justify-between items-center">
            <Badge variant={promptCategory.prompts.some(p => p.videos.length > 0) ? "default" : "secondary"}>
              {`${promptCategory.prompts.filter(p => p.videos.length > 0).length}/${promptCategory.prompts.length}`}
            </Badge>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPromptListOpen(true);
                }}
                className="text-gray-500 hover:text-[#1B4332] hover:bg-transparent rounded-full"
              >
                View Prompts
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/role-sharer/topics/${promptCategory.id}`);
                }}
                className="bg-[#1B4332] hover:bg-[#1B4332]/90 text-white rounded-full font-medium"
              >
                Start Recording →
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <PromptListPopup 
        promptCategory={promptCategory}
        isOpen={isPromptListOpen}
        onClose={() => setIsPromptListOpen(false)}
      />
    </>
  );
}

