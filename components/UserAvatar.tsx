'use client';

// This component displays the user's avatar image or initials.

import React from 'react';
import { Avatar as AvatarComponent, AvatarImage, AvatarFallback } from './ui/avatar';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  avatarImageUrl: string | null;
  firstName?: string;
  lastName?: string;
  size?: string;
  className?: string;
}

export default function UserAvatar({ avatarImageUrl, firstName, lastName, size, className }: UserAvatarProps) {
  const sizeClass = size ?? 'h-8 w-8';

  return (
    <AvatarComponent className={cn(sizeClass, className)}>
      {avatarImageUrl ? (
        <AvatarImage src={avatarImageUrl} alt={`${firstName}'s avatar`} />
      ) : (
        <AvatarFallback>
          {getInitials(firstName ?? '', lastName ?? '')}
        </AvatarFallback>
      )}
    </AvatarComponent>
  );
}

const getInitials = (firstName: string = '', lastName: string = '') => {
  return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
};