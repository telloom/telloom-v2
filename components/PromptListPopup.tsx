// components/PromptListPopup.tsx
// Displays a popup with a list of prompts for a topic category

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PromptCategory } from "@/types/models"
import { X, ArrowRight } from "lucide-react"
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
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 gap-0">
        <div className="sticky top-0 bg-background rounded-t-lg border-b z-20 px-6 py-4">
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-1.5">
              <DialogTitle>{promptCategory.category}</DialogTitle>
              {promptCategory.description && (
                <p className="text-muted-foreground">{promptCategory.description}</p>
              )}
            </div>
            <DialogClose asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="shrink-0 w-6 h-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
          <Button
            onClick={() => router.push(`/role-sharer/topics/${promptCategory.id}`)}
            className="bg-[#1B4332] hover:bg-[#1B4332]/90 text-white flex items-center gap-2 h-10 px-6 rounded-full"
          >
            Start Recording
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-4">
            {sortedPrompts.map((prompt, index) => (
              <div 
                key={prompt.id} 
                className="p-4 rounded-lg border"
              >
                <div className="flex items-start gap-3">
                  <span className="text-muted-foreground min-w-[24px]">{index + 1}.</span>
                  <div>
                    <p>{prompt.promptText}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
} 