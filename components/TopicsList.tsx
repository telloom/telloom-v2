// components/TopicsList.tsx
// This component renders a list of topic categories, filtering them into in-progress, completed, and suggested sections.
"use client";

import React, { useEffect, useState } from 'react';
import { PromptCategory } from '@/types/models';
import TopicCard from './TopicCard';
import Link from 'next/link';
import { Star, ListPlus, MessageSquare } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, A11y, Mousewheel } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/mousewheel';
import 'swiper/css/bundle';
import { useWindowSize } from '@/hooks/useWindowSize';
import { createBrowserClient } from '@supabase/ssr'

export default function TopicsList({ promptCategories: initialPromptCategories }: { promptCategories: PromptCategory[] }) {
  const { width } = useWindowSize();
  const [slidesPerView, setSlidesPerView] = useState(3);
  const [randomSuggestedTopics, setRandomSuggestedTopics] = useState<PromptCategory[]>([]);
  const [promptCategories, setPromptCategories] = useState(initialPromptCategories);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    // Update slides per view based on screen width
    if (width < 768) { // Changed from 640 to 768 to switch to single column earlier
      setSlidesPerView(1);
    } else if (width < 1024) { // tablet
      setSlidesPerView(2);
    } else { // desktop
      setSlidesPerView(3);
    }
  }, [width]);

  useEffect(() => {
    // Get all topics that have no responses
    const unrespondedTopics = promptCategories.filter((category) => {
      if (!category.prompts) return false;
      return !category.prompts.some(prompt => prompt.promptResponses[0]);
    });

    // Shuffle array and take 9 items
    const shuffled = [...unrespondedTopics].sort(() => Math.random() - 0.5);
    setRandomSuggestedTopics(shuffled.slice(0, 9));
  }, []);  // Only run once on mount, don't re-shuffle when categories update

  // Function to update a category's favorite/queue status
  const updateCategoryStatus = (categoryId: string, updates: { isFavorite?: boolean; isInQueue?: boolean }) => {
    setPromptCategories(prevCategories => 
      prevCategories.map(category => 
        category.id === categoryId
          ? { ...category, ...updates }
          : category
      )
    );

    // Also update the status in randomSuggestedTopics if the category exists there
    setRandomSuggestedTopics(prevTopics =>
      prevTopics.map(category =>
        category.id === categoryId
          ? { ...category, ...updates }
          : category
      )
    );
  };

  const handleFavoriteClick = async (e: React.MouseEvent, category: PromptCategory) => {
    e.stopPropagation();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return;

    const newValue = !category.isFavorite;

    // Immediately update local state
    updateCategoryStatus(category.id, { isFavorite: newValue });

    if (newValue) {
      // Add to favorites
      const { error } = await supabase
        .from('TopicFavorite')
        .insert({ profileId: user.id, promptCategoryId: category.id });

      if (error) {
        console.error('Error adding to favorites:', error);
        // Revert on error
        updateCategoryStatus(category.id, { isFavorite: !newValue });
      }
    } else {
      // Remove from favorites
      const { error } = await supabase
        .from('TopicFavorite')
        .delete()
        .eq('profileId', user.id)
        .eq('promptCategoryId', category.id);

      if (error) {
        console.error('Error removing from favorites:', error);
        // Revert on error
        updateCategoryStatus(category.id, { isFavorite: !newValue });
      }
    }
  };

  const handleQueueClick = async (e: React.MouseEvent, category: PromptCategory) => {
    e.stopPropagation();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return;

    const newValue = !category.isInQueue;

    // Immediately update local state
    updateCategoryStatus(category.id, { isInQueue: newValue });

    if (newValue) {
      // Add to queue
      const { error } = await supabase
        .from('TopicQueueItem')
        .insert({ profileId: user.id, promptCategoryId: category.id });

      if (error) {
        console.error('Error adding to queue:', error);
        // Revert on error
        updateCategoryStatus(category.id, { isInQueue: !newValue });
      }
    } else {
      // Remove from queue
      const { error } = await supabase
        .from('TopicQueueItem')
        .delete()
        .eq('profileId', user.id)
        .eq('promptCategoryId', category.id);

      if (error) {
        console.error('Error removing from queue:', error);
        // Revert on error
        updateCategoryStatus(category.id, { isInQueue: !newValue });
      }
    }
  };

  const renderTopicCard = (category: PromptCategory) => (
    <SwiperSlide key={category.id}>
      <TopicCard 
        promptCategory={category} 
        onFavoriteClick={(e) => handleFavoriteClick(e, category)}
        onQueueClick={(e) => handleQueueClick(e, category)}
      />
    </SwiperSlide>
  );

  const renderTopicSection = (title: string, filteredCategories: PromptCategory[]) => (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
          <Link 
            href={`/role-sharer/dashboard/${title.toLowerCase().replace(/\s+/g, '-')}`} 
            className="text-sm text-[#1B4332] hover:underline"
          >
            View All
          </Link>
        </div>
      </div>
      <div className="relative">
        <Swiper
          modules={[Navigation, A11y, Mousewheel]}
          spaceBetween={24}
          slidesPerView={slidesPerView}
          navigation={{
            prevEl: '.swiper-button-prev',
            nextEl: '.swiper-button-next',
          }}
          mousewheel={{
            forceToAxis: true,
            sensitivity: 1,
          }}
          className="!overflow-visible"
        >
          {filteredCategories.map(renderTopicCard)}
          <div className="swiper-button-prev"></div>
          <div className="swiper-button-next"></div>
        </Swiper>
      </div>
    </section>
  );

  const renderEmptySection = (title: string, icon: React.ReactNode, message: string) => (
    <section className="space-y-4">
      <div className="flex items-center space-x-4">
        <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="border-2 border-dashed border-gray-200 rounded-lg p-8">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          {icon}
          <p className="text-gray-600">{message}</p>
          <Link 
            href="/role-sharer/topics" 
            className="text-[#1B4332] hover:underline font-medium"
          >
            Browse Topics
          </Link>
        </div>
      </div>
    </section>
  );

  const inProgressCategories = promptCategories.filter((category) => {
    if (!category.prompts) return false;
    return category.prompts.some(prompt => prompt.promptResponses[0]) && 
           !category.prompts.every(prompt => prompt.promptResponses[0]);
  });

  const completedCategories = promptCategories.filter((category) => {
    if (!category.prompts) return false;
    return category.prompts.every(prompt => prompt.promptResponses[0]);
  });

  const favoriteCategories = promptCategories.filter((category) => category.isFavorite);
  const queuedCategories = promptCategories.filter((category) => category.isInQueue);

  const topicsWithResponses = promptCategories.filter((category) => {
    if (!category.prompts) return false;
    return category.prompts.some(prompt => prompt.promptResponses.length > 0);
  });

  return (
    <div className="space-y-12">
      {/* Favorites Section */}
      {favoriteCategories.length > 0 ? (
        renderTopicSection('Favorite Topics', favoriteCategories)
      ) : (
        renderEmptySection(
          'Favorite Topics',
          <Star className="h-12 w-12 text-gray-400" />,
          "Add your first favorite topic by clicking the star icon on any topic you'd like to save for later."
        )
      )}

      {/* Queue Section */}
      {queuedCategories.length > 0 ? (
        renderTopicSection('Topics Queue', queuedCategories)
      ) : (
        renderEmptySection(
          'Topics Queue',
          <ListPlus className="h-12 w-12 text-gray-400" />,
          "Build your recording queue by adding topics you plan to work on next."
        )
      )}

      {/* Topics with Responses Section */}
      {topicsWithResponses.length > 0 ? (
        renderTopicSection('Topics with Responses', topicsWithResponses)
      ) : (
        renderEmptySection(
          'Topics with Responses',
          <MessageSquare className="h-12 w-12 text-gray-400" />,
          "Start recording responses to your topics and they'll appear here. Share your stories and experiences!"
        )
      )}

      {/* Other sections */}
      {inProgressCategories.length > 0 && renderTopicSection('In-Progress Topics', inProgressCategories)}
      {randomSuggestedTopics.length > 0 && renderTopicSection('Suggested Topics', randomSuggestedTopics)}
      {completedCategories.length > 0 && renderTopicSection('Completed Topics', completedCategories)}
    </div>
  );
}

