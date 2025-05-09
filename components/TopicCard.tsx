// components/TopicCard.tsx
// This component displays a card for a specific prompt category, showing its progress and allowing navigation to the topic's details page.
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { CheckCircle2 } from 'lucide-react';
import { PromptListPopup } from '@/components/PromptListPopup';
import type { PromptCategory, Prompt, PromptResponse } from '@/types/models'; // Import canonical types

// Extend PromptCategory to include the counts passed from the server
interface ExtendedPromptCategory extends PromptCategory {
  completedPromptCount?: number; // Optional for backward compatibility if needed elsewhere
  totalPromptCount?: number;   // Optional for backward compatibility if needed elsewhere
}

interface TopicCardProps {
  // Use the extended type
  promptCategory: ExtendedPromptCategory; 
  onClick?: () => void;
  onFavoriteClick?: (e: React.MouseEvent) => void;
  onQueueClick?: (e: React.MouseEvent) => void;
  // Accept LISTENER role now
  currentRole?: 'SHARER' | 'EXECUTOR' | 'LISTENER'; 
  relationshipId?: string;
  sharerId?: string;
}

export default function TopicCard({ 
  promptCategory,
  onClick,
  onFavoriteClick,
  onQueueClick,
  currentRole = 'SHARER',
  relationshipId,
  sharerId
}: TopicCardProps) {
  const router = useRouter();
  const [isPromptListOpen, setIsPromptListOpen] = useState(false);
  
  // Log the sharerId prop received by TopicCard
  // console.log(`[TopicCard Scope] Rendering card for ${promptCategory.category}. Received sharerId: ${sharerId}`);

  // Use counts directly from the extended promptCategory prop
  // Provide default values (0) if the props are not passed (though they should be)
  const completedCount = promptCategory.completedPromptCount ?? 0;
  const totalCount = promptCategory.totalPromptCount ?? 0;
  // console.log(`[TOPICCARD] Completion stats from props: {completedCount: ${completedCount}, totalCount: ${totalCount}}`);
  // console.log(`[TOPICCARD] Raw Prompt array length: ${promptCategory.Prompt?.length}`);

  const progressValue = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Determine if the card should be interactive based on role
  const isListener = currentRole === 'LISTENER';

  useEffect(() => {
    // console.log(`[TOPICCARD] Rendering card for: ${promptCategory.category} | Role: ${currentRole}`);
    // console.log(`[TOPICCARD] Card has favorite: ${promptCategory.isFavorite}`);
    // console.log(`[TOPICCARD] Card has queue: ${promptCategory.isInQueue}`);
    // console.log(`[TOPICCARD] Current role: ${currentRole} sharerId: ${sharerId}`);
    // Log the counts received from props
    // console.log(`[TOPICCARD] Completion stats from props: {completedCount: ${completedCount}, totalCount: ${totalCount}}`);
    
    // Logging the raw prompt array length might still be useful for debugging
    const prompts = promptCategory.Prompt || []; 
    // console.log(`[TOPICCARD] Raw Prompt array length: ${prompts.length}`);
  }, [promptCategory, currentRole, sharerId, completedCount, totalCount]); // Add counts to dependency array
  
  const handleNavigate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Listeners cannot navigate to the topic page from the card
    if (isListener) {
      console.log("[TOPICCARD] Listener click ignored for navigation.");
      // Optionally open the prompt list instead?
      // setIsPromptListOpen(true);
      return;
    }
    
    const topicId = promptCategory.id;
    // console.log(`[TOPICCARD] Attempting navigation: {currentRole: ${currentRole}, sharerId: ${sharerId}, topicId: ${topicId}}`);

    if (!sharerId && currentRole === 'EXECUTOR') {
      console.error(`[TOPICCARD] Navigation failed: sharerId is missing for EXECUTOR.`);
      return;
    }

    if (!topicId) {
      console.error(`[TOPICCARD] Navigation failed: topicId is missing.`);
      return;
    }

    let path = '';
    if (currentRole === 'EXECUTOR') {
      path = `/role-executor/${sharerId}/topics/${topicId}`;
    } else if (currentRole === 'SHARER') {
      path = `/role-sharer/topics/${topicId}`;
    } else {
      console.warn(`[TOPICCARD] Navigation failed: Unknown currentRole: ${currentRole}`);
      return;
    }
    
    // console.log(`[TOPICCARD] Navigating to: ${path}`);
    router.push(path);
  };

  // Determine onClick handler for the card itself
  const cardClickHandler = isListener ? undefined : (onClick || handleNavigate);

  return (
    <>
      <Card 
        className={cn(
          "w-full min-h-[150px] border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] transition-all duration-300 relative flex flex-col rounded-2xl",
          !isListener && "hover:shadow-[8px_8px_0_0_#8fbc55]", // Only apply hover shadow if not listener
          isListener ? "cursor-default" : "cursor-pointer" // Change cursor based on role
        )}
        onClick={cardClickHandler} // Use determined handler
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
                    {/* Display counts from props */} 
                    {completedCount}/{totalCount}
                  </span>
                </div>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 mt-auto">
          <div className="flex items-center justify-between gap-2">
            {/* Left side controls: Now ENABLED for Listener */}
            <div className={cn("flex items-center gap-1")} >
              {/* Favorite Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        // No need to check isListener here, allow click
                        onFavoriteClick && onFavoriteClick(e);
                      }}
                      // Removed disabled={isListener}
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
                  {/* Removed !isListener condition */}
                  <TooltipContent>
                    <p>{promptCategory.isFavorite ? "Remove from my favorites" : "Add to my favorites"}</p> {/* Adjusted tooltip text */}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Queue Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        // No need to check isListener here, allow click
                        onQueueClick && onQueueClick(e);
                      }}
                      // Removed disabled={isListener}
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
                  {/* Removed !isListener condition */}
                  <TooltipContent>
                    <p>{promptCategory.isInQueue ? "Remove from my queue" : "Add to my queue"}</p> {/* Adjusted tooltip text */}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Right side controls: Keep View Prompts, keep Go To Topic hidden for listener */}
            <div className="flex items-center gap-2">
              {/* View Prompts Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsPromptListOpen(true);
                      }}
                      className="h-8 w-8 md:h-9 md:w-9 p-0 hover:bg-transparent"
                    >
                      <svg 
                        className="w-[18px] h-[18px] md:w-[20px] md:h-[20px] text-[#1B4332] hover:text-[#8fbc55] transition-colors"
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="3" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <line x1="8" y1="6" x2="21" y2="6"></line>
                        <line x1="8" y1="12" x2="21" y2="12"></line>
                        <line x1="8" y1="18" x2="21" y2="18"></line>
                        <line x1="3" y1="6" x2="3.01" y2="6"></line>
                        <line x1="3" y1="12" x2="3.01" y2="12"></line>
                        <line x1="3" y1="18" x2="3.01" y2="18"></line>
                      </svg>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View prompts</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Go to Topic/Record Button - Still HIDDEN for Listener */}
              {!isListener && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleNavigate} // Only Sharer/Executor navigate
                        className="h-8 w-8 md:h-9 md:w-9 p-0 hover:bg-transparent"
                      >
                        <svg 
                          className="w-[20px] h-[20px] md:w-[22px] md:h-[22px] text-[#1B4332] hover:text-[#8fbc55] transition-colors"
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="4" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        >
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                          <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {/* Tooltip differs based on role */}
                      <p>{currentRole === 'EXECUTOR' ? 'View topic' : 'Start recording'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PromptListPopup remains functional for all roles */}
      {isPromptListOpen && (
        <PromptListPopup
          promptCategory={promptCategory}
          sharerId={sharerId}
          isOpen={isPromptListOpen}
          onClose={() => setIsPromptListOpen(false)}
          currentRole={currentRole} // Pass currentRole to the popup
        />
      )}
    </>
  );
}

