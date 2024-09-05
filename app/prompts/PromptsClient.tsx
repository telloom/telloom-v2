"use client"

import React from 'react';
import { Category } from './page';
import { useRouter } from 'next/navigation';

interface PromptsClientProps {
  initialCategories: Category[];
}

const PromptsClient: React.FC<PromptsClientProps> = ({ initialCategories }) => {
  const router = useRouter();

  const handlePromptClick = (promptId: string) => {
    router.push(`/prompts/${promptId}/respond`);
  };

  return (
    <div>
      {initialCategories.map((category) => (
        <div key={category.id}>
          <h2>{category.category}</h2>
          <ul>
            {category.prompts.map((prompt) => (
              <li key={prompt.id} onClick={() => handlePromptClick(prompt.id)}>
                {prompt.prompt}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default PromptsClient;