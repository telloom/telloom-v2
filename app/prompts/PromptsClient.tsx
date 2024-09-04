"use client"

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../components/ui/accordion";
import { Category } from './page';

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
      {categories.map((category) => (
        <Accordion type="single" collapsible key={category.id}>
          <AccordionItem value={`category-${category.id}`}>
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

export default function PromptsClient({ initialCategories }: { initialCategories: Category[] }) {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Prompts by Category</h1>
      {initialCategories.length > 0 ? (
        <PromptCategories categories={initialCategories} />
      ) : (
        <p>No categories found.</p>
      )}
    </div>
  );
}