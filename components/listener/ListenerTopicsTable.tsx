// components/listener/ListenerTopicsTable.tsx
// LISTENER-SPECIFIC: Component for displaying topics in table or grid view, WITHOUT status/progress.

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useViewPreferences } from '@/stores/viewPreferencesStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge'; // Keep for potential future use, but not rendered
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { PromptListPopup } from '@/components/PromptListPopup';
import ListenerTopicCard from '@/components/listener/ListenerTopicCard'; // USE LISTENER CARD
import TopicsTableFilters from '@/components/TopicsTableFilters';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  Search,
  ListPlus,
  TableIcon,
  LayoutGrid,
  ArrowUpDown,
  Loader2,
  ArrowRight,
  Star
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useRouter, useSearchParams } from 'next/navigation';
import type { PromptCategory } from '@/types/models';

// Removed CompletionStatus interface as it's no longer used

type ViewFilter = 'favorites' | 'queue';
type SortField = 'topic' | 'theme';

interface ExtendedPromptCategory extends PromptCategory {
  completedPromptCount?: number; // Keep data, just don't display
  totalPromptCount?: number;   // Keep data, just don't display
  isFavorite?: boolean;        // Needed for buttons
  isInQueue?: boolean;         // Needed for buttons
  displayName?: string;      // Add displayName for the formatted topic name
}

interface ListenerTopicsTableProps {
  initialPromptCategories: ExtendedPromptCategory[];
  sharerId: string; // Made sharerId required as it's crucial for navigation
}

function ListenerTopicsTableComponent({ 
  initialPromptCategories,
  sharerId, // sharerId is now non-optional
}: ListenerTopicsTableProps) {
  const supabase = createClient();
  const { user } = useAuth();
  const [promptCategories, setPromptCategories] = useState<ExtendedPromptCategory[]>(initialPromptCategories);
  const [searchQuery, setSearchQuery] = useState('');
  const [themeFilter, setThemeFilter] = useState('all');
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [activeFilters, setActiveFilters] = useState<ViewFilter[]>(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam && ['favorites', 'queue'].includes(filterParam)) {
      return [filterParam as ViewFilter];
    }
    return [];
  });

  const [sortField, setSortField] = useState<SortField>('topic');
  const [sortAsc, setSortAsc] = useState(true);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState<ExtendedPromptCategory | null>(null);
  const [isPromptListOpen, setIsPromptListOpen] = useState(false);
  
  const [currentViewMode, setCurrentViewMode] = useState<'grid' | 'table'>('grid');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      // Placeholder for view preference logic
    }
  }, [isMounted]);

  const handleViewModeChange = useCallback((mode: 'grid' | 'table') => {
    setCurrentViewMode(mode);
  }, []);

  const currentRole = 'LISTENER';

  const toggleFavorite = useCallback(async (categoryId: string) => {
    if (!user) {
      toast.error('You must be logged in to favorite topics');
      return;
    }
    setLoading(prev => ({ ...prev, [`fav-${categoryId}`]: true }));
    const originalCategories = [...promptCategories];
    setPromptCategories(prev => prev.map(cat => cat.id === categoryId ? { ...cat, isFavorite: !cat.isFavorite } : cat));

    try {
      const { data, error } = await supabase.rpc('toggle_topic_favorite', {
        p_category_id: categoryId,
        p_profile_id: user.id,
        p_role: currentRole,
        p_sharer_id: null
      });
      if (error) throw error;
      toast.success(data.is_favorite ? 'Topic added to favorites' : 'Topic removed from favorites');
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite status.');
      setPromptCategories(originalCategories);
    } finally {
      setLoading(prev => ({ ...prev, [`fav-${categoryId}`]: false }));
    }
  }, [user, supabase, promptCategories]);

  const toggleQueue = useCallback(async (categoryId: string) => {
     if (!user) {
      toast.error('You must be logged in to manage the queue');
      return;
    }
    setLoading(prev => ({ ...prev, [`queue-${categoryId}`]: true }));
    const originalCategories = [...promptCategories];
    setPromptCategories(prev => prev.map(cat => cat.id === categoryId ? { ...cat, isInQueue: !cat.isInQueue } : cat));

    try {
       const { data, error } = await supabase.rpc('toggle_topic_queue', {
        p_category_id: categoryId,
        p_profile_id: user.id,
        p_role: currentRole,
        p_sharer_id: null 
      });
      if (error) throw error;
      toast.success(data.is_in_queue ? 'Topic added to queue' : 'Topic removed from queue');
    } catch (error: any) {
      console.error('Error toggling queue:', error);
      toast.error('Failed to update queue status.');
      setPromptCategories(originalCategories);
    } finally {
       setLoading(prev => ({ ...prev, [`queue-${categoryId}`]: false }));
    }
  }, [user, supabase, promptCategories]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleViewFilterChange = (filter: ViewFilter) => {
    if (filter === 'has-responses') return;
    
    setActiveFilters(prev => {
      const isActive = prev.includes(filter);
      if (isActive) {
        return prev.filter(f => f !== filter);
      } else {
        return [...prev, filter];
      }
    });
  };

  const handleResetFilters = () => {
    setActiveFilters([]);
    setSearchQuery('');
    setThemeFilter('all');
  };

  const formatThemeName = (theme: string | null | undefined): string => {
    if (!theme) return 'N/A';
    return theme.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  };

  const filteredAndSortedCategories = useMemo(() => {
    let categories = [...promptCategories];

    if (searchQuery) {
      categories = categories.filter(category =>
        (category.displayName || category.category)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (themeFilter !== 'all') {
      categories = categories.filter(category => category.theme === themeFilter);
    }

    if (activeFilters.length > 0) {
      categories = categories.filter(category => {
        return activeFilters.every(filter => {
          if (filter === 'favorites') return category.isFavorite;
          if (filter === 'queue') return category.isInQueue;
          return true;
        });
      });
    }

    categories.sort((a, b) => {
      let valA: string | number, valB: string | number;
      if (sortField === 'topic') {
        valA = (a.displayName || a.category || '').toLowerCase();
        valB = (b.displayName || b.category || '').toLowerCase();
      } else { // theme
        valA = (a.theme || '').toLowerCase();
        valB = (b.theme || '').toLowerCase();
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return categories;
  }, [promptCategories, searchQuery, themeFilter, activeFilters, sortField, sortAsc]);

  const uniqueThemes = useMemo(() => {
    const themes = new Set<string>();
    initialPromptCategories.forEach(cat => cat.theme && themes.add(cat.theme));
    return Array.from(themes);
  }, [initialPromptCategories]);

  const handleOpenPromptList = (category: ExtendedPromptCategory) => {
    setSelectedCategory(category);
    setIsPromptListOpen(true);
  };

  if (!isMounted) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-gray-500" /></div>;
  }
  
  return (
    <div className="space-y-6">
      {/* Search and Filter Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={themeFilter} onValueChange={setThemeFilter}>
          <SelectTrigger className="w-full sm:w-[240px]">
            <SelectValue placeholder="All Themes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Themes</SelectItem>
            {uniqueThemes.map((theme) => (
              <SelectItem key={theme} value={theme}>
                {formatThemeName(theme)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* View Filters and Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <TopicsTableFilters 
          activeFilters={activeFilters}
          onFilterChange={handleViewFilterChange}
          onReset={handleResetFilters}
          showHasResponses={false} // Hide the "Has Responses" filter for listeners
        />
        <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
          <Button
            variant={currentViewMode === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handleViewModeChange('table')}
          >
            <TableIcon className="h-4 w-4 mr-2" />
            Table
          </Button>
          <Button
            variant={currentViewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handleViewModeChange('grid')}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Grid
          </Button>
        </div>
      </div>

      {/* Content Area: Table or Grid */}
      {currentViewMode === 'table' ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('topic')}>
                  Topic
                  {sortField === 'topic' && (sortAsc ? ' ▲' : ' ▼')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('theme')}>
                  Theme
                  {sortField === 'theme' && (sortAsc ? ' ▲' : ' ▼')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAndSortedCategories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {category.displayName || category.category}
                  </td>
                  <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 dark:text-gray-400 break-words">
                    {category.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatThemeName(category.theme)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => toggleFavorite(category.id)} 
                            className={cn(
                              "hover:bg-yellow-100 dark:hover:bg-yellow-700",
                              category.isFavorite ? 'text-yellow-500 dark:text-yellow-400' : 'text-gray-400 dark:text-gray-500'
                            )}
                            disabled={loading[`fav-${category.id}`]}
                          >
                            {loading[`fav-${category.id}`] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{category.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => toggleQueue(category.id)} 
                            className={cn(
                              "hover:bg-sky-100 dark:hover:bg-sky-700",
                              category.isInQueue ? 'text-sky-500 dark:text-sky-400' : 'text-gray-400 dark:text-gray-500'
                            )}
                            disabled={loading[`queue-${category.id}`]}
                          >
                            {loading[`queue-${category.id}`] ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListPlus className="h-4 w-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{category.isInQueue ? 'Remove from Queue' : 'Add to Queue'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button variant="outline" size="sm" onClick={() => router.push(`/role-listener/${sharerId}/topics/${category.id}`)}>
                      View Prompts <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAndSortedCategories.map((category) => (
            <ListenerTopicCard 
              key={category.id} 
              category={category} 
              sharerId={sharerId}
              onToggleFavorite={() => toggleFavorite(category.id)}
              onToggleQueue={() => toggleQueue(category.id)}
              isLoadingFavorite={loading[`fav-${category.id}`]}
              isLoadingQueue={loading[`queue-${category.id}`]}
            />
          ))}
        </div>
      )}

      {/* Prompt List Popup */} 
      {isPromptListOpen && selectedCategory && (
        <PromptListPopup 
          categoryId={selectedCategory.id}
          categoryName={selectedCategory.category}
          sharerId={sharerId}
          currentRole={currentRole}
          onClose={() => {
            setIsPromptListOpen(false);
            setSelectedCategory(null);
          }}
        />
      )}
    </div>
  );
}

// Wrap the component with React.memo for performance optimization
const ListenerTopicsTable = React.memo(ListenerTopicsTableComponent);
export default ListenerTopicsTable; 