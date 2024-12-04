// components/RandomPrompt.tsx
// This component displays a random prompt with an option to record a response

import { Prompt } from '@/types/models';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';

interface RandomPromptProps {
  prompt: Prompt;
}

export default function RandomPrompt({ prompt }: RandomPromptProps) {
  return (
    <Card className="w-full border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300">
      <CardContent className="pt-6 pb-2">
        <div className="flex items-center justify-center mb-4">
          <Sparkles className="h-6 w-6 mr-2 text-[#1B4332]" />
          <h2 className="text-2xl font-semibold text-gray-900">Random Prompt</h2>
        </div>
        <p className="text-lg text-gray-700 text-center px-4">{prompt.promptText}</p>
      </CardContent>
      <CardFooter className="flex justify-center pb-6">
        <Link href={`/role-sharer/prompts/${prompt.id}/record`}>
          <Button 
            className="bg-[#1B4332] hover:bg-[#1B4332]/90 text-white"
          >
            {prompt.promptResponses?.length > 0 ? 'Record Another Response' : 'Record Your Response'}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

