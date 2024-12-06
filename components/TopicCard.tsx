// components/TopicCard.tsx
// This component displays a card for a specific prompt category, showing its progress and allowing navigation to the topic's details page.
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PromptCategory } from '@/types/models';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, Play, Star, ListPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { createClient, getAuthenticatedClient } from '@/utils/supabase/client';

export default function TopicCard({ promptCategory }: { promptCategory: PromptCategory }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isInQueue, setIsInQueue] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkAuthAndStatus = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('TopicCard - Starting auth and status check');
        const supabase = await getAuthenticatedClient();
        console.log('TopicCard - Got authenticated client');

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('No authenticated user');
        
        // Check if topic is favorited
        console.log('TopicCard - Checking favorite status for topic:', promptCategory.id);
        const { data: favorite, error: favoriteError } = await supabase
          .from('TopicFavorite')
          .select('id')
          .eq('profileId', user.id)
          .eq('promptCategoryId', promptCategory.id)
          .maybeSingle();

        console.log('TopicCard - Favorite check result:', {
          hasFavorite: !!favorite,
          error: favoriteError?.message,
          errorCode: favoriteError?.code
        });

        if (favoriteError) {
          console.error('TopicCard - Error checking favorite status:', favoriteError);
          throw favoriteError;
        }

        // Check if topic is in queue
        console.log('TopicCard - Checking queue status for topic:', promptCategory.id);
        const { data: queueItem, error: queueError } = await supabase
          .from('TopicQueueItem')
          .select('id')
          .eq('profileId', user.id)
          .eq('promptCategoryId', promptCategory.id)
          .maybeSingle();

        console.log('TopicCard - Queue check result:', {
          hasQueueItem: !!queueItem,
          error: queueError?.message,
          errorCode: queueError?.code
        });

        if (queueError) {
          console.error('TopicCard - Error checking queue status:', queueError);
          throw queueError;
        }

        if (mounted) {
          setIsFavorite(!!favorite);
          setIsInQueue(!!queueItem);
          console.log('TopicCard - Updated state:', {
            isFavorite: !!favorite,
            isInQueue: !!queueItem
          });
        }
      } catch (error: any) {
        console.error('TopicCard - Error in checkAuthAndStatus:', {
          message: error.message,
          code: error.code,
          details: error.details,
        });
        if (mounted) {
          setError('Error loading topic status');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    checkAuthAndStatus();

    return () => {
      mounted = false;
    };
  }, [promptCategory.id]);

  if (!promptCategory) {
    return <div>Error: Topic data is missing</div>;
  }

  if (!promptCategory.prompts) {
    return <div>Error: Prompt data is missing</div>;
  }

  if (isLoading) {
    return (
      <Card className="w-full hover:shadow-lg transition-all duration-300 border border-gray-200">
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  const progress = Math.round((promptCategory.prompts.filter(p => p.promptResponses[0]).length / promptCategory.prompts.length) * 100);

  const handleContinue = () => {
    if (promptCategory.id) {
      router.push(`/role-sharer/dashboard/topic/${promptCategory.id}`);
    } else {
      console.error('TopicCard - promptCategory.id is undefined');
      setError('Unable to navigate: Topic ID is missing');
    }
  };

  const handleFavoriteToggle = async () => {
    try {
      setError(null);
      console.log('TopicCard - Starting favorite toggle for topic:', promptCategory.id);
      
      const supabase = await getAuthenticatedClient();
      console.log('TopicCard - Got authenticated client for favorite toggle');

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user');

      if (isFavorite) {
        console.log('TopicCard - Removing from favorites');
        const { error } = await supabase
          .from('TopicFavorite')
          .delete()
          .eq('profileId', user.id)
          .eq('promptCategoryId', promptCategory.id);

        if (error) {
          console.error('TopicCard - Error removing favorite:', error);
          throw error;
        }
        console.log('TopicCard - Successfully removed from favorites');
      } else {
        console.log('TopicCard - Adding to favorites');
        const { error } = await supabase
          .from('TopicFavorite')
          .insert({ 
            profileId: user.id,
            promptCategoryId: promptCategory.id 
          });

        if (error) {
          console.error('TopicCard - Error adding favorite:', error);
          throw error;
        }
        console.log('TopicCard - Successfully added to favorites');
      }

      setIsFavorite(!isFavorite);
      // Force a hard refresh to update the favorites list
      window.location.reload();
    } catch (error: any) {
      console.error('TopicCard - Error in handleFavoriteToggle:', {
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
      console.log('TopicCard - Starting queue toggle for topic:', promptCategory.id);
      
      const supabase = await getAuthenticatedClient();
      console.log('TopicCard - Got authenticated client for queue toggle');

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user');

      if (isInQueue) {
        console.log('TopicCard - Removing from queue');
        const { error } = await supabase
          .from('TopicQueueItem')
          .delete()
          .eq('profileId', user.id)
          .eq('promptCategoryId', promptCategory.id);

        if (error) {
          console.error('TopicCard - Error removing from queue:', error);
          throw error;
        }
        console.log('TopicCard - Successfully removed from queue');
      } else {
        console.log('TopicCard - Adding to queue');
        const { error } = await supabase
          .from('TopicQueueItem')
          .insert({ 
            profileId: user.id,
            promptCategoryId: promptCategory.id 
          });

        if (error) {
          console.error('TopicCard - Error adding to queue:', error);
          throw error;
        }
        console.log('TopicCard - Successfully added to queue');
      }

      setIsInQueue(!isInQueue);
      // Force a hard refresh to update the queue list
      window.location.reload();
    } catch (error: any) {
      console.error('TopicCard - Error in handleQueueToggle:', {
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

  return (
    <Card className="w-full hover:shadow-lg transition-all duration-300 border border-gray-200">
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-center">
          <span className="text-xl text-gray-800">{promptCategory.category || 'Untitled Category'}</span>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleFavoriteToggle}
                    className="h-8 w-8"
                  >
                    <Star className={cn(
                      "h-5 w-5",
                      isFavorite ? "fill-[#1B4332] text-[#1B4332]" : "text-gray-400"
                    )} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isFavorite ? 'Remove from favorites' : 'Add to favorites'}</p>
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
                    className="h-8 w-8"
                  >
                    <ListPlus className={cn(
                      "h-5 w-5",
                      isInQueue ? "text-[#1B4332]" : "text-gray-400"
                    )} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isInQueue ? 'Remove from queue' : 'Add to queue'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">{progress}% complete</span>
          <span className="text-sm font-medium text-gray-600">
            {promptCategory.prompts.filter(p => p.promptResponses[0]).length}/{promptCategory.prompts.length} prompts
          </span>
        </div>
        <Progress 
          value={progress} 
          className="h-2" 
          style={{ '--progress-foreground': '#1B4332' } as React.CSSProperties}
        />
      </CardContent>
      <CardFooter className="flex justify-between pt-4">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="text-gray-600 hover:text-gray-800 border-[#1B4332] hover:bg-[#1B4332]/10">
              View Prompts
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{promptCategory.category || 'Untitled Category'} Prompts</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {promptCategory.prompts.map((prompt, index) => (
                <div
                  key={prompt.id || index}
                  className={cn(
                    "grid grid-cols-[auto,1fr,auto] items-center gap-4 p-3 rounded-md transition-colors",
                    prompt.promptResponses[0] ? "text-gray-500 bg-gray-50" : "hover:bg-gray-100 cursor-pointer"
                  )}
                >
                  <span className="text-sm font-medium text-gray-400">{index + 1}.</span>
                  <p className="text-sm">{prompt.promptText || 'Untitled Prompt'}</p>
                  {prompt.promptResponses[0] ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (prompt.promptResponses[0]?.id) {
                          router.push(`/role-sharer/dashboard/prompt-response/${prompt.promptResponses[0].id}`);
                        } else {
                          console.error('TopicCard - prompt.promptResponses[0].id is undefined', prompt);
                          setError('Unable to view response: Response ID is missing');
                        }
                      }}
                    >
                      <Play className="h-4 w-4 text-[#1B4332]" />
                    </Button>
                  ) : (
                    <span className="text-[#1B4332]">Not Recorded</span>
                  )}
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
        <Button 
          onClick={handleContinue}
          className="bg-[#1B4332] hover:bg-[#1B4332]/90 text-white"
        >
          Continue
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
      {error && <div className="text-red-500 mt-2 text-sm text-center">{error}</div>}
    </Card>
  );
}

