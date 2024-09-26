import PromptsClient from './PromptsClient';
import { getAllPromptCategories, testDatabaseConnection } from '../../db/queries/prompt_categories-queries';
import { getPromptsByCategoryAction } from '../../actions/prompt-actions';
import { PromptCategory } from '../../db/schema/prompt_categories';

export type Category = {
  id: string; // Changed from number to string
  category: string;
  prompts: Array<{ id: string; prompt: string; contextEstablishingQuestion: boolean | null }>;
};

async function getPromptsGroupedByCategory(): Promise<Category[]> {
  try {
    console.log('Testing database connection...');
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      throw new Error('Database connection test failed');
    }
    console.log('Database connection test passed');

    console.log('Fetching all prompt categories...');
    const categories = await getAllPromptCategories();
    console.log('Categories fetched:', categories);

    if (!categories || categories.length === 0) {
      console.log('No categories found');
      return [];
    }

    const groupedPrompts: Category[] = [];

    for (const category of categories) {
      console.log(`Fetching prompts for category ${category.id}...`);
      const promptsResult = await getPromptsByCategoryAction(Number(category.id));
      console.log(`Prompts result for category ${category.id}:`, promptsResult);

      if (promptsResult.status === 'success' && Array.isArray(promptsResult.data)) {
        groupedPrompts.push({
          id: category.id.toString(), // Ensure id is converted to string
          category: category.category ?? '',
          prompts: promptsResult.data.map(prompt => ({
            id: prompt.id,
            prompt: prompt.prompt,
            contextEstablishingQuestion: prompt.contextEstablishingQuestion
          }))
        });
      } else {
        console.error(`Failed to fetch prompts for category ${category.id}:`, promptsResult);
      }
    }

    return groupedPrompts;
  } catch (error) {
    console.error('Error in getPromptsGroupedByCategory:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return [];
  }
}

export default async function PromptsPage() {
  try {
    console.log('Starting PromptsPage...');
    const categories = await getPromptsGroupedByCategory();
    console.log('Categories fetched in PromptsPage:', categories);
    
    if (categories.length === 0) {
      return <div>No prompts available. Please try again later.</div>;
    }
    
    return <PromptsClient initialCategories={categories} />;
  } catch (error) {
    console.error('Error in PromptsPage:', error);
    return <div>Error loading prompts. Please try again later. Error: {error instanceof Error ? error.message : String(error)}</div>;
  }
}