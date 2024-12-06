// app/role-sharer/page.tsx
// This component fetches and displays prompt categories, a random prompt, and sharer information on the dashboard.

import Header from '@/components/Header';
import { fetchPromptCategories, fetchRandomPrompt, fetchSharer } from '@/lib/data-fetching';
import TopicsList from '@/components/TopicsList';
import RandomPrompt from '@/components/RandomPrompt';
import TopicsAllButton from '@/components/TopicsAllButton';

export default async function SharerPage() {
  try {
    const [
      promptCategoriesResult,
      sharerResult,
      randomPromptResult
    ] = await Promise.allSettled([
      fetchPromptCategories(),
      fetchSharer(),
      fetchRandomPrompt()
    ]);

    const promptCategories = promptCategoriesResult.status === 'fulfilled' ? promptCategoriesResult.value : [];
    const sharer = sharerResult.status === 'fulfilled' ? sharerResult.value : null;
    const randomPrompt = randomPromptResult.status === 'fulfilled' ? randomPromptResult.value : null;

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Sharer Dashboard</h1>
          <TopicsAllButton />
        </div>
        
        {promptCategories.length === 0 && !randomPrompt && (
          <div className="text-center py-8">
            <p className="text-lg text-gray-600">
              No data available at the moment. Please try again later.
            </p>
          </div>
        )}

        {promptCategories.length > 0 && (
          <div className="mb-8">
            <TopicsList promptCategories={promptCategories} />
          </div>
        )}

        {randomPrompt && (
          <div className="mt-8">
            <RandomPrompt prompt={randomPrompt} />
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('Dashboard - Unexpected error:', error);
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Sharer Dashboard</h1>
        <p className="text-lg text-gray-600 text-center">
          Something went wrong. Please try again later.
        </p>
      </div>
    );
  }
}

