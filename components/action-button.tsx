'use client';

import { Button } from '@/components/ui/button';
import { Loader2, Star, ListPlus, LucideIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ActionButtonProps {
  icon: 'star' | 'plus' | LucideIcon;
  isActive?: boolean;
  onClick: (e: React.MouseEvent) => void;
  tooltip: string;
  isLoading?: boolean;
  className?: string;
}

export function ActionButton({
  icon,
  isActive,
  onClick,
  tooltip,
  isLoading,
  className
}: ActionButtonProps) {
  const Icon = typeof icon === 'string'
    ? icon === 'star'
      ? Star
      : ListPlus
    : icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClick}
            disabled={isLoading}
            className={className}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Icon
                className={`h-4 w-4 ${isActive ? 'fill-current' : ''}`}
              />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 