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
  // Removed statusFilter state
  const [themeFilter, setThemeFilter] = useState('all');
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Keep view filters (Favorites, Queue) - Has Responses filter removed
  const [activeFilters, setActiveFilters] = useState<ViewFilter[]>(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam && ['favorites', 'queue'].includes(filterParam)) { // Only allow fav/queue
      return [filterParam as ViewFilter];
    }
    return [];
  });

  const [sortField, setSortField] = useState<SortField>('topic');
  const [sortAsc, setSortAsc] = useState(true);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState<ExtendedPromptCategory | null>(null);
  const [isPromptListOpen, setIsPromptListOpen] = useState(false);

  // View preferences store hook - use LISTENER view preference (if we decide to add one later, else defaults to grid)
  // For now, let's just hardcode listener view or use a generic one if ViewPreferencesStore supports it.
  // Let's default to grid for now.
  // const { listenerTopicsView, setListenerTopicsView } = useViewPreferences(); // Hypothetical store access
  
  // Local state for view mode
  const [currentViewMode, setCurrentViewMode] = useState<'grid' | 'table'>('grid');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Placeholder for potentially loading view preference from store/localStorage later
    if (isMounted) {
      // const preferredView = listenerTopicsView; // Hypothetical
      // setCurrentViewMode(preferredView);
    }
  }, [isMounted]); // Add listenerTopicsView if implementing preference store

  const handleViewModeChange = useCallback((mode: 'grid' | 'table') => {
    // Placeholder for updating store/localStorage later
    // setListenerTopicsView(mode); // Hypothetical
    setCurrentViewMode(mode); // Update local state directly for now
  }, []); // Add setListenerTopicsView if implementing preference store

  // --- Role specific constant ---
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
        p_role: currentRole, // Always LISTENER
        p_sharer_id: null // Listener favorites are not tied to a sharer
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
        p_role: currentRole, // Always LISTENER
        p_sharer_id: null // Listener queue items are not tied to a sharer
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

  // Removed getCompletionStatus and getStatusBadgeVariant functions

  const handleViewFilterChange = (filter: ViewFilter) => {
    // If clicking 'has-responses', ignore it for listeners
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
    // Removed statusFilter reset
    setThemeFilter('all');
  };

  // --- ADDED: Helper function to format theme names ---
  const formatThemeName = (theme: string | null | undefined): string => {
    if (!theme) return '-'; // Handle null/undefined case
    // Replace underscores/hyphens with spaces and capitalize words
    return theme
      .replace(/[_-]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // --- Filtering and Sorting Logic ---
  const filteredAndSortedCategories = useMemo(() => {
    let filtered = [...promptCategories];

    // Apply search query
    if (searchQuery) {
      filtered = filtered.filter(category =>
        category.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply theme filter
    if (themeFilter !== 'all') {
      filtered = filtered.filter(category => category.theme === themeFilter);
    }

    // Apply active view filters (Favorites, Queue)
    if (activeFilters.includes('favorites')) {
      filtered = filtered.filter(category => category.isFavorite);
    }
    if (activeFilters.includes('queue')) {
      filtered = filtered.filter(category => category.isInQueue);
    }
    // 'has-responses' filter is ignored for listeners

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'topic') {
        comparison = a.category.localeCompare(b.category);
      } else { // theme
        comparison = (a.theme ?? '').localeCompare(b.theme ?? '');
      }
      return sortAsc ? comparison : -comparison;
    });

    return filtered;
  }, [
    promptCategories, 
    searchQuery, 
    themeFilter, // Removed statusFilter dependency
    activeFilters, 
    sortField, 
    sortAsc
    // Removed getCompletionStatus dependency
  ]);

  const allThemes = useMemo(() => 
    [...new Set(initialPromptCategories.map(cat => cat.theme).filter(Boolean))].sort()
  , [initialPromptCategories]);

  const handleTopicCardClick = useCallback((category: ExtendedPromptCategory) => {
    // Listeners cannot click the card to navigate, only buttons inside
    // console.log("[ListenerTopicsTable] Card click disabled for listener role.");
  }, []);

  const handlePromptListOpen = useCallback((category: ExtendedPromptCategory) => {
    setSelectedCategory(category);
    setIsPromptListOpen(true);
  }, []);

  const handlePromptListClose = useCallback(() => {
    setIsPromptListOpen(false);
    setSelectedCategory(null);
  }, []);

  // Updated to navigate directly
  const handleNavigateToTopic = useCallback((topicId: string) => {
    if (sharerId && topicId) {
      router.push(`/role-listener/${sharerId}/topics/${topicId}`);
    } else {
      console.warn('[ListenerTopicsTable] Missing sharerId or topicId for navigation');
      toast.error('Could not navigate to topic. Missing required information.');
    }
  }, [router, sharerId]);

  // Render logic
  if (!isMounted) {
    return <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>;
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
            {allThemes.map((theme) => (
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
        // Table View - Apply Telloom Card Styling to wrapper
        <div className="border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] rounded-2xl overflow-hidden">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                  <Button variant="ghost" onClick={() => handleSort('topic')} className="px-0 hover:bg-transparent">
                    Topic
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </th>
                {/* Theme header: hidden on mobile, visible on sm+ */}
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 hidden sm:table-cell">
                   <Button variant="ghost" onClick={() => handleSort('theme')} className="px-0 hover:bg-transparent">
                    Theme
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </th>
                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 pr-6 sm:pr-8">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {filteredAndSortedCategories.length > 0 ? (
                filteredAndSortedCategories.map((category) => (
                  <tr key={category.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      <div className="font-medium">{category.category}</div>
                      {/* Theme pill for mobile: visible on xs, hidden on sm+ */}
                      {category.theme && (
                        <div className="mt-1 inline-block bg-gray-100 text-gray-700 text-[10px] font-semibold px-2 py-0.5 rounded-full sm:hidden">
                          {formatThemeName(category.theme)}
                        </div>
                      )}
                    </td>
                    {/* Theme data cell: hidden on mobile, visible on sm+ */}
                    <td className="p-4 align-middle text-muted-foreground [&:has([role=checkbox])]:pr-0 hidden sm:table-cell">
                      {formatThemeName(category.theme)}
                    </td>
                    <td className="p-4 align-middle text-right [&:has([role=checkbox])]:pr-0 pr-1 sm:pr-2">
                      <div className="flex justify-end items-center gap-0">
                        {/* Favorite Button */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleFavorite(category.id)}
                                className="h-8 w-8 p-0 hover:bg-transparent"
                              >
                                {loading[`fav-${category.id}`] ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Star
                                    className={cn(
                                      "w-[18px] h-[18px] md:w-[20px] md:h-[20px] transition-colors",
                                      category.isFavorite 
                                        ? "fill-[#1B4332] text-[#1B4332]" 
                                        : "text-gray-400 hover:text-[#8fbc55] hover:fill-[#8fbc55]"
                                    )}
                                    strokeWidth={2}
                                  />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{category.isFavorite ? "Remove from my favorites" : "Add to my favorites"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {/* Queue Button */}
                        <TooltipProvider>
                           <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleQueue(category.id)}
                                className="h-8 w-8 p-0 hover:bg-transparent"
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
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                  </svg>
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{category.isInQueue ? "Remove from my queue" : "Add to my queue"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {/* Go To Topic Button (ArrowRight) */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleNavigateToTopic(category.id)}
                                className="h-8 w-8 p-0 rounded-full hover:bg-[#8fbc55] transition-colors duration-200"
                              >
                                <ArrowRight className="h-5 w-5 md:h-6 md:w-6 text-gray-400 hover:text-[#1B4332] transition-colors duration-200" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View Topic Details</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  {/* Adjusted colSpan for "No topics found" to account for potentially hidden theme column */}
                  <td colSpan={3} className="p-8 text-center text-muted-foreground">
                    No topics found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        // Grid View
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filteredAndSortedCategories.length > 0 ? (
            filteredAndSortedCategories.map((category) => (
              <ListenerTopicCard // USE LISTENER CARD
                key={category.id}
                promptCategory={category}
                onFavoriteClick={() => toggleFavorite(category.id)}
                onQueueClick={() => toggleQueue(category.id)}
                sharerId={sharerId} // Pass sharerId needed for PromptListPopup
                // onClick handler removed as listener card doesn't navigate
              />
            ))
          ) : (
            <p className="col-span-full text-center text-muted-foreground py-8">
              No topics found matching your criteria.
            </p>
          )}
        </div>
      )}

      {/* Prompt List Popup */} 
      {isPromptListOpen && selectedCategory && (
        <PromptListPopup 
          categoryId={selectedCategory.id}
          categoryName={selectedCategory.category}
          sharerId={sharerId} // Pass sharerId
          currentRole={currentRole} // Pass LISTENER role
          onClose={handlePromptListClose}
        />
      )}
    </div>
  );
}

// Wrap the component with React.memo for performance optimization
const ListenerTopicsTable = React.memo(ListenerTopicsTableComponent);
export default ListenerTopicsTable; 