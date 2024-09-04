'use client';

import { Suspense } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from '@/db';
import { promptCategoriesTable } from '@/db/schema/prompt_categories';
import { promptsPrimaryTable } from '@/db/schema/prompts_primary';

async function getPromptsGroupedByCategory(): Promise<Category[]> {
  const promptsWithCategories = await db.select({
    categoryId: promptCategoriesTable.id,
    category: promptCategoriesTable.category,
    promptId: promptsPrimaryTable.id,
    prompt: promptsPrimaryTable.prompt,
    promptType: promptsPrimaryTable.promptType,
  })
  .from(promptCategoriesTable)
  .leftJoin(promptsPrimaryTable, promptsPrimaryTable.promptCategoryId, promptCategoriesTable.id);

  const groupedPrompts = promptsWithCategories.reduce((acc: Record<number, { category: string, prompts: Array<{ id: string, prompt: string, promptType: string | null }> }>, item: {
    categoryId: number;
    category: string;
    promptId: string | null;
    prompt: string | null;
    promptType: string | null;
  }) => {
    if (!acc[item.categoryId]) {
      acc[item.categoryId] = {
        category: item.category,
        prompts: []
      };
    }
    if (item.promptId) {
      acc[item.categoryId].prompts.push({
        id: item.promptId,
        prompt: item.prompt,
        promptType: item.promptType
      });
    }
    return acc;
  }, {} as Record<number, { category: string, prompts: Array<{ id: string, prompt: string, promptType: string | null }> }>);

  return Object.values(groupedPrompts);
}

type Category = {
  category: string;
  prompts: Array<{ id: string; prompt: string; promptType: string | null }>;
};

function PromptList({ prompts }: { prompts: Array<{ id: string, prompt: string, promptType: string | null }> }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Prompt</TableHead>
          <TableHead>Type</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {prompts.map((prompt) => (
          <TableRow key={prompt.id}>
            <TableCell>{prompt.prompt}</TableCell>
            <TableCell>{prompt.promptType || 'N/A'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function PromptCategories({ categories }: { categories: Category[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {categories.map((category, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle>{category.category}</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible>
              <AccordionItem value="prompts">
                <AccordionTrigger>View Prompts</AccordionTrigger>
                <AccordionContent>
                  <PromptList prompts={category.prompts} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
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