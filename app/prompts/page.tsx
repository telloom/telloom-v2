import { Suspense } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../components/ui/accordion";
import { db } from '../../db/db';
import { promptCategoriesTable } from '../../db/schema/prompt_categories';
import { promptsPrimaryTable } from '../../db/schema/prompts_primary';
import { eq } from 'drizzle-orm';

async function getPromptsGroupedByCategory(): Promise<Category[]> {
  const promptsWithCategories = await db.select({
    categoryId: promptCategoriesTable.id,
    category: promptCategoriesTable.category,
    promptId: promptsPrimaryTable.id,
    prompt: promptsPrimaryTable.prompt,
    contextEstablishingQuestion: promptsPrimaryTable.contextEstablishingQuestion,
  })
  .from(promptCategoriesTable)
  .leftJoin(promptsPrimaryTable, eq(promptsPrimaryTable.promptCategoryId, promptCategoriesTable.id));

  const groupedPrompts = promptsWithCategories.reduce((acc: Record<number, Category>, item) => {
    if (!acc[item.categoryId]) {
      acc[item.categoryId] = {
        category: item.category ?? '',
        prompts: []
      };
    }
    if (item.promptId && item.prompt) {
      acc[item.categoryId].prompts.push({
        id: item.promptId,
        prompt: item.prompt,
        contextEstablishingQuestion: item.contextEstablishingQuestion
      });
    }
    return acc;
  }, {} as Record<number, Category>);

  return Object.values(groupedPrompts);
}

type Category = {
  category: string;
  prompts: Array<{ id: string; prompt: string; contextEstablishingQuestion: boolean | null }>;
};

function PromptList({ prompts }: { prompts: Category['prompts'] }) {
  const sortedPrompts = [...prompts].sort((a, b) => {
    if (a.contextEstablishingQuestion && !b.contextEstablishingQuestion) return -1;
    if (!a.contextEstablishingQuestion && b.contextEstablishingQuestion) return 1;
    return 0;
  });

  return (
    <ul className="space-y-2">
      {sortedPrompts.map((prompt) => (
        <li key={prompt.id}>
          <Link 
            href={`/prompts/${prompt.id}`} 
            className="block p-2 rounded-md transition-colors duration-200 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {prompt.prompt}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Column({ categories }: { categories: Category[] }) {
  return (
    <div className="flex flex-col space-y-6">
      {categories.map((category, index) => (
        <Accordion type="single" collapsible key={index}>
          <AccordionItem value={`category-${index}`}>
            <Card>
              <CardHeader>
                <AccordionTrigger className="text-xl font-bold hover:no-underline w-full text-left">
                  <CardTitle>{category.category}</CardTitle>
                </AccordionTrigger>
              </CardHeader>
              <AccordionContent>
                <CardContent>
                  <PromptList prompts={category.prompts} />
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>
        </Accordion>
      ))}
    </div>
  );
}

function PromptCategories({ categories }: { categories: Category[] }) {
  // Divide categories into three columns
  const columnCount = 3;
  const categoriesPerColumn = Math.ceil(categories.length / columnCount);
  const columns = Array.from({ length: columnCount }, (_, i) =>
    categories.slice(i * categoriesPerColumn, (i + 1) * categoriesPerColumn)
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {columns.map((columnCategories, index) => (
        <Column key={index} categories={columnCategories} />
      ))}
    </div>
  );
}

export default async function PromptsPage() {
  const categories = await getPromptsGroupedByCategory();
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Prompts by Category</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <PromptCategories categories={categories} />
      </Suspense>
    </div>
  );
}