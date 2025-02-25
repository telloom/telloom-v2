// components/PromptListPopup.tsx
// Displays a popup with a list of prompts for a topic category

'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PromptCategory } from "@/types/models"
import { X, Video, CheckCircle2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'
import { cn } from "@/lib/utils"

interface PromptListPopupProps {
  promptCategory: PromptCategory;
  isOpen: boolean;
  onClose: () => void;
}

export function PromptListPopup({
  promptCategory,
  isOpen,
  onClose,
}: PromptListPopupProps) {
  const router = useRouter();
  
  // Sort prompts to show context-establishing prompts first
  const sortedPrompts = [...(promptCategory.prompts || [])].sort((a, b) => {
    if (a.isContextEstablishing && !b.isContextEstablishing) return -1;
    if (!a.isContextEstablishing && b.isContextEstablishing) return 1;
    return 0;
  });

  const formatThemeName = (theme: string) => {
    if (!theme) return '';
    return theme
      .split('_')
      .map((word: string) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden" aria-describedby="prompt-list-description">
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
                router.push(`/role-sharer/topics/${promptCategory.id}`);
                onClose();
              }}>
                <DialogTitle className="text-2xl font-bold text-[#1B4332]">{promptCategory.category}</DialogTitle>
                <ArrowRight className="h-6 w-6 text-[#1B4332] -translate-x-1 group-hover:translate-x-0 group-hover:text-[#8fbc55] transition-all duration-200" />
              </div>
            </DialogHeader>
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
          <ScrollArea className="h-[calc(65vh-180px)]">
            <div className="space-y-4 pr-4">
              {sortedPrompts.map((prompt, index) => {
                const hasResponse = Array.isArray(prompt.PromptResponse) && prompt.PromptResponse.length > 0;
                
                return (
                  <div 
                    key={prompt.id} 
                    className={cn(
                      "p-4 rounded-lg border-2 border-gray-200 transition-all duration-200",
                      hasResponse && "cursor-pointer hover:bg-gray-50/80"
                    )}
                    onClick={(e) => {
                      if (
                        e.target instanceof HTMLElement && 
                        !e.target.closest('button') && 
                        hasResponse
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
                        {hasResponse && (
                          <div className="mt-2 flex items-center text-sm text-[#8fbc55]">
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Recorded
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
} 