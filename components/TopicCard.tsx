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
import { ArrowRight, CheckCircle2, ListOrdered } from 'lucide-react';
import { PromptListPopup } from '@/components/PromptListPopup';

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
  
  // Safely handle potentially undefined prompts array
  const prompts = promptCategory.prompts || [];
  const completedCount = prompts.filter(p => Array.isArray(p.PromptResponse) && p.PromptResponse.length > 0).length;
  const totalCount = prompts.length;

  return (
    <>
      <Card 
        className="w-full min-h-[150px] border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55] transition-all duration-300 relative flex flex-col rounded-2xl"
      >
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1">
              <CardTitle className="text-lg sm:text-xl line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem] flex-grow pr-2">
                {promptCategory.category}
              </CardTitle>
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
        </CardHeader>
        <CardContent className="pt-0 mt-auto">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFavoriteClick && onFavoriteClick(e);
                      }}
                      className="h-8 w-8 md:h-9 md:w-9 p-0 hover:bg-transparent"
                    >
                      <svg 
                        className={cn(
                          "w-[18px] h-[18px] md:w-[20px] md:h-[20px] transition-colors",
                          promptCategory.isFavorite 
                            ? "fill-[#1B4332] text-[#1B4332]" 
                            : "text-gray-400 hover:text-[#8fbc55] hover:fill-[#8fbc55]"
                        )}
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
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
                      onClick={(e) => {
                        e.stopPropagation();
                        onQueueClick && onQueueClick(e);
                      }}
                      className="h-8 w-8 md:h-9 md:w-9 p-0 hover:bg-transparent"
                    >
                      <svg 
                        className={cn(
                          "w-[18px] h-[18px] md:w-[20px] md:h-[20px] transition-colors",
                          promptCategory.isInQueue 
                            ? "text-[#1B4332]" 
                            : "text-gray-400 hover:text-[#8fbc55]"
                        )}
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="3" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
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

            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsPromptListOpen(true)}
                      className="h-8 w-8 md:h-9 md:w-9 p-0 hover:bg-[#8fbc55] rounded-full"
                    >
                      <ListOrdered className="h-5 w-5 md:h-6 md:w-6 text-[#1B4332]" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View prompts</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/role-sharer/topics/${promptCategory.id}`)}
                      className="h-8 w-8 md:h-9 md:w-9 p-0 hover:bg-[#8fbc55] rounded-full"
                    >
                      <ArrowRight className={cn(
                        "h-5 w-5 md:h-6 md:w-6 transition-colors stroke-[3]",
                        "text-[#1B4332]"
                      )} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Start recording</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>

      {isPromptListOpen && (
        <PromptListPopup
          promptCategory={promptCategory}
          isOpen={isPromptListOpen}
          onClose={() => setIsPromptListOpen(false)}
        />
      )}
    </>
  );
}

