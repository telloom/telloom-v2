/**
 * File: hooks/useMediaQuery.ts
 * Description: A custom hook that returns a boolean indicating whether the current viewport
 * matches the provided media query string. This is useful for implementing responsive behavior
 * in components based on screen size.
 */

'use client';

import { useState, useEffect } from 'react';

/**
 * A hook that returns a boolean indicating if the current viewport matches the provided media query
 * @param query The media query to check against (e.g., '(max-width: 768px)')
 * @returns A boolean indicating whether the media query matches
 */
export function useMediaQuery(query: string): boolean {
  // Initialize with null to avoid hydration mismatch
  const [matches, setMatches] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    
    // Create a media query list
    const mediaQuery = window.matchMedia(query);
    
    // Set the initial value
    setMatches(mediaQuery.matches);

    // Define a callback function to handle changes
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add the event listener
    mediaQuery.addEventListener('change', handleChange);

    // Clean up
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]);

  // Return false during SSR to avoid hydration mismatch
  if (!mounted) return false;
  
  return matches;
}

export default useMediaQuery; 