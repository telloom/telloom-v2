// components/TopicCard.tsx
// This component displays a card for a specific prompt category, showing its progress and allowing navigation to the topic's details page.
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PromptCategory } from '@/types/models';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, Play } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export default function TopicCard({ promptCategory }: { promptCategory: PromptCategory }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('TopicCard - promptCategory:', JSON.stringify(promptCategory, null, 2));
  }, [promptCategory]);

  if (!promptCategory) {
    console.error('TopicCard - promptCategory is undefined');
    return <div>Error: Topic data is missing</div>;
  }

  if (!promptCategory.prompts) {
    console.error('TopicCard - promptCategory.prompts is undefined');
    return <div>Error: Prompt data is missing</div>;
  }

  const progress = Math.round((promptCategory.prompts.filter(p => p.promptResponses[0]).length / promptCategory.prompts.length) * 100);

  const handleContinue = () => {
    if (promptCategory.id) {
      router.push(`/role-sharer/dashboard/topic/${promptCategory.id}`);
    } else {
      console.error('TopicCard - promptCategory.id is undefined');
      setError('Unable to navigate: Topic ID is missing');
    }
  };

  return (
    <Card className="w-full hover:shadow-lg transition-all duration-300 border border-gray-200">
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-center">
          <span className="text-xl text-gray-800">{promptCategory.category || 'Untitled Category'}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">{progress}% complete</span>
          <span className="text-sm font-medium text-gray-600">
            {promptCategory.prompts.filter(p => p.promptResponses[0]).length}/{promptCategory.prompts.length} prompts
          </span>
        </div>
        <Progress 
          value={progress} 
          className="h-2" 
          style={{ '--progress-foreground': '#1B4332' } as React.CSSProperties}
        />
      </CardContent>
      <CardFooter className="flex justify-between pt-4">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="text-gray-600 hover:text-gray-800 border-[#1B4332] hover:bg-[#1B4332]/10">
              View Prompts
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{promptCategory.category || 'Untitled Category'} Prompts</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {promptCategory.prompts.map((prompt, index) => (
                <div
                  key={prompt.id || index}
                  className={cn(
                    "grid grid-cols-[auto,1fr,auto] items-center gap-4 p-3 rounded-md transition-colors",
                    prompt.promptResponses[0] ? "text-gray-500 bg-gray-50" : "hover:bg-gray-100 cursor-pointer"
                  )}
                >
                  <span className="text-sm font-medium text-gray-400">{index + 1}.</span>
                  <p className="text-sm">{prompt.promptText || 'Untitled Prompt'}</p>
                  {prompt.promptResponses[0] ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (prompt.promptResponses[0]?.id) {
                          router.push(`/role-sharer/dashboard/prompt-response/${prompt.promptResponses[0].id}`);
                        } else {
                          console.error('TopicCard - prompt.promptResponses[0].id is undefined', prompt);
                          setError('Unable to view response: Response ID is missing');
                        }
                      }}
                    >
                      <Play className="h-4 w-4 text-[#1B4332]" />
                    </Button>
                  ) : (
                    <span className="text-[#1B4332]">Not Recorded</span>
                  )}
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
        <Button 
          onClick={handleContinue}
          className="bg-[#1B4332] hover:bg-[#1B4332]/90 text-white"
        >
          Continue
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
      {error && <div className="text-red-500 mt-2">{error}</div>}
    </Card>
  );
}

