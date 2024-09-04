import PromptsClient from './PromptsClient';
import { getAllPromptCategories } from '../../db/queries/prompt_categories-queries';
import { getPromptsByCategoryAction } from '../../actions/prompts-primary-actions';

export type Category = {
  id: number;
  category: string;
  prompts: Array<{ id: string; prompt: string; contextEstablishingQuestion: boolean | null }>;
};

async function getPromptsGroupedByCategory(): Promise<Category[]> {
  try {
    console.log('Fetching all prompt categories...');
    const categories = await getAllPromptCategories();
    console.log('Categories fetched:', categories);

    const groupedPrompts: Category[] = [];

    for (const category of categories) {
      console.log(`Fetching prompts for category ${category.id}...`);
      const promptsResult = await getPromptsByCategoryAction(category.id);
      console.log(`Prompts result for category ${category.id}:`, promptsResult);

      if (promptsResult.status === 'success' && Array.isArray(promptsResult.data)) {
        groupedPrompts.push({
          id: category.id,
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
    throw error;
  }
}

export default async function PromptsPage() {
  try {
    console.log('Starting PromptsPage...');
    const categories = await getPromptsGroupedByCategory();
    console.log('Categories fetched in PromptsPage:', categories);
    return <PromptsClient initialCategories={categories} />;
  } catch (error) {
    console.error('Error in PromptsPage:', error);
    return <div>Error loading prompts. Please try again later. Error: {error instanceof Error ? error.message : String(error)}</div>;
  }
}