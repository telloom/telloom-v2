// app/role-sharer/page.tsx
// This component fetches and displays prompt categories, a random prompt, and sharer information on the dashboard.

import { fetchPromptCategories, fetchRandomPrompt, fetchSharer } from '@/lib/data-fetching';
import TopicsList from '@/components/TopicsList';
import RandomPrompt from '@/components/RandomPrompt';

export default async function Dashboard() {
  console.log('Dashboard - Component started');

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

    console.log('Dashboard - Data fetching completed');
    console.log('promptCategoriesResult:', JSON.stringify(promptCategoriesResult, null, 2));
    console.log('sharerResult:', JSON.stringify(sharerResult, null, 2));
    console.log('randomPromptResult:', JSON.stringify(randomPromptResult, null, 2));

    const promptCategories = promptCategoriesResult.status === 'fulfilled' ? promptCategoriesResult.value : [];
    const sharer = sharerResult.status === 'fulfilled' ? sharerResult.value : null;
    const randomPrompt = randomPromptResult.status === 'fulfilled' ? randomPromptResult.value : null;

    console.log('Processed data:');
    console.log('promptCategories:', JSON.stringify(promptCategories, null, 2));
    console.log('sharer:', JSON.stringify(sharer, null, 2));
    console.log('randomPrompt:', JSON.stringify(randomPrompt, null, 2));

    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Welcome to Your Dashboard</h1>
        
        {/* Show message if no data is available */}
        {promptCategories.length === 0 && !randomPrompt && (
          <div className="text-center py-8">
            <p className="text-lg text-gray-600">
              No data available at the moment. Please try again later.
            </p>
          </div>
        )}

        {/* Show data if available */}
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
        <h1 className="text-3xl font-bold mb-8">Welcome to Your Dashboard</h1>
        <p className="text-lg text-gray-600 text-center">
          Something went wrong. Please try again later.
        </p>
      </div>
    );
  }
}

