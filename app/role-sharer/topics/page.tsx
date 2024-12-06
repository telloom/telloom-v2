import { fetchPromptCategories } from '@/lib/data-fetching';
import TopicsTableAll from '@/components/TopicsTableAll';

export default async function SharerTopicsPage() {
  try {
    const promptCategories = await fetchPromptCategories();

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">All Topics</h1>
        </div>

        {promptCategories.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-lg text-gray-600">
              No topics available at the moment. Please try again later.
            </p>
          </div>
        ) : (
          <TopicsTableAll promptCategories={promptCategories} />
        )}
      </div>
    );
  } catch (error) {
    console.error('Topics page - Unexpected error:', error);
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">All Topics</h1>
        <p className="text-lg text-gray-600 text-center">
          Something went wrong. Please try again later.
        </p>
      </div>
    );
  }
}
