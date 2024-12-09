// components/TopicsTableAll.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Theme } from '@prisma/client';
import PromptListPopup from './PromptListPopup';
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowRight, ArrowUpDown, ArrowUp, ArrowDown, Search, LayoutGrid, Table as TableIcon, Star, Plus } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import TopicCard from "@/components/TopicCard";
import { type PromptCategory as PrismaPromptCategory } from '@prisma/client';

interface Prompt {
  id: string;
  promptText: string;
  promptType: string | null;
  isContextEstablishing: boolean | null;
  promptCategoryId: string | null;
  videos: { id: string }[];
  promptResponses: { id: string }[];
}

interface PromptCategory {
  id: string;
  category: string;
  description: string | null;
  theme: Theme | null;
  prompts: Prompt[];
  isFavorite?: boolean;
  isInQueue?: boolean;
}

interface TopicsTableAllProps {
  promptCategories: PrismaPromptCategory[];
}

type SortField = 'topic' | 'theme';
type SortDirection = 'asc' | 'desc';

export default function TopicsTableAll({ promptCategories: initialPromptCategories }: TopicsTableAllProps) {
  const router = useRouter();
  const supabase = createClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewFilters, setViewFilters] = useState<string[]>([]);
  const [themeFilter, setThemeFilter] = useState('all');
  const [promptCategories, setPromptCategories] = useState<PromptCategory[]>(initialPromptCategories);
  const [selectedCategory, setSelectedCategory] = useState<PromptCategory | null>(null);
  const [isPromptListOpen, setIsPromptListOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('topic');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  useEffect(() => {
    const loadUserPreferences = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      const [{ data: favoriteData }, { data: queuedData }] = await Promise.all([
        supabase
          .from('TopicFavorite')
          .select('promptCategoryId')
          .eq('profileId', user.id),
        supabase
          .from('TopicQueueItem')
          .select('promptCategoryId')
          .eq('profileId', user.id),
      ]);

      const favoriteIds = favoriteData?.map(f => f.promptCategoryId) || [];
      const queueIds = queuedData?.map(q => q.promptCategoryId) || [];

      setPromptCategories(prev => prev.map(category => ({
        ...category,
        isFavorite: favoriteIds.includes(category.id),
        isInQueue: queueIds.includes(category.id)
      })));
    };

    loadUserPreferences();
  }, [supabase, initialPromptCategories]);

  const handleFavoriteClick = async (e: React.MouseEvent, category: PromptCategory) => {
    e.stopPropagation();
    const newValue = !category.isFavorite;

    // Immediately update local state
    setPromptCategories(prev => prev.map(cat => 
      cat.id === category.id ? { ...cat, isFavorite: newValue } : cat
    ));

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (newValue) {
      // Add to favorites
      const { error } = await supabase
        .from('TopicFavorite')
        .insert({ profileId: user.id, promptCategoryId: category.id });

      if (error) {
        console.error('Error adding to favorites:', error);
        // Revert on error
        setPromptCategories(prev => prev.map(cat => 
          cat.id === category.id ? { ...cat, isFavorite: !newValue } : cat
        ));
      }
    } else {
      // Remove from favorites
      const { error } = await supabase
        .from('TopicFavorite')
        .delete()
        .eq('profileId', user.id)
        .eq('promptCategoryId', category.id);

      if (error) {
        console.error('Error removing from favorites:', error);
        // Revert on error
        setPromptCategories(prev => prev.map(cat => 
          cat.id === category.id ? { ...cat, isFavorite: !newValue } : cat
        ));
      }
    }
  };

  const handleQueueClick = async (e: React.MouseEvent, category: PromptCategory) => {
    e.stopPropagation();
    const newValue = !category.isInQueue;

    // Immediately update local state
    setPromptCategories(prev => prev.map(cat => 
      cat.id === category.id ? { ...cat, isInQueue: newValue } : cat
    ));

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (newValue) {
      // Add to queue
      const { error } = await supabase
        .from('TopicQueueItem')
        .insert({ profileId: user.id, promptCategoryId: category.id });

      if (error) {
        console.error('Error adding to queue:', error);
        // Revert on error
        setPromptCategories(prev => prev.map(cat => 
          cat.id === category.id ? { ...cat, isInQueue: !newValue } : cat
        ));
      }
    } else {
      // Remove from queue
      const { error } = await supabase
        .from('TopicQueueItem')
        .delete()
        .eq('profileId', user.id)
        .eq('promptCategoryId', category.id);

      if (error) {
        console.error('Error removing from queue:', error);
        // Revert on error
        setPromptCategories(prev => prev.map(cat => 
          cat.id === category.id ? { ...cat, isInQueue: !newValue } : cat
        ));
      }
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // If clicking the same field, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking a new field, set it with ascending direction
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getCompletionStatus = (category: PromptCategory) => {
    const totalPrompts = category.prompts.length;
    const completedPrompts = category.prompts.filter(p => p.videos.length > 0).length;
    const hasStartedResponses = category.prompts.some(p => p.promptResponses.length > 0);
    
    let status;
    if (completedPrompts > 0) {
      status = "Completed";
    } else if (hasStartedResponses) {
      status = "In Progress";
    } else {
      status = "Not Started";
    }

    return {
      status,
      ratio: `${completedPrompts}/${totalPrompts}`
    };
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Completed":
        return "default";
      case "In Progress":
        return "outline";
      default:
        return "secondary";
    }
  };

  const handleViewFilterChange = (value: string) => {
    setViewFilters(prev => {
      if (prev.includes(value)) {
        return prev.filter(v => v !== value);
      } else {
        return [...prev, value];
      }
    });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setViewFilters([]);
    setThemeFilter('all');
  };

  const sortedPromptCategories = useMemo(() => {
    let filtered = [...promptCategories];

    if (searchQuery) {
      filtered = filtered.filter(category =>
        category.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (category.theme || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(category => {
        const status = getCompletionStatus(category).status;
        return status.toLowerCase() === statusFilter.toLowerCase();
      });
    }

    // Apply view filters
    if (viewFilters.length > 0) {
      filtered = filtered.filter(category => {
        return viewFilters.every(filter => {
          switch (filter) {
            case 'favorites':
              return category.isFavorite;
            case 'queue':
              return category.isInQueue;
            case 'with_responses':
              return category.prompts.some(p => p.promptResponses.length > 0);
            default:
              return true;
          }
        });
      });
    }

    if (themeFilter !== 'all') {
      filtered = filtered.filter(category => category.theme === themeFilter);
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'topic') {
        comparison = a.category.localeCompare(b.category);
      } else if (sortField === 'theme') {
        comparison = (a.theme || '').localeCompare(b.theme || '');
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [promptCategories, searchQuery, statusFilter, viewFilters, themeFilter, sortField, sortDirection]);

  const getThemes = () => {
    const themes = new Set<string>();
    promptCategories.forEach(category => {
      if (category.theme) {
        themes.add(category.theme);
      }
    });
    return Array.from(themes).sort();
  };

  const formatThemeName = (theme: string) => {
    if (!theme) return '';
    return theme
      .split('_')
      .map((word: string) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <div className="w-full space-y-6">
      <div className="bg-gray-50 p-4 rounded-xl border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1 relative">
            <Input
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-2 border-gray-200 rounded-lg focus-visible:ring-[#8fbc55] pr-10"
            />
            <Search className="h-4 w-4 text-gray-500 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger 
                className={cn(
                  'w-[160px] border-0 rounded-lg',
                  statusFilter !== 'all'
                    ? 'bg-[#8fbc55] text-[#1B4332] font-medium'
                    : 'bg-gray-200/50 text-gray-600 hover:bg-[#8fbc55] hover:text-[#1B4332]'
                )}
              >
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in progress">In Progress</SelectItem>
                <SelectItem value="not started">Not Started</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex flex-wrap gap-2">
              {[
                { id: 'favorites', label: 'Favorites' },
                { id: 'queue', label: 'Queue' },
                { id: 'with_responses', label: 'Has Responses' }
              ].map((option) => (
                <Button
                  key={option.id}
                  variant="outline"
                  onClick={() => handleViewFilterChange(option.id)}
                  className={cn(
                    'border-0 rounded-lg',
                    viewFilters.includes(option.id) 
                      ? 'bg-[#8fbc55] text-[#1B4332] font-medium' 
                      : 'bg-gray-200/50 text-gray-600 hover:bg-[#8fbc55] hover:text-[#1B4332]'
                  )}
                >
                  {option.label}
                </Button>
              ))}
            </div>

            {themeFilter !== 'all' && (
              <Select value={themeFilter} onValueChange={setThemeFilter}>
                <SelectTrigger className="w-[160px] border-2 border-[#1B4332] rounded-lg focus:ring-[#8fbc55] bg-white">
                  <SelectValue placeholder="Theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Themes</SelectItem>
                  {getThemes().map((theme) => (
                    <SelectItem key={theme} value={theme}>
                      {formatThemeName(theme)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              variant="outline"
              onClick={handleResetFilters}
              className="border-0 rounded-lg bg-gray-200/50 text-gray-600 hover:bg-[#8fbc55] hover:text-[#1B4332]"
            >
              All Topics
            </Button>

            <div className="flex items-center gap-2 ml-2 border-l border-gray-200 pl-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('table')}
                className={cn(
                  'p-2 h-9 w-9',
                  viewMode === 'table' ? 'bg-[#8fbc55] text-[#1B4332]' : 'text-gray-500'
                )}
              >
                <TableIcon className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-2 h-9 w-9',
                  viewMode === 'grid' ? 'bg-[#8fbc55] text-[#1B4332]' : 'text-gray-500'
                )}
              >
                <LayoutGrid className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="border-2 border-[#1B4332] rounded-xl shadow-[6px_6px_0_0_#8fbc55] bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  onClick={() => handleSort('topic')}
                  className="w-[40%] cursor-pointer hover:text-[#1B4332]"
                >
                  <div className="flex items-center gap-2">
                    Topic
                    {sortField === 'topic' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="h-4 w-4 text-[#1B4332]" />
                      ) : (
                        <ArrowDown className="h-4 w-4 text-[#1B4332]" />
                      )
                    ) : (
                      <ArrowUpDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  onClick={() => handleSort('theme')}
                  className="w-[30%] cursor-pointer hover:text-[#1B4332]"
                >
                  <div className="flex items-center gap-2">
                    Theme
                    {sortField === 'theme' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="h-4 w-4 text-[#1B4332]" />
                      ) : (
                        <ArrowDown className="h-4 w-4 text-[#1B4332]" />
                      )
                    ) : (
                      <ArrowUpDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </TableHead>
                <TableHead className="w-[20%] text-center">
                  <div className="flex items-center justify-center">
                    Status
                  </div>
                </TableHead>
                <TableHead className="w-[10%] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPromptCategories.map((category) => (
                <TableRow
                  key={category.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => setIsPromptListOpen(true)}
                >
                  <TableCell className="w-[40%] font-medium">{category.category}</TableCell>
                  <TableCell className="w-[30%]">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold">
                      {formatThemeName(category.theme || '')}
                    </span>
                  </TableCell>
                  <TableCell className="w-[20%]">
                    <div className="flex items-center justify-center gap-2">
                      <Badge variant={getStatusBadgeVariant(getCompletionStatus(category).status)}>
                        {getCompletionStatus(category).status}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {getCompletionStatus(category).ratio}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="w-[10%]" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleFavoriteClick(e, category)}
                              className="h-9 w-9 p-0 hover:bg-transparent"
                            >
                              <svg 
                                width="20" 
                                height="20" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                                className={cn(
                                  "transition-colors",
                                  category.isFavorite 
                                    ? "fill-[#1B4332] text-[#1B4332]" 
                                    : "text-gray-400 hover:text-[#8fbc55] hover:fill-[#8fbc55]"
                                )}
                              >
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                              </svg>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{category.isFavorite ? "Remove from favorites" : "Add to favorites"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleQueueClick(e, category)}
                              className="h-9 w-9 p-0 hover:bg-transparent"
                            >
                              <svg 
                                width="20" 
                                height="20" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="3" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                                className={cn(
                                  "transition-colors",
                                  category.isInQueue 
                                    ? "text-[#1B4332]" 
                                    : "text-gray-400 hover:text-[#8fbc55]"
                                )}
                              >
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                              </svg>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{category.isInQueue ? "Remove from queue" : "Add to queue"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => router.push(`/role-sharer/topics/${category.id}`)}
                              className="h-9 w-9 p-0 hover:bg-[#8fbc55] rounded-full"
                            >
                              <ArrowRight className={cn(
                                "h-6 w-6 transition-colors stroke-[3]",
                                "text-[#1B4332]"
                              )} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Start recording</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {sortedPromptCategories.map((category) => (
            <div key={category.id} className="min-w-[280px] max-w-full">
              <TopicCard
                promptCategory={category as any}
                onClick={() => {
                  setSelectedCategory(category);
                  setIsPromptListOpen(true);
                }}
                onFavoriteClick={(e) => handleFavoriteClick(e, category)}
                onQueueClick={(e) => handleQueueClick(e, category)}
              />
            </div>
          ))}
        </div>
      )}

      {isPromptListOpen && selectedCategory && (
        <PromptListPopup
          promptCategory={selectedCategory}
          isOpen={isPromptListOpen}
          onClose={() => {
            setIsPromptListOpen(false);
            setSelectedCategory(null);
          }}
        />
      )}
      {error && <div className="text-red-500 mt-2 text-sm text-center">{error}</div>}
    </div>
  );
}

