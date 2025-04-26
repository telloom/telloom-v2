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
  icon?: 'star' | 'plus' | LucideIcon;
  isActive?: boolean;
  onClick: (e: React.MouseEvent) => void;
  tooltip?: string;
  isLoading?: boolean;
  loading?: boolean;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "primary" | null | undefined;
  size?: "default" | "sm" | "lg" | "icon" | null | undefined;
  children?: React.ReactNode;
  disabled?: boolean;
}

export function ActionButton({
  icon,
  isActive,
  onClick,
  tooltip,
  isLoading,
  loading,
  className,
  variant = "ghost",
  size = "icon",
  children,
  disabled
}: ActionButtonProps) {
  const Icon = typeof icon === 'string'
    ? icon === 'star'
      ? Star
      : ListPlus
    : icon;

  // Use either loading or isLoading prop
  const isButtonLoading = loading || isLoading;
  
  // If we don't have an icon but do have children, don't try to render the icon
  const buttonContent = isButtonLoading ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : Icon ? (
    <Icon
      className={`h-4 w-4 ${isActive ? 'fill-current' : ''}`}
    />
  ) : children;

  const button = (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled || isButtonLoading}
      className={className}
    >
      {buttonContent}
    </Button>
  );

  // Only wrap in tooltip if tooltip text is provided
  if (!tooltip) {
    return button;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {button}
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 