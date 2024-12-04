// components/TopicsTableAll.tsx
// This component displays a table of all topics with their respective categories and allows users to interact with them.
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PromptCategory, Prompt } from '@/types/models';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Star, ChevronRight, Play } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { VideoPopup } from '@/components/VideoPopup';

const QueueIcon = ({ isInQueue }: { isInQueue: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="9" stroke={isInQueue ? "#1B4332" : "#9CA3AF"} strokeWidth="2" />
    {isInQueue && (
      <>
        <circle cx="10" cy="10" r="8" fill="#1B4332" />
        <path d="M10 5V15M5 10H15" stroke="white" strokeWidth="2" />
      </>
    )}
    {!isInQueue && (
      <path d="M10 5V15M5 10H15" stroke="#9CA3AF" strokeWidth="2" />
    )}
  </svg>
);

export default function AllTopicsTable({ promptCategories }: { promptCategories: PromptCategory[] }) {
  const router = useRouter();
  const [categories, setCategories] = useState<PromptCategory[]>(promptCategories);
  const [selectedVideo, setSelectedVideo] = useState<{ promptText: string; videoId: string } | null>(null);
  const supabase = createClient();

  const handleFavoriteToggle = async (categoryId: string) => {
    try {
      const updatedCategories = categories.map(category => {
        if (category.id === categoryId) {
          const newFavoriteStatus = !category.isFavorite;
          // Update in Supabase
          supabase
            .from('prompt_categories')
            .update({ is_favorite: newFavoriteStatus })
            .eq('id', categoryId)
            .then(({ error }) => {
              if (error) throw error;
            });
          return { ...category, isFavorite: newFavoriteStatus };
        }
        return category;
      });
      setCategories(updatedCategories);
    } catch (error) {
      console.error('Failed to update favorite status:', error);
    }
  };

  const handleQueueToggle = async (categoryId: string) => {
    try {
      const updatedCategories = categories.map(category => {
        if (category.id === categoryId) {
          const newQueueStatus = !category.isInQueue;
          // Update in Supabase
          supabase
            .from('prompt_categories')
            .update({ is_in_queue: newQueueStatus })
            .eq('id', categoryId)
            .then(({ error }) => {
              if (error) throw error;
            });
          return { ...category, isInQueue: newQueueStatus };
        }
        return category;
      });
      setCategories(updatedCategories);
    } catch (error) {
      console.error('Failed to update queue status:', error);
    }
  };

  const handlePlayVideo = (promptText: string, videoId: string) => {
    setSelectedVideo({ promptText, videoId });
  };

  const calculateProgress = (prompts: Prompt[]) => {
    const completedPrompts = prompts.filter(prompt => prompt.promptResponses[0]).length;
    return Math.round((completedPrompts / prompts.length) * 100);
  };

  if (categories.length === 0) {
    return <p>No topics available.</p>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Topic</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell>{category.category}</TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Progress value={calculateProgress(category.prompts)} className="w-[60px]" />
                  <span>{calculateProgress(category.prompts)}%</span>
                </div>
              </TableCell>
              <TableCell>{category.prompts.every(prompt => prompt.promptResponses[0]) ? 'Completed' : 'In Progress'}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">View Prompts</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{category.category} Prompts</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        {category.prompts.map((prompt, index) => (
                          <div
                            key={prompt.id}
                            className={cn(
                              "grid grid-cols-[auto,1fr,auto] items-center gap-4 p-3 rounded-md transition-colors",
                              prompt.promptResponses[0] ? "text-gray-500 bg-gray-50" : "hover:bg-gray-100 cursor-pointer"
                            )}
                          >
                            <span className="text-sm font-medium text-gray-400">{index + 1}.</span>
                            <p className="text-sm">{prompt.promptText}</p>
                            {prompt.promptResponses[0] ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => prompt.promptResponses[0] && handlePlayVideo(prompt.promptText, prompt.promptResponses[0].video?.muxPlaybackId || '')}
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
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleQueueToggle(category.id)}
                        >
                          <QueueIcon isInQueue={category.isInQueue ?? false} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{category.isInQueue ? 'Remove from queue' : 'Add to queue'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleFavoriteToggle(category.id)}
                        >
                          <Star className={cn("h-5 w-5", category.isFavorite ? 'text-[#1B4332] fill-[#1B4332]' : 'text-gray-400')} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{category.isFavorite ? 'Remove from favorites' : 'Add to favorites'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button
                    size="sm"
                    onClick={() => router.push(`/role-sharer/dashboard/topic/${category.id}`)}
                    className="bg-[#1B4332] hover:bg-[#1B4332]/90 text-white"
                  >
                    Continue
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {selectedVideo && (
        <VideoPopup
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
          promptText={selectedVideo.promptText}
          videoId={selectedVideo.videoId}
          onNext={() => {}}
          onPrevious={() => {}}
          hasNext={false}
          hasPrevious={false}
        />
      )}
    </>
  );
}

