// components/listener/ListenerTopicCard.tsx
// LISTENER-SPECIFIC: Displays a card for a prompt category, WITHOUT progress/status.
'use client';

import React from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// REMOVED Badge import as it's no longer used
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ArrowRight, Star } from 'lucide-react';
// Removed PromptListPopup and its props import
import type { PromptCategory as ModelPromptCategory } from '@/types/models';

// Extend PromptCategory to include the counts passed from the server
// Even though we don't display them, the parent component provides them
interface ExtendedPromptCategory extends ModelPromptCategory {
  completedPromptCount?: number;
  totalPromptCount?: number;
  displayName?: string;
  isFavorite?: boolean;
  isInQueue?: boolean;
}

interface ListenerTopicCardProps {
  category: ExtendedPromptCategory;
  onClick?: () => void;
  onToggleFavorite?: (e?: React.MouseEvent) => void;
  onToggleQueue?: (e?: React.MouseEvent) => void;
  sharerId?: string;
  isLoadingFavorite?: boolean;
  isLoadingQueue?: boolean;
}

export default function ListenerTopicCard({ 
  category,
  onToggleFavorite,
  onToggleQueue,
  sharerId,
  isLoadingFavorite,
  isLoadingQueue
}: ListenerTopicCardProps) {
  const router = useRouter();
  
  useEffect(() => {
    // console.log(`[ListenerTopicCard] Rendering card for: ${category.displayName || category.category}`);
  }, [category, sharerId]);
  
  const handleNavigateToTopicSummary = () => {
    if (sharerId && category.id) {
      router.push(`/role-listener/${sharerId}/topics/${category.id}`);
    } else {
      console.warn('[ListenerTopicCard] Missing sharerId or topicId for summary navigation');
    }
  };

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      await onToggleFavorite(e);
    }
  };

  const handleQueue = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleQueue) {
      await onToggleQueue(e);
    }
  };

  const formatThemeName = (theme: string | null | undefined): string => {
    if (!theme) return 'General';
    return theme
      .replace(/[_-]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <>
      <Card 
        className={cn(
          "w-full min-h-[150px] border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] transition-all duration-300 relative flex flex-col rounded-2xl",
          "cursor-pointer hover:shadow-[8px_8px_0_0_#8fbc55]"
        )}
        onClick={handleNavigateToTopicSummary}
      >
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1">
              <CardTitle className="text-lg sm:text-xl line-clamp-2 flex-grow pr-2">
                {category.displayName || category.category}
              </CardTitle>
              {category.theme && (
                <div className="mt-1 inline-block bg-gray-100 text-gray-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  {formatThemeName(category.theme)}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 mt-auto">
          <div className="flex items-center justify-between gap-2">
            <div className={cn("flex items-center gap-1")} >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleFavorite}
                      className="h-8 w-8 md:h-9 md:w-9 p-0 hover:bg-transparent"
                      disabled={isLoadingFavorite}
                    >
                      {isLoadingFavorite ? (
                        <svg
                          className={cn("h-4 w-4 animate-spin text-[#1B4332]")}
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      ) : (
                        <Star
                          className={cn(
                            "w-[18px] h-[18px] md:w-[20px] md:h-[20px] transition-colors",
                            category.isFavorite 
                              ? "fill-[#1B4332] text-[#1B4332]" 
                              : "text-gray-400 hover:text-[#8fbc55] hover:fill-[#8fbc55]"
                          )}
                          strokeWidth={2}
                        />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{category.isFavorite ? "Remove from my favorites" : "Add to my favorites"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleQueue}
                      className="h-8 w-8 md:h-9 md:w-9 p-0 hover:bg-transparent"
                      disabled={isLoadingQueue}
                    >
                      {isLoadingQueue ? (
                        <svg 
                          className={cn("h-4 w-4 animate-spin text-[#1B4332]")}
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
                      ) : (
                        <svg 
                          className={cn(
                            "w-[18px] h-[18px] md:w-[20px] md:h-[20px] transition-colors",
                            category.isInQueue 
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
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{category.isInQueue ? "Remove from my queue" : "Add to my queue"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => {
                e.stopPropagation();
                handleNavigateToTopicSummary();
              }}
              className="h-8 w-8 md:h-9 md:w-9 p-0 rounded-full hover:bg-[#8fbc55] transition-colors duration-200 group"
            >
              <ArrowRight className="h-5 w-5 md:h-6 md:w-6 text-gray-400 group-hover:text-[#1B4332] transition-colors duration-200" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
} 