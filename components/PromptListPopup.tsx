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
    if (isOpen && promptCategory && sharerId) {
      fetchPrompts();
    } else if (!isOpen) {
      setPrompts([]);
      return;
    }

    async function fetchPrompts() {
      setIsLoading(true);
      setPrompts([]);
      
      try {
        const { data: { user: rpcUser }, error: rpcUserError } = await supabase.auth.getUser();

        const { data, error } = await supabase.rpc('get_prompts_for_category', {
          p_category_id: promptCategory.id, 
          p_sharer_id: sharerId
        });

        if (error) {
          if (error.message.includes('permission denied')) {
            console.warn('[PromptListPopup] Permission denied by RPC function.');
          } else {
            throw error;
          }
          setPrompts([]);
        } else {
          const promptsWithResponseField = (data || []).map(p => ({ ...p, PromptResponse: [] }));
          setPrompts(promptsWithResponseField as Prompt[]);
        }
      } catch {
        setPrompts([]);
      } finally {
        setIsLoading(false);
      }
    }
  }, [isOpen, promptCategory, sharerId, supabase]);

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

  if (!promptCategory) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl w-[90vw] max-h-[90vh] flex flex-col p-0 sm:rounded-lg"
        aria-labelledby="prompt-list-title"
        aria-describedby="prompt-list-description"
      >
        <DialogHeader className="px-6 pt-8 pb-3 relative">
          <div className="flex items-center gap-2 group cursor-pointer pr-8" onClick={() => {
            if (categoryHref !== '#') { 
              router.push(categoryHref);
              onClose();
            }
          }}>
            <DialogTitle id="prompt-list-title" className="text-2xl font-bold text-[#1B4332]">{promptCategory.category}</DialogTitle>
            <ArrowRight className="h-6 w-6 text-[#1B4332] -translate-x-1 group-hover:translate-x-0 group-hover:text-[#8fbc55] transition-all duration-200" />
          </div>

          {/* Theme information moved below title, above description */}
          {promptCategory.theme && (
            <div className="px-0 pt-2 pb-1"> {/* Adjusted padding */}
              <span className="text-sm text-[#1B4332] px-3 py-1 bg-gray-200/50 rounded-full">
                {formatThemeName(promptCategory.theme)}
              </span>
            </div>
          )}

          <DialogDescription id="prompt-list-description" className="text-sm text-gray-600 mt-2 max-h-20 overflow-y-auto pretty-scrollbar"> {/* Added mt-2 */}
            {promptCategory.description}
          </DialogDescription>
        </DialogHeader>

        {/* Content area starts after DialogHeader */}
        <div className="px-6 pt-3 pb-6 flex-1 overflow-hidden">
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
                        "p-4 rounded-lg transition-all duration-200",
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