"use client"; // Make this a Client Component to handle onError

/**
 * components/listener/ListenerSharerHeader.tsx
 * Displays a consistent header for pages where a listener is viewing a specific sharer\'s profile.
 */
import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { getInitials } from '../../utils/name-helpers'; // Assuming utils/name-helpers exists relative to components
import { normalizeAvatarUrl, getSignedAvatarUrl } from '@/utils/avatar';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Define the expected shape of the sharer profile data
interface SharerProfileData {
  avatarUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

interface ListenerSharerHeaderProps {
  sharerId: string; // The ID of the sharer whose content is being viewed
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null; // This is the raw avatar URL from the database
}

export function ListenerSharerHeader({ sharerId, firstName, lastName, avatarUrl }: ListenerSharerHeaderProps) {
  const [signedDisplayUrl, setSignedDisplayUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (avatarUrl) {
        setIsLoadingUrl(true);
        setSignedDisplayUrl(null); // Reset previous URL
        setImageError(false);
        const normalizedUrl = normalizeAvatarUrl(avatarUrl);
        try {
          const url = await getSignedAvatarUrl(normalizedUrl); // Fetches signed URL
          setSignedDisplayUrl(url);
        } catch (error) {
          console.error('[ListenerSharerHeader] Error fetching signed avatar URL:', error);
          setImageError(true);
          setSignedDisplayUrl(null); // Ensure no broken image link is used
        }
        setIsLoadingUrl(false);
      } else {
        setSignedDisplayUrl(null); // No avatar URL provided
        setImageError(false);
      }
    };

    fetchSignedUrl();
  }, [avatarUrl]);

  const getInitials = (name1?: string | null, name2?: string | null) => {
    const firstInitial = name1?.[0] || '';
    const lastInitial = name2?.[0] || '';
    const initials = `${firstInitial}${lastInitial}`.toUpperCase();
    return initials || 'U'; // U for Unknown/User if no names are provided
  };

  const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'Sharer';

  return (
    <Card className="p-4 flex items-center gap-4 bg-white rounded-lg border-none shadow-none">
      {isLoadingUrl ? (
         <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
      ) : imageError || !signedDisplayUrl ? (
        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm font-medium">
          {getInitials(firstName, lastName)}
        </div>
      ) : (
        <Image
          src={signedDisplayUrl}
          alt={`${displayName}'s avatar`}
          width={40}
          height={40}
          className="h-10 w-10 rounded-full object-cover"
          onError={() => {
             console.error(`[ListenerSharerHeader] Failed to load avatar image. URL: ${signedDisplayUrl}`);
             setImageError(true);
           }}
          priority // Consider adding priority if this is often above the fold
        />
      )}

      <span className="text-base md:text-lg font-medium text-gray-700">
        Viewing stories from <span className="font-semibold text-gray-900">{displayName}</span>
      </span>
    </Card>
  );
} 