// components/SharerDashboardClient.tsx
// Client component wrapper for Sharer Dashboard sections.
// Initializes the Zustand store and renders the sections.
'use client';

import React, { useEffect } from 'react';
import SharerTopicSection from './SharerTopicSection';
import { useSharerDashboardStore } from '@/stores/useSharerDashboardStore';

// Interface matching the data structure passed from the server page
interface TopicSectionCategory {
    id: string;
    category: string;
    description: string | null;
    theme: string | null;
    completedPromptCount?: number; 
    totalPromptCount?: number;   
    isFavorite?: boolean;
    isInQueue?: boolean;
    Prompt?: any[]; 
}

interface SharerDashboardClientProps {
    initialCategories: TopicSectionCategory[];
    sharerId: string;
    userId: string;
}

export default function SharerDashboardClient({
    initialCategories,
    sharerId,
    userId,
}: SharerDashboardClientProps) {
    // Get the setter function from the Zustand store
    const setCategories = useSharerDashboardStore((state) => state.setCategories);

    // Initialize the store with server-fetched data on mount
    useEffect(() => {
        console.log('[SharerDashboardClient] Initializing store with', initialCategories?.length || 0, 'categories.');
        setCategories(initialCategories || []);
        // Ensure store is cleared or reset if component unmounts or initialCategories changes drastically,
        // although for this dashboard page, it might not be necessary if it always mounts with fresh data.
        // return () => setCategories([]); // Optional cleanup
    }, [initialCategories, setCategories]);

    // Read categories directly from the store for rendering check (optional, sections read themselves)
    // const categoriesFromStore = useSharerDashboardStore((state) => state.categories);

    // Conditionally render based on initial data to avoid flash of empty content
    // Note: Each section will re-filter based on the store state internally
    const hasInitialData = initialCategories && initialCategories.length > 0;

    return (
        <div className="space-y-8"> 
            {/* Render sections using the store data implicitly */}
            {/* Pass sharerId down as needed */}
            <SharerTopicSection 
                title="Queue" 
                filterParam="queue" 
                currentRole="SHARER" 
                sharerId={sharerId} 
                userId={userId}
            />
            <SharerTopicSection 
                title="Favorites" 
                filterParam="favorites" 
                currentRole="SHARER" 
                sharerId={sharerId} 
                userId={userId}
            />
            <SharerTopicSection 
                title="Has Responses" 
                filterParam="has-responses" 
                currentRole="SHARER" 
                sharerId={sharerId} 
                userId={userId}
            />

            {/* Message if initial fetch had no categories */}
            {!hasInitialData && (
                <div className="text-center py-12">
                    <p className="text-lg text-gray-600">
                    No topics found. Explore all topics to get started!
                    </p>
                </div>
            )}
        </div>
    );
} 