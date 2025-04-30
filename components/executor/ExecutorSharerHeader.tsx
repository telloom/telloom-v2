"use client"; // Make this a Client Component to handle onError

/**
 * components/executor/ExecutorSharerHeader.tsx
 * Displays a consistent header for pages where an executor is managing a specific sharer's profile.
 */
import React, { useState, useEffect } from 'react'; // Import hooks
import { Card } from "@/components/ui/card";
import { getInitials } from '../../utils/name-helpers'; // Use relative path
import { normalizeAvatarUrl, getSignedAvatarUrl } from '@/utils/avatar'; // Import avatar helpers
import Image from 'next/image'; // Import Next Image

// Define the expected shape of the sharer profile data
interface SharerProfileData {
  avatarUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

interface ExecutorSharerHeaderProps {
  sharerProfile: SharerProfileData | null;
}

export function ExecutorSharerHeader({ sharerProfile }: ExecutorSharerHeaderProps) {
  // Log the received prop
  // console.log('[ExecutorSharerHeader] Received sharerProfile:', JSON.stringify(sharerProfile, null, 2));

  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [imageError, setImageError] = useState(false); // Add state for image loading error

  // Fetch signed URL when avatarUrl changes
  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (sharerProfile?.avatarUrl) {
        // console.log('[ExecutorSharerHeader] Avatar URL found, attempting to get signed URL.');
        setIsLoadingUrl(true);
        setSignedUrl(null); // Reset previous signed URL
        const normalizedUrl = normalizeAvatarUrl(sharerProfile.avatarUrl);
        try {
          const url = await getSignedAvatarUrl(normalizedUrl);
          // console.log('[ExecutorSharerHeader] Successfully got signed URL:', url);
          setSignedUrl(url);
        } catch (error) {
          console.error('[ExecutorSharerHeader] Failed to get signed avatar URL:', error);
          // Fallback to the original URL if signing fails (might still work if truly public)
          setSignedUrl(normalizedUrl);
        } finally {
          setIsLoadingUrl(false);
        }
      } else {
        // console.log('[ExecutorSharerHeader] No avatar URL found in profile.');
        setSignedUrl(null); // Clear signed URL if no base URL
      }
    };

    fetchSignedUrl();
  }, [sharerProfile?.avatarUrl]); // Dependency on the avatar URL

  // Reset imageError when URL changes
  useEffect(() => {
    setImageError(false);
  }, [sharerProfile?.avatarUrl]);

  if (!sharerProfile) {
    // Optionally return a loading skeleton or null if profile is strictly required
    return (
       <Card className="mb-6 p-4 flex items-center gap-4 bg-white shadow-sm animate-pulse border-none">
          <div className="h-10 w-10 rounded-full bg-gray-200"></div>
          <div className="h-4 w-48 bg-gray-200 rounded"></div>
       </Card>
    );
  }

  const displayName = `${sharerProfile.firstName || ''} ${sharerProfile.lastName || ''}`.trim();
  const fallbackInitials = getInitials(sharerProfile.firstName, sharerProfile.lastName);

  // console.log(`[ExecutorSharerHeader] Using signedUrl for Image src: ${signedUrl}`);
  // console.log(`[ExecutorSharerHeader] Image error state: ${imageError}`);

  return (
    <Card className="p-4 flex items-center gap-4 bg-white rounded-lg border-none shadow-none">
      {isLoadingUrl ? (
         <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
      ) : signedUrl && !imageError ? ( // Check for signedUrl AND no imageError
        <Image 
          src={signedUrl} 
          alt={displayName || 'Sharer Avatar'} 
          width={40} // Match h-10 w-10 (assuming 1 unit = 4px)
          height={40}
          className="h-10 w-10 rounded-full object-cover" 
          onError={() => {
             console.error(`[ExecutorSharerHeader] Failed to load avatar image (Image component). URL: ${signedUrl}`);
             setImageError(true); // Set error state on failure
           }}
        />
      ) : (
        // Show fallback if no signedUrl or if there was an image error
        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm font-medium">
          {fallbackInitials}
        </div>
      )}
      
      <span className="text-base md:text-lg font-medium text-gray-700">
        Managing for <span className="font-semibold text-gray-900">{displayName || 'Sharer'}</span>
      </span>
    </Card>
  );
} 