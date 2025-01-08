// components/PromptListPopup.tsx
// Displays a popup with a list of prompts for a topic category

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PromptCategory } from "@/types/models"
import { X, Video, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'
import { cn } from "@/lib/utils"

interface PromptListPopupProps {
  promptCategory: PromptCategory
  isOpen: boolean
  onClose: () => void
}

export default function PromptListPopup({ promptCategory, isOpen, onClose }: PromptListPopupProps) {
  const router = useRouter();
  
  // Sort prompts to show context-establishing prompts first
  const sortedPrompts = [...promptCategory.prompts].sort((a, b) => {
    if (a.isContextEstablishing && !b.isContextEstablishing) return -1;
    if (!a.isContextEstablishing && b.isContextEstablishing) return 1;
    return 0;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col gap-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{promptCategory.category}</DialogTitle>
          <DialogDescription>{promptCategory.description}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-4">
            {sortedPrompts.map((prompt, index) => {
              const hasResponse = prompt?.promptResponses?.[0]?.videos?.[0]?.muxPlaybackId;
              
              return (
                <div 
                  key={prompt.id} 
                  className={cn(
                    "p-4 rounded-lg border",
                    hasResponse && "cursor-pointer hover:border-[#8fbc55]"
                  )}
                  onClick={(e) => {
                    if (
                      e.target instanceof HTMLElement && 
                      !e.target.closest('button') && 
                      hasResponse
                    ) {
                      window.location.href = `/role-sharer/prompts/${prompt.id}`;
                      onClose();
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-muted-foreground min-w-[24px]">{index + 1}.</span>
                    <div className="flex-1">
                      <p>{prompt.promptText}</p>
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
      </DialogContent>
    </Dialog>
  );
} 