// components/PromptListPopup.tsx
// Displays a popup with a list of prompts for a topic category

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PromptCategory, Prompt } from "@/types/models"
import { X, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'
import { cn } from "@/lib/utils"
import { createClient } from '@/utils/supabase/client';

interface PromptListPopupProps {
  promptCategory: PromptCategory;
  sharerId?: string;
  isOpen: boolean;
  onClose: () => void;
  currentRole?: 'SHARER' | 'EXECUTOR' | 'LISTENER';
}

export function PromptListPopup({
  promptCategory,
  sharerId,
  isOpen,
  onClose,
  currentRole = 'SHARER'
}: PromptListPopupProps) {
  const router = useRouter();
  const supabase = createClient();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Log props at the start of the effect
    console.log(`[PromptListPopup useEffect] Running effect. isOpen: ${isOpen}, categoryId: ${promptCategory?.id}, received sharerId: ${sharerId}`);
    
    async function fetchPrompts() {
      if (!isOpen || !promptCategory?.id || !sharerId) {
        if (isOpen && !sharerId) {
            console.warn('[PromptListPopup] Cannot fetch prompts: sharerId is missing even though isOpen is true.');
        }
        return;
      }

      setIsLoading(true);
      setPrompts([]);
      
      try {
        console.log(`[PromptListPopup] Fetching prompts via RPC for category: ${promptCategory.id}, sharer: ${sharerId}`);
        const { data, error } = await supabase.rpc('get_prompts_for_category', {
          p_category_id: promptCategory.id, 
          p_sharer_id: sharerId
        });

        if (error) {
          console.error('[PromptListPopup] Error fetching prompts via RPC:', error);
          if (error.message.includes('permission denied')) {
            console.warn('[PromptListPopup] Permission denied by RPC function.');
          } else {
            throw error;
          }
          setPrompts([]);
        } else {
          console.log(`[PromptListPopup] Fetched ${data?.length || 0} prompts via RPC.`);
          const promptsWithResponseField = (data || []).map(p => ({ ...p, PromptResponse: [] }));
          setPrompts(promptsWithResponseField as Prompt[]);
        }
      } catch {
        console.error('Failed to fetch prompts for popup');
        setPrompts([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPrompts();
  }, [isOpen, promptCategory?.id, sharerId, supabase]);

  const sortedPrompts = [...prompts].sort((a, b) => {
    if (a.isContextEstablishing && !b.isContextEstablishing) return -1;
    if (!a.isContextEstablishing && b.isContextEstablishing) return 1;
    // Fallback to sorting by id if 'order' property is missing from the type
    return a.id.localeCompare(b.id);
  });

  const formatThemeName = (theme: string) => {
    if (!theme) return '';
    return theme
      .split('_')
      .map((word: string) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Calculate the correct href based on the role
  const categoryHref = useMemo(() => {
    if (!promptCategory?.id) return '#'; // Default fallback
    if (currentRole === 'EXECUTOR') {
      if (!sharerId) {
        console.warn('[PromptListPopup] Executor role but no sharerId provided for href.');
        return '#';
      }
      return `/role-executor/${sharerId}/topics/${promptCategory.id}`;
    }
    // Default to SHARER role URL
    return `/role-sharer/topics/${promptCategory.id}`;
  }, [currentRole, promptCategory?.id, sharerId]);

  console.log('[PromptListPopup Render] Current promptCategory:', promptCategory);
  console.log('[PromptListPopup Render] Calculated href:', categoryHref);

  // Ensure promptCategory is available before rendering the Dialog
  if (!promptCategory) {
    console.log('[PromptListPopup Render] promptCategory is null/undefined, returning null');
    return null; // Don't render dialog if category is missing
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden"
        aria-labelledby="prompt-list-title" 
        aria-describedby="prompt-list-description"
      >
        <div className="sticky top-0 z-10">
          <div className="flex flex-col gap-2 p-6 pt-8 relative bg-gradient-to-b from-background via-background to-transparent">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-6 rounded-full hover:bg-[#8fbc55] hover:text-white"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
            <DialogHeader className="mb-2">
              <div className="flex items-center gap-2 group cursor-pointer pr-8" onClick={() => {
                if (categoryHref !== '#') { // Only navigate if href is valid
                  router.push(categoryHref);
                  onClose();
                }
              }}>
                <DialogTitle id="prompt-list-title" className="text-2xl font-bold text-[#1B4332]">{promptCategory.category}</DialogTitle>
                <ArrowRight className="h-6 w-6 text-[#1B4332] -translate-x-1 group-hover:translate-x-0 group-hover:text-[#8fbc55] transition-all duration-200" />
              </div>
            </DialogHeader>
            <DialogDescription id="prompt-list-description" className="sr-only">
              List of prompts for the topic: {promptCategory.category}. Select a prompt to view or record a response.
            </DialogDescription>
            {promptCategory.theme && (
              <div className="text-sm text-muted-foreground">
                Theme: {formatThemeName(promptCategory.theme)}
              </div>
            )}
            {promptCategory.description && (
              <p className="text-base text-[#1B4332] mt-2">
                {promptCategory.description}
              </p>
            )}
          </div>
        </div>

        <div className="p-6 flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-[calc(65vh-180px)]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="h-[calc(65vh-180px)]">
              <div className="space-y-4 pr-4">
                {sortedPrompts.length > 0 ? sortedPrompts.map((prompt, index) => {
                  return (
                    <div 
                      key={prompt.id} 
                      className={cn(
                        "p-4 rounded-lg border-2 border-gray-200 transition-all duration-200",
                        "cursor-pointer hover:bg-gray-50/80"
                      )}
                      onClick={(e) => {
                        if (
                          e.target instanceof HTMLElement && 
                          !e.target.closest('button')
                        ) {
                          router.push(`/role-sharer/prompts/${prompt.id}`);
                          onClose();
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-muted-foreground min-w-[24px] font-medium">{index + 1}.</span>
                        <div className="flex-1">
                          <div className="flex items-start gap-2">
                            {prompt.isContextEstablishing && (
                              <span className="inline-flex shrink-0 px-2 py-0.5 text-xs font-medium bg-[#8fbc55] text-[#1B4332] rounded-full">
                                Start Here
                              </span>
                            )}
                            <p className="text-[#1B4332]">{prompt.promptText}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center text-muted-foreground py-8">
                    No prompts found for this topic.
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 