/**
 * Utility functions for handling avatar URLs
 */

import { createClient } from '@/utils/supabase/client';

/**
 * Gets a signed URL for an avatar
 */
export const getSignedAvatarUrl = async (avatarUrl: string | null): Promise<string | null> => {
  if (!avatarUrl) return null;
  
  try {
    const supabase = createClient();
    
    // Remove any query parameters first
    const urlWithoutQuery = avatarUrl.split('?')[0];
    
    // Extract just the file path after /avatars/
    const matches = urlWithoutQuery.match(/\/avatars\/([^?]+)/);
    
    const filePath = matches ? matches[1] : null;
    
    if (!filePath) {
      console.error('Could not extract file path from URL:', {
        avatarUrl,
        urlWithoutQuery,
        matches,
        decodedUrl: decodeURIComponent(avatarUrl)
      });
      return avatarUrl; // Fall back to public URL
    }

    // Add retry logic for getting signed URL
    let attempts = 0;
    const maxAttempts = 3;
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    while (attempts < maxAttempts) {
      try {
        const { data, error } = await supabase
          .storage
          .from('avatars')
          .createSignedUrl(filePath, 3600); // URL valid for 1 hour

        if (error) {
          console.error(`Attempt ${attempts + 1} failed:`, error);
          attempts++;
          if (attempts < maxAttempts) {
            await delay(1000 * attempts); // Exponential backoff
            continue;
          }
          return avatarUrl; // Fall back to public URL after all retries fail
        }

        // Add cache busting to signed URL
        const signedUrlWithCache = `${data.signedUrl}&v=${Date.now()}`;
        
        return signedUrlWithCache;
      } catch (retryError) {
        console.error(`Attempt ${attempts + 1} failed with error:`, retryError);
        attempts++;
        if (attempts < maxAttempts) {
          await delay(1000 * attempts);
          continue;
        }
        return avatarUrl; // Fall back to public URL after all retries fail
      }
    }

    return avatarUrl; // Fall back to public URL if all retries fail
  } catch (error) {
    console.error('Error in getSignedAvatarUrl:', {
      error,
      avatarUrl,
      decodedUrl: decodeURIComponent(avatarUrl),
      stack: error instanceof Error ? error.stack : undefined
    });
    return avatarUrl; // Fall back to public URL
  }
};

/**
 * Normalizes an avatar URL by removing any existing cache busting parameters
 * and adding a new one
 */
export const normalizeAvatarUrl = (url: string | null): string | null => {
  if (!url) return null;
  
  try {
    // Remove any existing cache busting parameters
    const baseUrl = url.split('?')[0];
    // Add new cache busting parameter
    const normalized = `${baseUrl}?v=${Date.now()}`;

    return normalized;
  } catch (error) {
    console.error('Error normalizing avatar URL:', {
      url,
      error,
      stack: error instanceof Error ? error.stack : undefined
    });
    return url;
  }
};

/**
 * Gets the base URL without any cache busting parameters
 */
export const getBaseAvatarUrl = (url: string | null): string | null => {
  if (!url) return null;
  
  try {
    const baseUrl = url.split('?')[0];
    return baseUrl;
  } catch (error) {
    console.error('Error getting base avatar URL:', {
      url,
      error,
      stack: error instanceof Error ? error.stack : undefined
    });
    return url;
  }
}; 