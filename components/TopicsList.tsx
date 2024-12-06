// components/TopicsList.tsx
// This component renders a list of topic categories, filtering them into in-progress, completed, and suggested sections.
"use client";

import { useEffect, useState } from 'react';
import { PromptCategory } from '@/types/models';
import TopicCard from './TopicCard';
import Link from 'next/link';
import { Star, ListPlus } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, A11y, Mousewheel } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/mousewheel';
import 'swiper/css/bundle';
import { useWindowSize } from '@/hooks/useWindowSize';

export default function TopicsList({ promptCategories }: { promptCategories: PromptCategory[] }) {
  const { width } = useWindowSize();
  const [slidesPerView, setSlidesPerView] = useState(3);
  const [randomSuggestedTopics, setRandomSuggestedTopics] = useState<PromptCategory[]>([]);

  useEffect(() => {
    // Update slides per view based on screen width
    if (width < 640) { // mobile
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
  }, [promptCategories]);

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
          {filteredCategories.map((category) => (
            <SwiperSlide key={category.id || category.category}>
              <TopicCard promptCategory={category} />
            </SwiperSlide>
          ))}
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

      {/* Other sections */}
      {inProgressCategories.length > 0 && renderTopicSection('In-Progress Topics', inProgressCategories)}
      {randomSuggestedTopics.length > 0 && renderTopicSection('Suggested Topics', randomSuggestedTopics)}
      {completedCategories.length > 0 && renderTopicSection('Completed Topics', completedCategories)}
    </div>
  );
}

