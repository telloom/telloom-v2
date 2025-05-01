'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Pencil, Check, X, Loader2, Wand2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpandableTextSectionProps {
  title: string;
  text: string | null | undefined;
  placeholder: string;
  isEditing: boolean;
  isLoading: boolean; // General loading for save/cancel
  aiLoading?: boolean; // Loading for AI action
  value: string; // Controlled value for textarea
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  aiButtonLabel?: string;
  onAiAction?: () => void;
  editModeRows?: number;
  infoText?: string; // Optional text below title
  initialExpanded?: boolean;
  maxHeightClass?: string; // Tailwind class for max height e.g., 'max-h-60'
  aiActionSuccess?: boolean; // Add new prop for success state
}

export function ExpandableTextSection({
  title,
  text,
  placeholder,
  isEditing,
  isLoading,
  aiLoading = false,
  value,
  onChange,
  onEdit,
  onSave,
  onCancel,
  aiButtonLabel,
  onAiAction,
  editModeRows = 10,
  infoText,
  initialExpanded = false,
  maxHeightClass = 'max-h-60', // Default max height
  aiActionSuccess = false // Add prop with default value
}: ExpandableTextSectionProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const checkOverflow = () => {
      if (contentRef.current) {
        // Check if scrollHeight is greater than clientHeight
        setIsOverflowing(contentRef.current.scrollHeight > contentRef.current.clientHeight);
      }
    };

    // Check initially and on window resize
    checkOverflow();
    window.addEventListener('resize', checkOverflow);

    // Check again slightly after mount/text change in case of layout shifts
    const timeoutId = setTimeout(checkOverflow, 100);

    return () => {
        window.removeEventListener('resize', checkOverflow);
        clearTimeout(timeoutId);
    }
  }, [text]); // Re-check when text content changes

  // Reset expansion when editing starts/stops or text changes
  useEffect(() => {
    setIsExpanded(initialExpanded);
  }, [isEditing, initialExpanded, text]);

  return (
    <div className="shadow-none">
      <div className="flex flex-row justify-between items-center pb-2">
        <div className="flex items-center gap-2">
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            {infoText && !isEditing && <p className="text-xs text-muted-foreground mt-1">{infoText}</p>}
          </div>
          {!isEditing ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full pt-1" onClick={onEdit} disabled={isLoading}><Pencil className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Edit {title}</TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center space-x-1">
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="rounded-full" onClick={onSave} disabled={isLoading}><Check className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Save {title}</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="rounded-full hover:bg-red-100" onClick={onCancel} disabled={isLoading}><X className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Cancel</TooltipContent></Tooltip>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-1 flex-shrink-0">
          {!isEditing && onAiAction && aiButtonLabel && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={!aiLoading && !aiActionSuccess ? onAiAction : undefined}
                  disabled={aiLoading || aiActionSuccess || isLoading}
                  className={cn("rounded-full transition-all duration-300", aiActionSuccess ? "bg-green-100 border-green-300 text-green-700" : "")}
                >
                  {aiLoading ? (
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : aiActionSuccess ? (
                     <Check className="mr-2 h-4 w-4" />
                  ) : (
                     <Wand2 className="mr-2 h-4 w-4" />
                  )}
                  {aiActionSuccess ? "Success!" : aiButtonLabel}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {aiActionSuccess
                  ? 'Action successful!'
                  : aiLoading
                  ? 'Processing...'
                  : `Use AI to ${aiButtonLabel?.toLowerCase()}. This may take a few moments.`}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      <div>
        {isEditing ? (
          <Textarea
            placeholder={placeholder}
            rows={editModeRows}
            value={value}
            onChange={onChange}
            disabled={isLoading || aiLoading}
            className="w-full"
          />
        ) : (
          <div className="relative">
             <p
               ref={contentRef}
               className={cn(
                 "text-base text-gray-900 whitespace-pre-wrap transition-all duration-300 ease-in-out overflow-hidden",
                 !isExpanded && maxHeightClass // Apply max height only if not expanded
               )}
             >
               {text || placeholder}
             </p>
             {!isExpanded && isOverflowing && (
               <>
                 <div className={cn("absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none", maxHeightClass === 'max-h-60' ? 'h-16' : 'h-12')} />
                 <div className="text-center mt-0 pt-0 absolute bottom-[-10px] left-0 right-0 bg-white">
                   <Button variant="link" size="sm" onClick={() => setIsExpanded(true)} className="text-sm text-[#1B4332] hover:text-[#8fbc55]">
                     Show More <ChevronDown className="ml-1 h-4 w-4" />
                   </Button>
                 </div>
               </>
             )}
             {isExpanded && isOverflowing && (
               <div className="text-center mt-2">
                   <Button variant="link" size="sm" onClick={() => setIsExpanded(false)} className="text-sm text-[#1B4332] hover:text-[#8fbc55]">
                       Show Less <ChevronUp className="ml-1 h-4 w-4" />
                   </Button>
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
} 