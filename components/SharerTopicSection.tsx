'use client';

import React, { useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Mousewheel, A11y } from 'swiper/modules';
import TopicCard from './TopicCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils'; // Import cn utility
import { useSharerDashboardStore } from '@/stores/useSharerDashboardStore'; // Import the store
import { toast } from 'sonner'; // Import toast

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/mousewheel';

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

interface SharerTopicSectionProps {
    title: string;
    filterParam: 'queue' | 'favorites' | 'has-responses'; // Filter for "See All" link
    currentRole: 'SHARER'; // This component is specific to Sharer dashboard structure
    sharerId: string; // Needed for TopicCard actions/navigation
}

export default function SharerTopicSection({
    title,
    filterParam,
    currentRole,
    sharerId
}: SharerTopicSectionProps) {

    // Get state and actions from the Zustand store
    const allCategories = useSharerDashboardStore((state) => state.categories);
    const storeToggleFavorite = useSharerDashboardStore((state) => state.toggleFavorite);
    const storeToggleQueue = useSharerDashboardStore((state) => state.toggleQueue);
    
    // Filter directly from the store's state
    const filteredCategories = useMemo(() => {
        if (!allCategories) return [];
        switch (filterParam) {
            case 'queue':
                return allCategories.filter(cat => cat.isInQueue);
            case 'favorites':
                return allCategories.filter(cat => cat.isFavorite);
            case 'has-responses':
                return allCategories.filter(cat => (cat.completedPromptCount ?? 0) > 0);
            default:
                return allCategories; 
        }
    }, [allCategories, filterParam]);

    const seeAllHref = `/role-sharer/topics?filter=${filterParam}`;
    const swiperInstanceClass = `swiper-section-${title.toLowerCase().replace(/\s+/g, '-')}`;

    // --- Toggle Favorite Logic --- 
    const handleFavoriteClick = useCallback(async (e: React.MouseEvent, category: TopicSectionCategory) => {
        e.preventDefault();
        e.stopPropagation();
        
        const categoryId = category.id;
        
        try {
            // Call store action - this handles the state update
            storeToggleFavorite(categoryId); 
            
            // Show toast based on the *expected* new state (after toggle)
            // Need to read the *current* state from category object passed to handler
            toast.success(!category.isFavorite ? 'Topic added to favorites' : 'Topic removed from favorites');
            
            // We could potentially call the Supabase RPC here as well 
            // for persistence, or handle persistence within the store action itself.
            // For now, focusing on UI update via store.
            // await supabase.rpc('toggle_topic_favorite', { ... });

        } catch (error) {
            // If store action itself could fail (unlikely for simple toggle),
            // add error handling. For now, assume store update succeeds.
            console.error("Error toggling favorite (potentially in store action or subsequent effect):", error);
            toast.error('Failed to update favorite status.');
            // Reverting optimistic update is harder now, relies on store potentially handling it.
        }
    }, [storeToggleFavorite]); // Dependencies: store action

    // --- Toggle Queue Logic --- 
    const handleQueueClick = useCallback(async (e: React.MouseEvent, category: TopicSectionCategory) => {
        e.preventDefault();
        e.stopPropagation();

        const categoryId = category.id;
        
        try {
            // Call store action
            storeToggleQueue(categoryId);
            
            // Show toast based on expected new state
            toast.success(!category.isInQueue ? 'Topic added to queue' : 'Topic removed from queue');
            
            // Persistence call could be here or in store
            // await supabase.rpc('toggle_topic_queue', { ... });

        } catch (error) {
            console.error("Error toggling queue (potentially in store action or subsequent effect):", error);
            toast.error('Failed to update queue status.');
        }
    }, [storeToggleQueue]); // Dependencies: store action

    return (
        <div className="mb-10"> {/* Consistent margin */}
            <div className="flex justify-between items-center mb-4"> {/* Title and Link */}
                <h2 className="text-2xl font-semibold">{title}</h2>
                {filteredCategories.length > 0 && (
                     <Button
                        asChild
                        variant="link"
                        className="text-[#1B4332] font-semibold px-0 hover:text-[#8fbc55]"
                    >
                        <Link href={seeAllHref}>
                            See All
                        </Link>
                    </Button>
                )}
            </div>

            {/* Render based on the *filtered* list */}
            {filteredCategories.length > 0 ? (
                // --- Original Swiper Implementation (Restored) ---
                <div className={cn("relative", swiperInstanceClass)}> 
                    <Swiper
                        modules={[Navigation, Mousewheel, A11y]}
                        spaceBetween={16} 
                        slidesPerView={'auto'} 
                        navigation={true} 
                        mousewheel 
                        className="!pb-2 !px-12" 
                        breakpoints={{
                            640: { slidesPerView: 2, spaceBetween: 16 },
                            768: { slidesPerView: 2, spaceBetween: 16 },
                            1024: { slidesPerView: 3, spaceBetween: 16 },
                            1280: { slidesPerView: 3, spaceBetween: 16 },
                        }}
                    >
                        {/* Map over the *filtered* list */}
                        {filteredCategories.map(category => (
                            <SwiperSlide key={category.id} className="!h-auto">
                                <TopicCard
                                    promptCategory={category as any} 
                                    currentRole={currentRole}
                                    sharerId={sharerId}
                                    onFavoriteClick={(e) => handleFavoriteClick(e, category)}
                                    onQueueClick={(e) => handleQueueClick(e, category)}
                                />
                            </SwiperSlide>
                        ))}
                    </Swiper>
                    {/* Style tag for arrow customization */}
                    <style jsx global>{`
                        .${swiperInstanceClass} .swiper-button-prev, 
                        .${swiperInstanceClass} .swiper-button-next {
                            --swiper-navigation-size: 24px; /* Smaller arrows */
                            --swiper-navigation-color: #1B4332; /* Primary Green */
                            top: 45%; /* Adjust vertical position */
                        }
                        .${swiperInstanceClass} .swiper-button-prev {
                            left: 10px; /* Position within padding */
                        }
                        .${swiperInstanceClass} .swiper-button-next {
                            right: 10px; /* Position within padding */
                        }
                        .${swiperInstanceClass} .swiper-button-prev:hover, 
                        .${swiperInstanceClass} .swiper-button-next:hover {
                            --swiper-navigation-color: #8fbc55; /* Secondary Green on hover */
                        }
                        .${swiperInstanceClass} .swiper-button-disabled {
                            opacity: 0.2;
                            cursor: auto;
                            pointer-events: none;
                         }
                    `}</style>
                </div>
             
             ) : (
                 <div className="p-6 border rounded-lg border-gray-200 bg-gray-50 text-center">
                      <p className="text-gray-500">
                         {title === 'Favorites' && 'No topics marked as favorite yet.'}
                         {title === 'Queue' && 'Your queue is empty. Add topics to record next.'}
                         {title === 'Has Responses' && 'No topics have responses yet. Start recording!'}
                     </p>
                 </div>
             )}
        </div>
    );
} 