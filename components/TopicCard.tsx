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
  const completedCount = promptCategory.prompts.filter(p => p.videos.length > 0).length;
  const totalCount = promptCategory.prompts.length;

  return (
    <>
      <Card 
        className="w-full min-h-[150px] border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55] transition-all duration-300 relative flex flex-col rounded-2xl"
        onClick={onClick}
      >
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start gap-2">
            <CardTitle className="text-lg sm:text-xl line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem] flex-grow pr-2">
              {promptCategory.category}
            </CardTitle>
            <div className="flex gap-1 sm:gap-2 flex-shrink-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onFavoriteClick}
                      className="h-8 w-8 sm:h-9 sm:w-9 p-0 hover:bg-transparent rounded-full"
                    >
                      <svg 
                        width="18" 
                        height="18" 
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
                    <p>Favorite</p>
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
                      className="h-8 w-8 sm:h-9 sm:w-9 p-0 hover:bg-transparent rounded-full"
                    >
                      <svg 
                        width="18" 
                        height="18" 
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
                    <p>Queue</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-3 flex-1 flex flex-col justify-end">
          <div className="flex items-center justify-between gap-3">
            <Badge 
              variant={completedCount > 0 ? "default" : "secondary"} 
              className="text-xs flex-shrink-0"
            >
              {`${completedCount}/${totalCount}`}
            </Badge>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPromptListOpen(true);
                }}
                className="text-sm text-gray-500 hover:text-[#1B4332] hover:bg-transparent rounded-full px-3 py-1 h-auto flex items-center gap-1.5"
              >
                <ListOrdered className="h-4 w-4" />
                Prompts
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/role-sharer/topics/${promptCategory.id}`);
                }}
                className="text-sm bg-[#1B4332] hover:bg-[#1B4332]/90 text-white rounded-full font-medium px-4 py-1.5 h-auto whitespace-nowrap flex items-center gap-1.5"
              >
                <Video className="h-4 w-4" />
                Record
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

