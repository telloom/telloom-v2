"use client"

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface Category {
  id: string;
  category: string;
  prompts: Array<{ id: string; prompt: string }>;
}

interface PromptsClientProps {
  initialCategories: Category[];
}

const PromptsClient: React.FC<PromptsClientProps> = ({ initialCategories }) => {
  const router = useRouter();

  const handlePromptClick = (promptId: string) => {
    router.push(`/prompts/${promptId}/respond`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {initialCategories.map((category) => (
        <Card key={category.id} className="flex flex-col">
          <CardHeader>
            <CardTitle>{category.category}</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="prompts">
                <AccordionTrigger />
                <AccordionContent>
                  {category.prompts.map((prompt) => (
                    <motion.div
                      key={prompt.id}
                      whileHover={{ scale: 1.02 }}
                      className="p-2 my-2 rounded-md cursor-pointer hover:bg-gray-100 overflow-hidden"
                      onClick={() => handlePromptClick(prompt.id)}
                    >
                      {prompt.prompt}
                    </motion.div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PromptsClient;