// components/TopicsTableAll.tsx
// This component displays all topics in a table format with their completion status

import { PromptCategory } from '@/types/models';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle2, Circle, MinusCircle } from 'lucide-react';
import Link from 'next/link';

interface TopicsTableAllProps {
  promptCategories: PromptCategory[];
}

export default function TopicsTableAll({ promptCategories }: TopicsTableAllProps) {
  const getCompletionStatus = (category: PromptCategory) => {
    if (!category.prompts || category.prompts.length === 0) return 'not-started';
    
    const hasResponses = category.prompts.some(prompt => prompt.promptResponses[0]);
    const allCompleted = category.prompts.every(prompt => prompt.promptResponses[0]);
    
    if (allCompleted) return 'completed';
    if (hasResponses) return 'in-progress';
    return 'not-started';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'in-progress':
        return <MinusCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in-progress':
        return 'In Progress';
      default:
        return 'Not Started';
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Topic</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-[150px]">Status</TableHead>
            <TableHead className="w-[100px] text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {promptCategories.map((category) => {
            const status = getCompletionStatus(category);
            return (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.category}</TableCell>
                <TableCell>{category.description}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(status)}
                    <span>{getStatusText(status)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/role-sharer/topics/${category.id}`}
                    className="text-[#1B4332] hover:underline"
                  >
                    View
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

