// components/UserAvatar.tsx
// This component handles fetching and displaying user avatars.

'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Avatar as AvatarComponent, AvatarImage, AvatarFallback } from './ui/avatar';

interface UserAvatarProps {
  avatarUrl: string | null;
  firstName?: string;
  lastName?: string;
  size?: string;
}

export default function UserAvatar({ avatarUrl, firstName, lastName, size }: UserAvatarProps) {
  const [avatarImageUrl, setAvatarImageUrl] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (avatarUrl) {
      const downloadImage = async (path: string) => {
        try {
          const { data, error } = await supabase.storage.from('avatars').download(path);
          if (error) {
            throw error;
          }
          const url = URL.createObjectURL(data);
          setAvatarImageUrl(url);
        } catch (error) {
          console.error('Error downloading avatar:', error);
        }
      };
      downloadImage(avatarUrl);
    }
  }, [avatarUrl, supabase]);

  const sizeClass = size ?? 'h-8 w-8';

  return (
    <AvatarComponent className={sizeClass}>
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