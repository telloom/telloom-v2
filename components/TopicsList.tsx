// components/TopicsList.tsx
// This component renders a list of topic categories, filtering them into in-progress, completed, and suggested sections.
"use client";

import { useEffect } from 'react';
import { PromptCategory } from '@/types/models';
import TopicCard from './TopicCard';
import Link from 'next/link';

export default function TopicsList({ promptCategories }: { promptCategories: PromptCategory[] }) {
  useEffect(() => {
    console.log('TopicsList - promptCategories:', JSON.stringify(promptCategories, null, 2));
  }, [promptCategories]);

  const renderTopicSection = (title: string, filteredCategories: PromptCategory[]) => (
    <section className="space-y-4">
      <div className="flex items-center space-x-4">
        <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
        <Link 
          href={`/role-sharer/dashboard/${title.toLowerCase().replace(/\s+/g, '-')}`} 
          className="text-sm text-[#1B4332] hover:underline"
        >
          View All
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCategories.slice(0, 3).map((category) => (
          <TopicCard key={category.id || category.category} promptCategory={category} />
        ))}
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

  const suggestedCategories = promptCategories.filter((category) => {
    if (!category.prompts) return false;
    return !category.prompts.some(prompt => prompt.promptResponses[0]);
  });

  return (
    <div className="space-y-12">
      {inProgressCategories.length > 0 && renderTopicSection('In-Progress Topics', inProgressCategories)}
      {suggestedCategories.length > 0 && renderTopicSection('Suggested Topics', suggestedCategories)}
      {completedCategories.length > 0 && renderTopicSection('Completed Topics', completedCategories)}
    </div>
  );
}

