// components/TopicsTableAll.tsx
// This component displays all topics in a table format with their completion status, sorting, and filtering capabilities

'use client';

import { useState, useMemo, useEffect } from 'react';
import { Prompt, PromptCategory } from "@/types/models";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle2, Circle, MinusCircle, ChevronUp, ChevronDown, Search, Play, Star, ListPlus } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { createClient, getAuthenticatedClient } from '@/utils/supabase/client';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface TopicsTableAllProps {
  promptCategories: PromptCategory[];
  categoryId?: string;
}

type SortField = 'category' | 'status';
type SortDirection = 'asc' | 'desc';
type Status = 'all' | 'completed' | 'in-progress' | 'not-started';

export default function TopicsTableAll({ promptCategories, categoryId }: TopicsTableAllProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status>('all');
  const [sortField, setSortField] = useState<SortField>('category');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [queueItems, setQueueItems] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load favorites and queue items on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true);
        const supabase = await getAuthenticatedClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Load favorites
          const { data: favoritesData } = await supabase
            .from('TopicFavorite')
            .select('promptCategoryId')
            .eq('profileId', user.id);
          
          // Load queue items
          const { data: queueData } = await supabase
            .from('TopicQueueItem')
            .select('promptCategoryId')
            .eq('profileId', user.id);

          const favoritesMap: Record<string, boolean> = {};
          const queueMap: Record<string, boolean> = {};

          favoritesData?.forEach(f => favoritesMap[f.promptCategoryId] = true);
          queueData?.forEach(q => queueMap[q.promptCategoryId] = true);

          setFavorites(favoritesMap);
          setQueueItems(queueMap);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []);

  const getCompletionStatus = (category: PromptCategory) => {
    if (!category.prompts || category.prompts.length === 0) return 'not-started';
    
    const hasResponses = category.prompts.some(prompt => prompt.promptResponses && prompt.promptResponses.length > 0);
    const allCompleted = category.prompts.every(prompt => prompt.promptResponses && prompt.promptResponses.length > 0);
    
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
        return 'Done';
      case 'in-progress':
        return 'Active';
      default:
        return 'New';
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const handleFavoriteToggle = async (categoryId: string) => {
    try {
      setError(null);
      const supabase = await getAuthenticatedClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No authenticated user');

      if (favorites[categoryId]) {
        await supabase
          .from('TopicFavorite')
          .delete()
          .eq('profileId', user.id)
          .eq('promptCategoryId', categoryId);
        
        setFavorites(prev => ({ ...prev, [categoryId]: false }));
      } else {
        await supabase
          .from('TopicFavorite')
          .insert({ profileId: user.id, promptCategoryId: categoryId });
        
        setFavorites(prev => ({ ...prev, [categoryId]: true }));
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      setError('Failed to update favorite status');
    }
  };

  const handleQueueToggle = async (categoryId: string) => {
    try {
      setError(null);
      const supabase = await getAuthenticatedClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No authenticated user');

      if (queueItems[categoryId]) {
        await supabase
          .from('TopicQueueItem')
          .delete()
          .eq('profileId', user.id)
          .eq('promptCategoryId', categoryId);
        
        setQueueItems(prev => ({ ...prev, [categoryId]: false }));
      } else {
        await supabase
          .from('TopicQueueItem')
          .insert({ profileId: user.id, promptCategoryId: categoryId });
        
        setQueueItems(prev => ({ ...prev, [categoryId]: true }));
      }
    } catch (error: any) {
      console.error('Error toggling queue:', error);
      setError('Failed to update queue status');
    }
  };

  const filteredAndSortedCategories = useMemo(() => {
    if (!promptCategories) return [];
    
    return promptCategories
      .filter(category => {
        const matchesSearch = category.category.toLowerCase().includes(searchQuery.toLowerCase());
        const status = getCompletionStatus(category);
        const matchesStatus = statusFilter === 'all' || status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortField === 'category') {
          const comparison = a.category.localeCompare(b.category);
          return sortDirection === 'asc' ? comparison : -comparison;
        } else {
          const statusA = getCompletionStatus(a);
          const statusB = getCompletionStatus(b);
          const comparison = statusA.localeCompare(statusB);
          return sortDirection === 'asc' ? comparison : -comparison;
        }
      });
  }, [promptCategories, searchQuery, statusFilter, sortField, sortDirection]);

  const getProgress = (category: PromptCategory) => {
    if (!category.prompts || category.prompts.length === 0) return 0;
    return Math.round((category.prompts.filter(p => p.promptResponses && p.promptResponses.length > 0).length / category.prompts.length) * 100);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value: Status) => setStatusFilter(value)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="completed">Done</SelectItem>
            <SelectItem value="in-progress">Active</SelectItem>
            <SelectItem value="not-started">New</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center gap-2">
                  Topic
                  {getSortIcon('category')}
                </div>
              </TableHead>
              <TableHead className="w-[100px]">Progress</TableHead>
              <TableHead 
                className="w-[100px] cursor-pointer"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-2">
                  Status
                  {getSortIcon('status')}
                </div>
              </TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedCategories.map((category) => {
              const status = getCompletionStatus(category);
              const progress = getProgress(category);
              const isFavorite = favorites[category.id];
              const isInQueue = queueItems[category.id];
              
              return (
                <TableRow 
                  key={category.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <TableCell className="font-medium break-words">
                    {category.category}
                  </TableCell>
                  <TableCell>
                    <div className="hidden sm:flex items-center gap-4">
                      <Progress 
                        value={progress} 
                        className="h-2 w-[100px]"
                        style={{ '--progress-foreground': '#1B4332' } as React.CSSProperties}
                      />
                      <span className="text-sm text-gray-600 min-w-[40px]">
                        {progress}%
                      </span>
                    </div>
                    <div className="sm:hidden">
                      <span className="text-sm text-gray-600">
                        {progress}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(status)}
                      <span className="text-sm">{getStatusText(status)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-10 w-10"
                              onClick={() => handleFavoriteToggle(category.id)}
                            >
                              <Star className={cn(
                                "h-5 w-5",
                                isFavorite ? "fill-[#1B4332] text-[#1B4332]" : "text-gray-400"
                              )} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{isFavorite ? 'Remove from favorites' : 'Add to favorites'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-10 w-10"
                              onClick={() => handleQueueToggle(category.id)}
                            >
                              <ListPlus className={cn(
                                "h-5 w-5",
                                isInQueue ? "text-[#1B4332]" : "text-gray-400"
                              )} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{isInQueue ? 'Remove from queue' : 'Add to queue'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedCategory} onOpenChange={() => setSelectedCategory(null)}>
        <DialogContent className="max-h-[90vh] flex flex-col [&>button]:z-50">
          <div className="sticky top-0 bg-white border-b z-10">
            <DialogHeader className="py-4">
              <DialogTitle>
                {promptCategories?.find(c => c.id === selectedCategory)?.category} Prompts
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-2">
                {promptCategories?.find(c => c.id === selectedCategory)?.description}
              </p>
            </DialogHeader>
          </div>
          <div className="overflow-y-auto flex-1">
            <div className="grid gap-4 py-4">
              {promptCategories
                ?.find(c => c.id === selectedCategory)
                ?.prompts
                .sort((a, b) => {
                  // Sort isContextEstablishing=true prompts first
                  if (a.isContextEstablishing && !b.isContextEstablishing) return -1;
                  if (!a.isContextEstablishing && b.isContextEstablishing) return 1;
                  return 0;
                })
                .map((prompt, index) => (
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
                        className="h-10 w-10"
                        onClick={() => {
                          if (prompt.promptResponses[0]?.id) {
                            router.push(`/role-sharer/dashboard/prompt-response/${prompt.promptResponses[0].id}`);
                          } else {
                            setError('Unable to view response: Response ID is missing');
                          }
                        }}
                      >
                        <Play className="h-5 w-5 text-[#1B4332]" />
                      </Button>
                    ) : (
                      <span className="text-[#1B4332]">New</span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {error && <div className="text-red-500 mt-2 text-sm text-center">{error}</div>}
    </div>
  );
}

