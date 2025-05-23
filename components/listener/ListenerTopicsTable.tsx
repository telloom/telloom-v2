// components/listener/ListenerTopicsTable.tsx
// LISTENER-SPECIFIC: Component for displaying topics in table or grid view, WITHOUT status/progress.

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
// import { useViewPreferences } from '@/stores/viewPreferencesStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { PromptListPopup } from '@/components/PromptListPopup';
import ListenerTopicCard from '@/components/listener/ListenerTopicCard'; // USE LISTENER CARD
import TopicsTableFilters from '@/components/TopicsTableFilters';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  Search,
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

type ViewFilter = 'favorites' | 'queue' | 'has-responses';
type SortField = 'topic' | 'theme';

interface ExtendedPromptCategory extends PromptCategory {
  completedPromptCount?: number;
  totalPromptCount?: number;
  isFavorite?: boolean;
  isInQueue?: boolean;
  displayName?: string;
}

interface ListenerTopicsTableProps {
  initialPromptCategories: ExtendedPromptCategory[];
  sharerId: string;
}

function ListenerTopicsTableComponent({ 
  initialPromptCategories,
  sharerId,
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
  
  const [currentViewMode, setCurrentViewMode] = useState<'grid' | 'table'>('grid');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
        p_sharer_id: sharerId
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
  }, [user, supabase, promptCategories, currentRole, sharerId]);

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
        p_sharer_id: sharerId
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
  }, [user, supabase, promptCategories, currentRole, sharerId]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleViewFilterChange = (filter: ViewFilter) => {
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
    if (!theme) return 'General';
    return theme
      .replace(/[_-]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };
  
  const renderThemePill = (theme: string | null | undefined) => (
    <span className="inline-block bg-gray-100 text-gray-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
      {formatThemeName(theme)}
    </span>
  );

  const filteredAndSortedCategories = useMemo(() => {
    let categories = [...promptCategories];

    if (searchQuery) {
      categories = categories.filter(category =>
        (category.displayName || category.category)?.toLowerCase().includes(searchQuery.toLowerCase())
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
      } else {
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

  if (!isMounted) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-gray-500" /></div>;
  }
  
  return (
    <div className="space-y-6">
      {/* Search and Filter Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground md:left-3" />
          <Input
            placeholder="Search topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 px-2 pl-8 text-[16px] rounded-full md:h-9 md:px-3 md:pl-10 md:text-sm"
          />
        </div>
        <Select value={themeFilter} onValueChange={setThemeFilter}>
          <SelectTrigger className="w-full sm:w-[240px] h-8 px-3 text-[16px] rounded-full md:h-9 md:text-sm">
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
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={'all'}
          setStatusFilter={() => {}}
          themeFilter={themeFilter}
          setThemeFilter={setThemeFilter}
          themes={uniqueThemes}
          activeFilters={activeFilters}
          onFilterChange={handleViewFilterChange}
          onResetFilters={handleResetFilters}
          showHasResponses={false}
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
        <div className="w-full rounded-lg border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('topic')}
                  >
                    Topic
                    {sortField === 'topic' && (
                      <ArrowUpDown className={`inline-block ml-1 h-3 w-3 ${sortAsc ? '' : 'transform rotate-180'}`} />
                    )}
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hidden md:table-cell"
                    onClick={() => handleSort('theme')}
                  >
                    Theme
                    {sortField === 'theme' && (
                      <ArrowUpDown className={`inline-block ml-1 h-3 w-3 ${sortAsc ? '' : 'transform rotate-180'}`} />
                    )}
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedCategories.map(category => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900 whitespace-normal break-words">
                          {category.displayName || category.category}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 md:hidden">
                          {renderThemePill(category.theme)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell md:text-center">
                      {renderThemePill(category.theme)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center justify-center space-x-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={(e) => { e.stopPropagation(); toggleFavorite(category.id); }}
                                className="h-8 w-8 md:h-9 md:w-9 p-0 hover:bg-transparent"
                                disabled={loading[`fav-${category.id}`]}
                              >
                                {loading[`fav-${category.id}`] ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                                  <Star
                                    className={cn(
                                      "w-[18px] h-[18px] md:w-[20px] md:h-[20px] transition-colors",
                                      category.isFavorite 
                                        ? "fill-[#1B4332] text-[#1B4332]" 
                                        : "text-gray-400 hover:text-[#8fbc55] hover:fill-[#8fbc55]"
                                    )}
                                    strokeWidth={2}
                                  />
                                }
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
                                onClick={(e) => { e.stopPropagation(); toggleQueue(category.id); }}
                                className="h-8 w-8 md:h-9 md:w-9 p-0 hover:bg-transparent"
                                disabled={loading[`queue-${category.id}`]}
                              >
                                {loading[`queue-${category.id}`] ? <Loader2 className="h-4 w-4 animate-spin" /> : 
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
                                }
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{category.isInQueue ? 'Remove from Queue' : 'Add to Queue'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                           <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={(e) => { e.stopPropagation(); router.push(`/role-listener/${sharerId}/topics/${category.id}`);}}
                                  className="h-8 w-8 md:h-9 md:w-9 p-0 rounded-full hover:bg-[#8fbc55]/20 transition-colors duration-200 group"
                                >
                                  <ArrowRight className="h-5 w-5 text-gray-500 group-hover:text-[#1B4332] transition-colors duration-200" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View Prompts</p>
                              </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
          promptCategory={selectedCategory}
          sharerId={sharerId}
          currentRole={currentRole}
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

const ListenerTopicsTable = React.memo(ListenerTopicsTableComponent);
export default ListenerTopicsTable; 