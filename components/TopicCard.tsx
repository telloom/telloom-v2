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
import PromptListPopup from './PromptListPopup';

interface TopicCardProps {
  promptCategory: PromptCategory;
  onStateChange?: (updates: { isFavorite?: boolean; isInQueue?: boolean }) => void;
}

export default function TopicCard({ promptCategory, onStateChange }: TopicCardProps) {
  console.log('[CLIENT] TopicCard render:', {
    categoryId: promptCategory.id,
    category: promptCategory.category,
    isFavorite: promptCategory.isFavorite,
    isInQueue: promptCategory.isInQueue
  });

  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [isPromptListOpen, setIsPromptListOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(promptCategory.isFavorite);
  const [isInQueue, setIsInQueue] = useState(promptCategory.isInQueue);

  const handleFavoriteToggle = async () => {
    try {
      setError(null);
      const newIsFavorite = !isFavorite;
      
      console.log('[CLIENT] Starting favorite toggle:', {
        categoryId: promptCategory.id,
        currentIsFavorite: isFavorite,
        newIsFavorite
      });

      // Update UI immediately
      setIsFavorite(newIsFavorite);
      if (onStateChange) {
        onStateChange({ isFavorite: newIsFavorite });
      }
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user');

      if (!newIsFavorite) {
        console.log('[CLIENT] Removing from favorites');
        const { error } = await supabase
          .from('TopicFavorite')
          .delete()
          .eq('profileId', user.id)
          .eq('promptCategoryId', promptCategory.id);

        if (error) {
          console.error('[CLIENT] Error removing favorite:', error);
          // Revert UI on error
          setIsFavorite(!newIsFavorite);
          if (onStateChange) {
            onStateChange({ isFavorite: !newIsFavorite });
          }
          throw error;
        }
      } else {
        console.log('[CLIENT] Adding to favorites');
        const { error } = await supabase
          .from('TopicFavorite')
          .insert({ 
            profileId: user.id,
            promptCategoryId: promptCategory.id 
          });

        if (error) {
          console.error('[CLIENT] Error adding favorite:', error);
          // Revert UI on error
          setIsFavorite(!newIsFavorite);
          if (onStateChange) {
            onStateChange({ isFavorite: !newIsFavorite });
          }
          throw error;
        }
      }

      console.log('[CLIENT] Favorite toggle successful');
    } catch (error: any) {
      console.error('[CLIENT] Error in handleFavoriteToggle:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      if (error.message.includes('auth')) {
        setError('Please log in to favorite topics');
      } else {
        setError('Failed to update favorite status');
      }
    }
  };

  const handleQueueToggle = async () => {
    try {
      setError(null);
      const newIsInQueue = !isInQueue;

      console.log('[CLIENT] Starting queue toggle:', {
        categoryId: promptCategory.id,
        currentIsInQueue: isInQueue,
        newIsInQueue
      });

      // Update UI immediately
      setIsInQueue(newIsInQueue);
      if (onStateChange) {
        onStateChange({ isInQueue: newIsInQueue });
      }
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user');

      if (!newIsInQueue) {
        console.log('[CLIENT] Removing from queue');
        const { error } = await supabase
          .from('TopicQueueItem')
          .delete()
          .eq('profileId', user.id)
          .eq('promptCategoryId', promptCategory.id);

        if (error) {
          console.error('[CLIENT] Error removing from queue:', error);
          // Revert UI on error
          setIsInQueue(!newIsInQueue);
          if (onStateChange) {
            onStateChange({ isInQueue: !newIsInQueue });
          }
          throw error;
        }
      } else {
        console.log('[CLIENT] Adding to queue');
        const { error } = await supabase
          .from('TopicQueueItem')
          .insert({ 
            profileId: user.id,
            promptCategoryId: promptCategory.id 
          });

        if (error) {
          console.error('[CLIENT] Error adding to queue:', error);
          // Revert UI on error
          setIsInQueue(!newIsInQueue);
          if (onStateChange) {
            onStateChange({ isInQueue: !newIsInQueue });
          }
          throw error;
        }
      }

      console.log('[CLIENT] Queue toggle successful');
    } catch (error: any) {
      console.error('[CLIENT] Error in handleQueueToggle:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      if (error.message.includes('auth')) {
        setError('Please log in to add topics to queue');
      } else {
        setError('Failed to update queue status');
      }
    }
  };

  const getCompletionStatus = () => {
    const totalPrompts = promptCategory.prompts.length;
    const completedPrompts = promptCategory.prompts.filter(p => p.videos.length > 0).length;
    return `${completedPrompts}/${totalPrompts}`;
  };

  return (
    <>
      <Card 
        className="w-full h-[150px] border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55] transition-all duration-300 relative flex flex-col rounded-2xl"
        onClick={(e) => {
          // Only show prompts if not clicking on the action buttons
          if (!(e.target as HTMLElement).closest('button')) {
            setIsPromptListOpen(true);
          }
        }}
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
                      onClick={handleFavoriteToggle}
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
                          isFavorite 
                            ? "fill-[#1B4332] text-[#1B4332]" 
                            : "text-gray-400 hover:text-[#8fbc55] hover:fill-[#8fbc55]"
                        )}
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isFavorite ? "Remove from favorites" : "Add to favorites"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleQueueToggle}
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
                          isInQueue 
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
                    <p>{isInQueue ? "Remove from queue" : "Add to queue"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-4 flex-1 flex flex-col justify-end">
          <div className="flex justify-between items-center">
            <Badge variant={promptCategory.prompts.some(p => p.videos.length > 0) ? "default" : "secondary"}>
              {getCompletionStatus()}
            </Badge>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setIsPromptListOpen(true)}
                className="text-gray-500 hover:text-[#1B4332] hover:bg-transparent rounded-full"
              >
                View Prompts
              </Button>
              <Button
                onClick={() => router.push(`/role-sharer/topics/${promptCategory.id}`)}
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
      {error && <div className="text-red-500 mt-2 text-sm text-center">{error}</div>}
    </>
  );
}

