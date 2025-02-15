// components/TopicsTableAll.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import PromptListPopup from './PromptListPopup';
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowRight, ArrowUpDown, ArrowUp, ArrowDown, Search, LayoutGrid, Table as TableIcon, ListOrdered, Star, ListPlus } from 'lucide-react';
import TopicCard from "@/components/TopicCard";
import { PromptCategory } from '@/types/models';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

interface TopicsTableAllProps {
  initialPromptCategories: PromptCategory[];
  currentRole?: 'SHARER' | 'EXECUTOR';
  relationshipId?: string;
  sharerId?: string;
}

type SortField = 'topic' | 'theme';
type SortDirection = 'asc' | 'desc';

const ActionButton = ({ 
  onClick, 
  isActive, 
  icon: Icon, 
  tooltip, 
  isLoading = false
}: { 
  onClick: (e: React.MouseEvent) => void; 
  isActive: boolean; 
  icon: React.ElementType; 
  tooltip: string;
  isLoading?: boolean;
}) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onClick(e);
          }}
          className="h-8 w-8 md:h-9 md:w-9 p-0 hover:bg-transparent"
          disabled={isLoading}
        >
          <Icon className={cn(
            "w-[18px] h-[18px] md:w-[20px] md:h-[20px] transition-colors",
            isActive 
              ? "text-[#1B4332] fill-[#1B4332]" 
              : "text-gray-400 hover:text-[#8fbc55] hover:fill-[#8fbc55]"
          )} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const FilterButtons = dynamic(() => Promise.resolve(({ 
  viewFilters, 
  handleViewFilterChange, 
  handleResetFilters, 
  viewMode, 
  setViewMode 
}: { 
  viewFilters: string[], 
  handleViewFilterChange: (value: string) => void, 
  handleResetFilters: () => void,
  viewMode: 'table' | 'grid',
  setViewMode: (mode: 'table' | 'grid') => void
}) => {
  return (
    <div className="flex flex-wrap gap-2 items-center">
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
  );
}), { ssr: false });

export default function TopicsTableAll({ 
  initialPromptCategories,
  currentRole = 'SHARER',
  relationshipId,
  sharerId
}: TopicsTableAllProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewFilters, setViewFilters] = useState<string[]>(() => {
    const filterParam = searchParams.get('filter');
    return filterParam ? [filterParam] : [];
  });
  const [themeFilter, setThemeFilter] = useState('all');
  const [promptCategories, setPromptCategories] = useState<PromptCategory[]>(initialPromptCategories || []);
  const [selectedCategory, setSelectedCategory] = useState<PromptCategory | null>(null);
  const [isPromptListOpen, setIsPromptListOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('topic');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const fetchUserPreferences = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Build the query based on role
      let favoritesQuery = supabase
        .from('TopicFavorite')
        .select('promptCategoryId')
        .eq('profileId', user.id)
        .eq('role', currentRole);

      let queueQuery = supabase
        .from('TopicQueueItem')
        .select('promptCategoryId')
        .eq('profileId', user.id)
        .eq('role', currentRole);

      // Add relationship conditions based on role
      if (currentRole === 'EXECUTOR') {
        if (sharerId) {
          favoritesQuery = favoritesQuery.eq('sharerId', sharerId);
          queueQuery = queueQuery.eq('sharerId', sharerId);
        }
      } else {
        // For SHARER role
        if (relationshipId) {
          favoritesQuery = favoritesQuery.eq('sharerId', relationshipId);
          queueQuery = queueQuery.eq('sharerId', relationshipId);
        }
      }

      // Execute both queries
      const [{ data: favorites }, { data: queueItems }] = await Promise.all([
        favoritesQuery,
        queueQuery
      ]);

      // Create Sets for efficient lookup
      const favoritedIds = new Set(favorites?.map((f: { promptCategoryId: string }) => f.promptCategoryId) || []);
      const queuedIds = new Set(queueItems?.map((q: { promptCategoryId: string }) => q.promptCategoryId) || []);

      // Update prompt categories with favorite and queue status
      setPromptCategories(prevCategories => 
        prevCategories.map(category => ({
          ...category,
          isFavorite: favoritedIds.has(category.id),
          isInQueue: queuedIds.has(category.id)
        }))
      );
    };

    fetchUserPreferences();
  }, [supabase, currentRole, relationshipId, sharerId]);

  const toggleFavorite = async (categoryId: string) => {
    try {
      setLoading(prev => ({ ...prev, [`favorite-${categoryId}`]: true }));
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('You must be logged in to favorite topics');
        return;
      }

      const category = promptCategories.find(c => c.id === categoryId);
      if (!category) return;

      if (category.isFavorite) {
        // Delete the favorite
        const { error: deleteError } = await supabase
          .from('TopicFavorite')
          .delete()
          .eq('profileId', user.id)
          .eq('promptCategoryId', categoryId)
          .eq('role', currentRole)
          .eq('sharerId', sharerId);

        if (deleteError) throw deleteError;
      } else {
        // Insert new favorite
        const insertData = {
          profileId: user.id,
          promptCategoryId: categoryId,
          role: currentRole,
          sharerId: sharerId
        };

        const { error: insertError } = await supabase
          .from('TopicFavorite')
          .insert([insertData]);

        if (insertError) throw insertError;
      }

      // Update local state
      setPromptCategories(prev =>
        prev.map(c =>
          c.id === categoryId
            ? { ...c, isFavorite: !c.isFavorite }
            : c
        )
      );

      toast.success(
        category.isFavorite
          ? 'Removed from favorites'
          : 'Added to favorites'
      );
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    } finally {
      setLoading(prev => ({ ...prev, [`favorite-${categoryId}`]: false }));
    }
  };

  const toggleQueue = async (categoryId: string) => {
    try {
      setLoading(prev => ({ ...prev, [`queue-${categoryId}`]: true }));
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('You must be logged in to queue topics');
        return;
      }

      const category = promptCategories.find(c => c.id === categoryId);
      if (!category) return;

      if (category.isInQueue) {
        // Delete the queue item
        const { error: deleteError } = await supabase
          .from('TopicQueueItem')
          .delete()
          .eq('profileId', user.id)
          .eq('promptCategoryId', categoryId)
          .eq('role', currentRole)
          .eq('sharerId', sharerId);

        if (deleteError) throw deleteError;
      } else {
        // Insert new queue item
        const insertData = {
          profileId: user.id,
          promptCategoryId: categoryId,
          role: currentRole,
          sharerId: sharerId
        };

        const { error: insertError } = await supabase
          .from('TopicQueueItem')
          .insert([insertData]);

        if (insertError) throw insertError;
      }

      // Update local state
      setPromptCategories(prev =>
        prev.map(c =>
          c.id === categoryId
            ? { ...c, isInQueue: !c.isInQueue }
            : c
        )
      );

      toast.success(
        category.isInQueue
          ? 'Removed from queue'
          : 'Added to queue'
      );
    } catch (error: any) {
      console.error('Error toggling queue:', error);
      toast.error('Failed to update queue');
    } finally {
      setLoading(prev => ({ ...prev, [`queue-${categoryId}`]: false }));
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
    const completedPrompts = category.prompts.filter(p => Array.isArray(p.PromptResponse) && p.PromptResponse.length > 0).length;
    
    let status;
    if (completedPrompts === totalPrompts) {
      status = "Completed";
    } else if (completedPrompts > 0) {
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
    const newFilters = viewFilters.includes(value) 
      ? viewFilters.filter(v => v !== value)
      : [...viewFilters, value];
    
    setViewFilters(newFilters);
    
    // Update URL after state update
    if (newFilters.length > 0) {
      router.push(`/role-sharer/topics?filter=${newFilters[0]}`);
    } else {
      router.push('/role-sharer/topics');
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setViewFilters([]);
    setThemeFilter('all');
    router.push('/role-sharer/topics');
  };

  const sortedPromptCategories = useMemo(() => {
    let filtered = [...(promptCategories || [])];

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
              return category.prompts.some(p => p.PromptResponse && p.PromptResponse.length > 0);
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

  const themes = useMemo(() => {
    const themeSet = new Set<string>();
    promptCategories.forEach(category => {
      if (category.theme) {
        themeSet.add(category.theme);
      }
    });
    return Array.from(themeSet).sort();
  }, [promptCategories]);

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

            <Select value={themeFilter} onValueChange={setThemeFilter}>
              <SelectTrigger 
                className={cn(
                  'w-[200px] border-0 rounded-lg whitespace-normal text-left h-auto min-h-[40px] py-2',
                  themeFilter !== 'all'
                    ? 'bg-[#8fbc55] text-[#1B4332] font-medium'
                    : 'bg-gray-200/50 text-gray-600 hover:bg-[#8fbc55] hover:text-[#1B4332]'
                )}
              >
                <SelectValue placeholder="Theme">
                  {themeFilter === 'all' ? 'All Themes' : formatThemeName(themeFilter)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-w-[300px]">
                <SelectItem value="all">All Themes</SelectItem>
                {themes.map((theme) => (
                  <SelectItem key={theme} value={theme} className="whitespace-normal">
                    {formatThemeName(theme)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <FilterButtons 
              viewFilters={viewFilters}
              handleViewFilterChange={handleViewFilterChange}
              handleResetFilters={handleResetFilters}
              viewMode={viewMode}
              setViewMode={setViewMode}
            />
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
                  className="w-[50%] md:w-[40%] cursor-pointer hover:text-[#1B4332]"
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
                  className="hidden md:table-cell w-[30%] cursor-pointer hover:text-[#1B4332]"
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
                <TableHead className="w-[30%] md:w-[20%] text-center">
                  <div className="flex items-center justify-center">
                    <span className="hidden md:inline">Status</span>
                    <span className="md:hidden">Progress</span>
                  </div>
                </TableHead>
                <TableHead className="w-[20%] md:w-[10%] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPromptCategories.map((category) => (
                <TableRow
                  key={category.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/role-sharer/topics/${category.id}`)}
                >
                  <TableCell className="w-[50%] md:w-[40%] font-medium">{category.category}</TableCell>
                  <TableCell className="hidden md:table-cell w-[30%]">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold">
                      {formatThemeName(category.theme || '')}
                    </span>
                  </TableCell>
                  <TableCell className="w-[30%] md:w-[20%]">
                    <div className="flex items-center justify-center gap-2">
                      <Badge variant={getStatusBadgeVariant(getCompletionStatus(category).status)} className="hidden md:inline-flex">
                        {getCompletionStatus(category).status}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {getCompletionStatus(category).ratio}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <ActionButton
                        onClick={() => toggleFavorite(category.id)}
                        isActive={Boolean(category.isFavorite)}
                        icon={Star}
                        tooltip={category.isFavorite ? "Remove from favorites" : "Add to favorites"}
                        isLoading={Boolean(loading[`favorite-${category.id}`])}
                      />
                      <ActionButton
                        onClick={() => toggleQueue(category.id)}
                        isActive={Boolean(category.isInQueue)}
                        icon={ListPlus}
                        tooltip={category.isInQueue ? "Remove from queue" : "Add to queue"}
                        isLoading={Boolean(loading[`queue-${category.id}`])}
                      />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedCategory(category);
                                setIsPromptListOpen(true);
                              }}
                              className="h-8 w-8 md:h-9 md:w-9 p-0 hover:bg-[#8fbc55] rounded-full"
                            >
                              <ListOrdered className="h-5 w-5 md:h-6 md:w-6 text-[#1B4332]" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View prompts</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => router.push(`/role-${currentRole.toLowerCase()}/topics/${category.id}`)}
                              className="h-8 w-8 md:h-9 md:w-9 p-0 hover:bg-[#8fbc55] rounded-full"
                            >
                              <ArrowRight className="h-5 w-5 md:h-6 md:w-6 text-[#1B4332] stroke-[3]" />
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
                promptCategory={category}
                onClick={() => {
                  setSelectedCategory(category);
                  setIsPromptListOpen(true);
                }}
                onFavoriteClick={(e) => toggleFavorite(category.id)}
                onQueueClick={(e) => toggleQueue(category.id)}
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
    </div>
  );
}

