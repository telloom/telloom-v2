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
import { createClient } from '@/utils/supabase/client'; // <<< Import Supabase client

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
    userId: string; // <<< Add userId prop
}

export default function SharerTopicSection({
    title,
    filterParam,
    currentRole,
    sharerId,
    userId // <<< Destructure userId
}: SharerTopicSectionProps) {
    const supabase = createClient(); // <<< Initialize Supabase client

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
        const currentFavoriteState = category.isFavorite ?? false;
        
        storeToggleFavorite(categoryId);
        
        const favoriteToast = toast.loading(currentFavoriteState ? 'Removing from favorites...' : 'Adding to favorites...');
        try {
            console.log(`[SharerTopicSection] Calling RPC toggle_topic_favorite for category: ${categoryId}, user: ${userId}, role: SHARER`);
            const { error: rpcError } = await supabase.rpc('toggle_topic_favorite', { 
                p_profile_id: userId, // <<< Use userId prop
                p_category_id: categoryId,
                p_role: 'SHARER', // <<< Set role
                p_sharer_id: null // <<< Set sharerId to null for SHARER role
            });

            if (rpcError) {
                console.error('[SharerTopicSection] RPC Error toggling favorite:', rpcError);
                throw rpcError;
            }

            toast.success(!currentFavoriteState ? 'Topic added to favorites' : 'Topic removed from favorites', { id: favoriteToast });
            console.log(`[SharerTopicSection] Successfully toggled favorite for category: ${categoryId}`);

        } catch (error) {
            console.error("[SharerTopicSection] Failed to toggle favorite in DB:", error);
            toast.error(`Failed: ${error instanceof Error ? error.message : 'Could not update favorite status.'}`, { id: favoriteToast });
            storeToggleFavorite(categoryId); // Revert
        }
    }, [supabase, storeToggleFavorite, userId]); // <<< Add userId to dependencies

    // --- Toggle Queue Logic --- 
    const handleQueueClick = useCallback(async (e: React.MouseEvent, category: TopicSectionCategory) => {
        e.preventDefault();
        e.stopPropagation();

        const categoryId = category.id;
        const currentQueueState = category.isInQueue ?? false;

        storeToggleQueue(categoryId);
        
        const queueToast = toast.loading(currentQueueState ? 'Removing from queue...' : 'Adding to queue...');
        try {
            console.log(`[SharerTopicSection] Calling RPC toggle_topic_queue for category: ${categoryId}, user: ${userId}, role: SHARER`);
            const { error: rpcError } = await supabase.rpc('toggle_topic_queue', { 
                p_profile_id: userId, // <<< Use userId prop
                p_category_id: categoryId,
                p_role: 'SHARER', // <<< Set role
                p_sharer_id: null // <<< Set sharerId to null for SHARER role
            });

            if (rpcError) {
                 console.error('[SharerTopicSection] RPC Error toggling queue:', rpcError);
                throw rpcError;
            }
            
            toast.success(!currentQueueState ? 'Topic added to queue' : 'Topic removed from queue', { id: queueToast });
            console.log(`[SharerTopicSection] Successfully toggled queue for category: ${categoryId}`);

        } catch (error) {
            console.error("[SharerTopicSection] Failed to toggle queue in DB:", error);
            toast.error(`Failed: ${error instanceof Error ? error.message : 'Could not update queue status.'}`, { id: queueToast });
            storeToggleQueue(categoryId); // Revert
        }
    }, [supabase, storeToggleQueue, userId]); // <<< Add userId to dependencies

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
                            <SwiperSlide key={category.id} className="!h-auto max-w-xs">
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