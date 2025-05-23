/**
 * TopicsTableAllClient.tsx
 * 
 * This component displays a list of topics with filtering capabilities.
 * 
 * URL Parameter Support:
 * - filter: Can be set to 'favorites', 'queue', or 'has-responses' to filter topics
 *   Example: /role-sharer/topics?filter=favorites
 */

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useViewPreferences } from '@/stores/viewPreferencesStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { PromptListPopup } from '@/components/PromptListPopup';
import TopicsTableFilters, { ViewFilter } from './TopicsTableFilters';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  Search,
  ListPlus,


  TableIcon,
  LayoutGrid,
  ArrowUpDown,

  Loader2
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useRouter, useSearchParams } from 'next/navigation';
import type { PromptCategory } from '@/types/models';
import { ScrollArea } from "@/components/ui/scroll-area";
import TopicCard from "./TopicCard";

// Define ExtendedPromptCategory locally
interface ExtendedPromptCategory extends PromptCategory {
  completedPromptCount?: number;
  totalPromptCount?: number;
  allPromptsCompleted?: boolean; // Added this for status filter logic
}

interface CompletionStatus {
  status: 'Not Started' | 'In Progress' | 'Completed';
  ratio: string;
}

type SortField = 'topic' | 'theme';

interface TopicsTableAllClientProps {
  initialPromptCategories: ExtendedPromptCategory[];
  userId: string;
  sharerId?: string; // Make sharerId optional as it might not always be present for all roles
  currentRole: 'SHARER' | 'EXECUTOR' | 'LISTENER';
}

// Define the component
function TopicsTableAllClientComponent({ 
  initialPromptCategories,
  userId,
  sharerId, // This will be the ProfileSharer.id for SHARER/EXECUTOR, undefined for LISTENER viewing global topics
  currentRole,
}: TopicsTableAllClientProps) {
  // console.log('[TopicsTableAllClient] Props received -- userId:', userId, 'sharerId:', sharerId, 'currentRole:', currentRole);

  const supabase = createClient();
  const { user } = useAuth();
  const [promptCategories, setPromptCategories] = useState<ExtendedPromptCategory[]>(initialPromptCategories);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [themeFilter, setThemeFilter] = useState('all');
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [activeViewFilters, setActiveViewFilters] = useState<ViewFilter[]>(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam && ['favorites', 'queue', 'has-responses'].includes(filterParam)) {
      return [filterParam as ViewFilter];
    }
    return [];
  });

  const [sortField, setSortField] = useState<SortField>('topic');
  const [sortAsc, setSortAsc] = useState(true);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState<ExtendedPromptCategory | null>(null);
  const [isPromptListOpen, setIsPromptListOpen] = useState(false);

  // View preferences from store
  const { 
    sharerTopicsView, 
    executorTopicsView, 
    setSharerTopicsView, 
    setExecutorTopicsView 
  } = useViewPreferences();
  
  // Local state for view mode, default to 'grid' (or match server default)
  const [currentViewMode, setCurrentViewMode] = useState<'grid' | 'table'>('grid');
  const [isMounted, setIsMounted] = useState(false); // Track mount state

  useEffect(() => {
    setIsMounted(true); // Component has mounted
  }, []);

  useEffect(() => {
    // Only update from store/localStorage AFTER mount
    if (isMounted) {
      const preferredView = currentRole === 'SHARER' ? sharerTopicsView : executorTopicsView;
      setCurrentViewMode(preferredView);
    }
  }, [isMounted, currentRole, sharerTopicsView, executorTopicsView]); // Depend on mount state and store values

  const handleViewModeChange = useCallback((mode: 'grid' | 'table') => {
    // Update the Zustand store (which updates localStorage)
    if (currentRole === 'SHARER') {
      setSharerTopicsView(mode);
    } else {
      setExecutorTopicsView(mode);
    }
    // No need to update local state directly here, the useEffect above will catch the change
  }, [currentRole, setSharerTopicsView, setExecutorTopicsView]);

  const toggleFavorite = useCallback(async (categoryId: string) => {
    if (!user) {
      toast.error('You must be logged in to favorite topics');
      return;
    }
    setLoading(prev => ({ ...prev, [`fav-${categoryId}`]: true }));

    // Optimistically update UI
    const originalCategories = [...promptCategories];
    setPromptCategories(prev => prev.map(cat => 
      cat.id === categoryId ? { ...cat, isFavorite: !cat.isFavorite } : cat
    ));

    try {
      const { data, error } = await supabase.rpc('toggle_topic_favorite', {
        p_category_id: categoryId,
        p_profile_id: user.id,
        p_role: currentRole,
        p_sharer_id: currentRole === 'EXECUTOR' ? sharerId : null
      });

      if (error) throw error;

      // Use the returned state from the function
      toast.success(data.is_favorite ? 'Topic added to favorites' : 'Topic removed from favorites');
      
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite status.');
      // Revert optimistic update on error
      setPromptCategories(originalCategories);
    } finally {
      setLoading(prev => ({ ...prev, [`fav-${categoryId}`]: false }));
    }
  }, [user, supabase, promptCategories, currentRole, sharerId]);

  const toggleQueue = useCallback(async (categoryId: string) => {
     if (!user) {
      toast.error('You must be logged in to manage the queue');
      return;
    }
    setLoading(prev => ({ ...prev, [`queue-${categoryId}`]: true }));

    // Optimistically update UI
    const originalCategories = [...promptCategories];
    setPromptCategories(prev => prev.map(cat => 
      cat.id === categoryId ? { ...cat, isInQueue: !cat.isInQueue } : cat
    ));

    try {
       const { data, error } = await supabase.rpc('toggle_topic_queue', {
        p_category_id: categoryId,
        p_profile_id: user.id,
        p_role: currentRole,
        p_sharer_id: currentRole === 'EXECUTOR' ? sharerId : null
      });

      if (error) throw error;
      
      // Use the returned state from the function
      toast.success(data.is_in_queue ? 'Topic added to queue' : 'Topic removed from queue');

    } catch (error: any) {
      console.error('Error toggling queue:', error);
      toast.error('Failed to update queue status.');
      // Revert optimistic update
      setPromptCategories(originalCategories);
    } finally {
       setLoading(prev => ({ ...prev, [`queue-${categoryId}`]: false }));
    }
  }, [user, supabase, promptCategories, currentRole, sharerId]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // If clicking the same field, toggle direction
      setSortAsc(!sortAsc);
    } else {
      // If clicking a new field, set it with ascending direction
      setSortField(field);
      setSortAsc(true);
    }
  };

  const getCompletionStatus = useCallback((category: ExtendedPromptCategory): CompletionStatus => {
    const total = category.totalPromptCount ?? 0;
    const completed = category.completedPromptCount ?? 0;
    const ratio = `${completed}/${total}`;

    if (total === 0) return { status: 'Not Started', ratio: '0/0' }; 
    if (completed === 0) return { status: 'Not Started', ratio };
    if (completed === total) return { status: 'Completed', ratio };
    return { status: 'In Progress', ratio };
  }, []);

  const getStatusBadgeVariant = (status: CompletionStatus): "default" | "secondary" | "outline" | "destructive" => {
    switch (status.status) {
      case 'Completed':
        return 'default';
      case 'In Progress':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleViewFilterChange = (filter: ViewFilter) => {
    setActiveViewFilters(prevFilters => {
      const newFilters = prevFilters.includes(filter)
        ? prevFilters.filter(f => f !== filter)
        : [...prevFilters, filter];
      
      // Update URL query params
      const params = new URLSearchParams(searchParams.toString());
      if (newFilters.length > 0) {
        // For simplicity, store only the first active filter if multiple are ever allowed by UI
        // Or join them: params.set('filter', newFilters.join(',')); 
        params.set('filter', newFilters[0]); 
      } else {
        params.delete('filter');
      }
      router.replace(`?${params.toString()}`, { scroll: false });
      return newFilters;
    });
  };

  const handleResetFilters = () => {
    setActiveViewFilters([]);
    setSearchQuery('');
    setStatusFilter('all');
    setThemeFilter('all');
    
    // Remove filter parameter from URL when filters are reset
    if (searchParams.has('filter')) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('filter');
      router.replace(newUrl.pathname + newUrl.search);
    }
  };

  const filteredCategories = useMemo(() => {
    let filtered = promptCategories.filter((category: ExtendedPromptCategory) => {
      const matchesSearch = category.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTheme = themeFilter === 'all' || category.theme === themeFilter;
      
      // Use completedPromptCount for status calculation
      const total = category.totalPromptCount ?? 0;
      const completed = category.completedPromptCount ?? 0;
      let status: 'not-started' | 'in-progress' | 'completed' = 'not-started';
      if (total > 0) {
        if (completed === total) status = 'completed';
        else if (completed > 0) status = 'in-progress';
      }
      const matchesStatus = statusFilter === 'all' || status === statusFilter.toLowerCase();
      
      // Check if all active filters are met
      const matchesFilters = activeViewFilters.length === 0 || activeViewFilters.every(filter => {
        switch (filter) {
          case 'favorites':
            return category.isFavorite;
          case 'queue':
            return category.isInQueue;
          case 'has-responses':
            // Use the pre-calculated count from the server
            return (category.completedPromptCount ?? 0) > 0;
          default:
            return true; // Should not happen with validated filters
        }
      });

      return matchesSearch && matchesStatus && matchesTheme && matchesFilters;
    });

    filtered = filtered.sort((a: ExtendedPromptCategory, b: ExtendedPromptCategory) => {
      if (sortField === 'topic') {
        return sortAsc 
          ? a.category.localeCompare(b.category)
          : b.category.localeCompare(a.category);
      } else {
        return sortAsc
          ? (a.theme || '').localeCompare(b.theme || '')
          : (b.theme || '').localeCompare(a.theme || '');
      }
    });

    return filtered;
  }, [promptCategories, searchQuery, statusFilter, themeFilter, activeViewFilters, sortField, sortAsc]);

  const themes = useMemo(() => {
    const uniqueThemes = new Set(
      promptCategories
        .map(category => category.theme)
        .filter((theme): theme is string => typeof theme === 'string')
    );
    return Array.from(uniqueThemes);
  }, [promptCategories]);

  const formatThemeName = (theme: string | null | undefined): string => {
    if (!theme) return 'General'; // Or any default you prefer for null/undefined themes
    return theme
      .split('_')
      .map((word: string) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Log the sharerId when the component mounts or updates
  useEffect(() => {
    // console.log(`[TopicsTableAllClient Scope] sharerId: ${sharerId}`);
  }, [sharerId]);

  return (
    <div className="space-y-4">
      {/* Main filter container: always flex-col to stack Search and Other Filters separately */}
      <div className="flex flex-col gap-4">
        {/* Group 1: Search Bar */}
        <div className="relative w-full md:w-1/2 lg:max-w-md"> {/* Control width on desktop */}
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 md:left-3" />
          <Input
            type="search"
            placeholder="Search topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 px-2 pl-8 text-[16px] rounded-full md:h-9 md:px-3 md:pl-10 md:text-sm border-input"
          />
        </div>

        {/* Group 2: All Other Filters (Themes, Statuses, Buttons, View Toggles) */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:flex-wrap">
          {/* Sub-Group 2a: Theme and Status Dropdowns */}
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-2">
            <Select value={themeFilter} onValueChange={setThemeFilter}>
              <SelectTrigger 
                className={cn(
                  'w-full border-0 rounded-full whitespace-normal text-left h-8 px-3 text-[16px] md:h-9 md:text-sm md:w-auto', // md:w-auto for desktop
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

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger 
                className={cn(
                  'w-full border-0 rounded-full h-8 px-3 text-[16px] md:h-9 md:text-sm md:w-auto', // md:w-auto for desktop
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
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="not-started">Not Started</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sub-Group 2b: Filter Buttons and View Toggles */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-2">
            <TopicsTableFilters
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              themeFilter={themeFilter}
              setThemeFilter={setThemeFilter}
              themes={themes}
              activeFilters={activeViewFilters}
              onFilterChange={handleViewFilterChange}
              onResetFilters={handleResetFilters}
              currentRole={currentRole}
              showHasResponses={currentRole !== 'LISTENER'}
            />

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleViewModeChange('table')}
                className={cn(
                  'p-1.5 h-8 w-8 md:p-2 md:h-9 md:w-9 transition-colors rounded-full',
                  currentViewMode === 'table' 
                    ? 'bg-[#8fbc55] text-[#1B4332] hover:bg-[#8fbc55]/90' 
                    : 'text-gray-500 hover:bg-gray-200/80'
                )}
              >
                <TableIcon className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleViewModeChange('grid')}
                className={cn(
                  'p-1.5 h-8 w-8 md:p-2 md:h-9 md:w-9 transition-colors rounded-full',
                  currentViewMode === 'grid' 
                    ? 'bg-[#8fbc55] text-[#1B4332] hover:bg-[#8fbc55]/90' 
                    : 'text-gray-500 hover:bg-gray-200/80'
                )}
              >
                <LayoutGrid className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {loading.initialLoad ? (
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1B4332] border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading topics...</p>
          </div>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="mb-4 text-muted-foreground">
            <ListPlus className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <h3 className="text-lg font-medium">No topics found</h3>
          </div>
          <p className="text-sm text-muted-foreground max-w-md">
            {activeViewFilters.length > 0 || searchQuery 
              ? "Try changing your filters or search query." 
              : "No topics are available yet."}
          </p>
        </div>
      ) : currentViewMode === 'table' ? (
        <div className="w-full">
          <div className="w-full rounded-lg border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55]">
            <div className="w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="border-b">
                  <tr className="transition-colors hover:bg-muted/50">
                    <th 
                      onClick={() => handleSort('topic')} 
                      className="h-12 px-2 sm:px-4 text-left align-middle font-medium cursor-pointer hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        Topic
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </th>
                    <th 
                      className="h-12 px-2 sm:px-4 text-left align-middle font-medium hidden md:table-cell cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('theme')}
                    >
                      <div className="flex items-center gap-2">
                        Theme
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </th>
                    <th className="h-12 px-2 sm:px-4 text-left align-middle font-medium hidden sm:table-cell">Status</th>
                    <th className="h-12 px-2 sm:px-4 text-center align-middle font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.map((category) => {
                    const status = getCompletionStatus(category);
                    return (
                      <tr
                        key={category.id}
                        className="transition-colors hover:bg-gray-50/50 cursor-pointer"
                        onClick={() => {
                          setSelectedCategory(category);
                          setIsPromptListOpen(true);
                        }}
                      >
                        <td className="p-2 sm:p-4 align-middle font-medium">
                          <div> {/* Wrapper for topic and theme pill on mobile */}
                            {category.category}
                            <div className="mt-1 md:hidden"> {/* Theme pill for mobile */}
                              <span className="inline-block bg-gray-100 text-gray-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                {formatThemeName(category.theme)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-2 sm:p-4 align-middle text-muted-foreground hidden md:table-cell">
                          {formatThemeName(category.theme || '')}
                        </td>
                        <td className="p-2 sm:p-4 align-middle hidden sm:table-cell"> {/* Status column - hidden on xs, shown sm and up */}
                          <div className="flex items-center gap-2">
                            <Badge variant={getStatusBadgeVariant(status)} className="hidden sm:inline-flex">
                              {status.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {status.ratio}
                            </span>
                          </div>
                        </td>
                        <td className="p-2 sm:p-4 align-middle text-center">
                          <div className="flex items-center justify-center gap-1 sm:gap-2" onClick={e => e.stopPropagation()}>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // console.log(`[Table Icon Fav Click] Category ID: ${category.id}, Role: ${currentRole}, Sharer ID: ${sharerId}`);
                                      toggleFavorite(category.id);
                                    }}
                                    className="h-8 w-8 md:h-9 md:w-9 p-0 hover:bg-transparent"
                                    disabled={loading[`fav-${category.id}`]}
                                  >
                                    {loading[`fav-${category.id}`] ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <svg 
                                        className={cn(
                                          "w-[18px] h-[18px] md:w-[20px] md:h-[20px] transition-colors",
                                          category.isFavorite 
                                            ? "fill-[#1B4332] text-[#1B4332]" 
                                            : "text-gray-400 hover:text-[#8fbc55] hover:fill-[#8fbc55]"
                                        )}
                                        viewBox="0 0 24 24" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        strokeWidth="2" 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round"
                                      >
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                      </svg>
                                    )}
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // console.log(`[Table Icon Queue Click] Category ID: ${category.id}, Role: ${currentRole}, Sharer ID: ${sharerId}`);
                                      toggleQueue(category.id);
                                    }}
                                    className="h-8 w-8 md:h-9 md:w-9 p-0 hover:bg-transparent"
                                    disabled={loading[`queue-${category.id}`]}
                                  >
                                    {loading[`queue-${category.id}`] ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <svg 
                                        className={cn(
                                          "w-[18px] h-[18px] md:w-[20px] md:h-[20px] transition-colors",
                                          category.isInQueue 
                                            ? "text-[#1B4332]"
                                            : "text-gray-400 hover:text-[#8fbc55]"
                                        )}
                                        viewBox="0 0 24 24" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        strokeWidth="3" 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round"
                                      >
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                      </svg>
                                    )}
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCategory(category);
                                      setIsPromptListOpen(true);
                                    }}
                                    className="h-8 w-8 md:h-9 md:w-9 p-0 hover:bg-transparent"
                                  >
                                    <svg 
                                      className="w-[18px] h-[18px] md:w-[20px] md:h-[20px] text-[#1B4332] hover:text-[#8fbc55] transition-colors"
                                      viewBox="0 0 24 24" 
                                      fill="none" 
                                      stroke="currentColor" 
                                      strokeWidth="3" 
                                      strokeLinecap="round" 
                                      strokeLinejoin="round"
                                    >
                                      <line x1="8" y1="6" x2="21" y2="6"></line>
                                      <line x1="8" y1="12" x2="21" y2="12"></line>
                                      <line x1="8" y1="18" x2="21" y2="18"></line>
                                      <line x1="3" y1="6" x2="3.01" y2="6"></line>
                                      <line x1="3" y1="12" x2="3.01" y2="12"></line>
                                      <line x1="3" y1="18" x2="3.01" y2="18"></line>
                                    </svg>
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Construct the correct path based on role
                                      let path = '';
                                      const topicId = category.id;
                                      if (currentRole === 'EXECUTOR') {
                                        // Ensure sharerId exists for executor route
                                        if (!sharerId) {
                                          console.error('[TopicsTable] Navigation failed: sharerId is missing for EXECUTOR role.');
                                          toast.error('Cannot navigate: Missing sharer context.')
                                          return;
                                        }
                                        path = `/role-executor/${sharerId}/topics/${topicId}`;
                                      } else if (currentRole === 'SHARER') {
                                        // SHARER path does not need sharerId
                                        path = `/role-sharer/topics/${topicId}`;
                                      } else {
                                        console.warn('[TopicsTable] Navigation failed: Unknown currentRole:', currentRole);
                                        toast.error('Cannot navigate: Unknown user role.')
                                        return;
                                      }
                                      // console.log('[TopicsTable] Navigating to:', path);
                                      router.push(path);
                                    }}
                                    className="h-8 w-8 md:h-9 md:w-9 p-0 hover:bg-transparent"
                                  >
                                     <svg 
                                      className="w-[18px] h-[18px] md:w-[20px] md:h-[20px] text-[#1B4332] hover:text-[#8fbc55] transition-colors"
                                      viewBox="0 0 24 24" 
                                      fill="none" 
                                      stroke="currentColor" 
                                      strokeWidth="3" 
                                      strokeLinecap="round" 
                                      strokeLinejoin="round"
                                    >
                                      <path d="M5 12h14" />
                                      <path d="m12 5 7 7-7 7" />
                                    </svg>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Go to topic</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {filteredCategories.map((category) => (
            <TopicCard
              key={category.id}
              promptCategory={category}
              currentRole={currentRole}
              relationshipId={sharerId}
              sharerId={sharerId}
              onFavoriteClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(category.id);
              }}
              onQueueClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleQueue(category.id);
              }}
            />
          ))}
        </div>
      )}

      {selectedCategory && (
        <PromptListPopup
          promptCategory={selectedCategory}
          sharerId={sharerId}
          isOpen={isPromptListOpen}
          onClose={() => {
            setSelectedCategory(null);
            setIsPromptListOpen(false);
          }}
          currentRole={currentRole}
        />
      )}
    </div>
  );
}

// Export the memoized component
const TopicsTableAllClient = React.memo(TopicsTableAllClientComponent);
export default TopicsTableAllClient; 