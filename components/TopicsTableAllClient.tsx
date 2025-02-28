'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useViewPreferences } from '@/stores/viewPreferencesStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { PromptListPopup } from '@/components/PromptListPopup';
import TopicCard from '@/components/TopicCard';
import TopicsTableFilters from '@/components/TopicsTableFilters';
import { ActionButton } from '@/components/action-button';
import { toast } from 'sonner';
import {
  Search,
  Star,
  ListPlus,
  MessageSquare,
  X,
  TableIcon,
  LayoutGrid,
  ArrowUpDown,
  ArrowRight,
  ListOrdered
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useRouter } from 'next/navigation';

interface CompletionStatus {
  status: 'Not Started' | 'In Progress' | 'Completed';
  ratio: string;
}

type ViewFilter = 'favorites' | 'queue' | 'has-responses';
type SortField = 'topic' | 'theme';

interface PromptResponse {
  // Add any necessary properties
}

interface Prompt {
  PromptResponse: PromptResponse[];
  // Add any other necessary properties
}

interface PromptCategory {
  id: string;
  category: string;
  theme: string | null;
  description: string;
  prompts: Prompt[];
  isFavorite?: boolean;
  isInQueue?: boolean;
}

interface TopicsTableAllProps {
  initialPromptCategories: PromptCategory[];
  currentRole?: 'SHARER' | 'EXECUTOR';
  relationshipId?: string;
  sharerId?: string;
}

export default function TopicsTableAllClient({ 
  initialPromptCategories,
  currentRole = 'SHARER',
  relationshipId,
  sharerId
}: TopicsTableAllProps) {
  const supabase = createClient();
  const [promptCategories, setPromptCategories] = useState(initialPromptCategories);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [themeFilter, setThemeFilter] = useState('all');
  const [activeFilters, setActiveFilters] = useState<ViewFilter[]>([]);
  const [sortField, setSortField] = useState<SortField>('topic');
  const [sortAsc, setSortAsc] = useState(true);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [selectedCategory, setSelectedCategory] = useState<PromptCategory | null>(null);
  const [isPromptListOpen, setIsPromptListOpen] = useState(false);
  const router = useRouter();

  // View preferences from store
  const { 
    sharerTopicsView, 
    executorTopicsView, 
    setSharerTopicsView, 
    setExecutorTopicsView 
  } = useViewPreferences();
  
  // Compute current view mode from store
  const currentViewMode = currentRole === 'SHARER' ? sharerTopicsView : executorTopicsView;

  const handleViewModeChange = useCallback((mode: 'grid' | 'table') => {
    if (currentRole === 'SHARER') {
      setSharerTopicsView(mode);
    } else {
      setExecutorTopicsView(mode);
    }
  }, [currentRole, setSharerTopicsView, setExecutorTopicsView]);

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
      setSortAsc(!sortAsc);
    } else {
      // If clicking a new field, set it with ascending direction
      setSortField(field);
      setSortAsc(true);
    }
  };

  const getCompletionStatus = useCallback((category: PromptCategory): CompletionStatus => {
    const totalPrompts = category.prompts.length;
    const completedPrompts = category.prompts.filter(p => 
      Array.isArray(p.PromptResponse) && p.PromptResponse.length > 0
    ).length;
    
    const ratio = `${completedPrompts}/${totalPrompts}`;

    if (completedPrompts === 0) {
      return { status: 'Not Started', ratio };
    }

    if (completedPrompts === totalPrompts) {
      return { status: 'Completed', ratio };
    }

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
    setStatusFilter('all');
    setThemeFilter('all');
  };

  const filteredCategories = useMemo(() => {
    return promptCategories
      .filter(category => {
        const matchesSearch = category.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          category.description?.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesTheme = themeFilter === 'all' || category.theme === themeFilter;
        const matchesStatus = statusFilter === 'all' || getCompletionStatus(category).status.toLowerCase() === statusFilter;
        
        const matchesFilters = activeFilters.length === 0 || activeFilters.every(filter => {
          switch (filter) {
            case 'favorites':
              return category.isFavorite;
            case 'queue':
              return category.isInQueue;
            case 'has-responses':
              return category.prompts.some(p => Array.isArray(p.PromptResponse) && p.PromptResponse.length > 0);
            default:
              return false;
          }
        });

        return matchesSearch && matchesStatus && matchesTheme && matchesFilters;
      })
      .sort((a, b) => {
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
  }, [promptCategories, searchQuery, statusFilter, themeFilter, activeFilters, sortField, sortAsc, getCompletionStatus]);

  const themes = useMemo(() => {
    const uniqueThemes = new Set(
      promptCategories
        .map(category => category.theme)
        .filter((theme): theme is string => typeof theme === 'string')
    );
    return Array.from(uniqueThemes);
  }, [promptCategories]);

  const formatThemeName = (theme: string) => {
    if (!theme) return '';
    return theme
      .split('_')
      .map((word: string) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="w-full md:w-1/4 relative">
          <Input
            placeholder="Search topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-2 border-gray-200 rounded-lg focus-visible:ring-[#8fbc55] pr-10"
          />
          <Search className="h-4 w-4 text-gray-500 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="flex flex-wrap gap-2 items-center md:flex-1 md:justify-end">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger 
              className={cn(
                'w-[140px] border-0 rounded-lg h-8 px-3 text-sm',
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
                'w-[180px] border-0 rounded-lg whitespace-normal text-left h-8 px-3 text-sm',
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

          <div className="flex flex-wrap gap-2 items-center">
            <TopicsTableFilters
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              themeFilter={themeFilter}
              setThemeFilter={setThemeFilter}
              themes={themes}
              activeFilters={activeFilters}
              onFilterChange={handleViewFilterChange}
              onResetFilters={handleResetFilters}
            />

            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleViewModeChange('table')}
                className={cn(
                  'p-2 h-9 w-9 transition-colors',
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
                  'p-2 h-9 w-9 transition-colors',
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

      {currentViewMode === 'table' ? (
        <div className="w-full">
          <div className="w-full rounded-lg border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55]">
            <div className="w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="border-b">
                  <tr className="transition-colors hover:bg-muted/50">
                    <th 
                      onClick={() => handleSort('topic')} 
                      className="h-12 px-4 text-left align-middle font-medium cursor-pointer hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        Topic
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </th>
                    <th 
                      className="h-12 px-4 text-left align-middle font-medium hidden md:table-cell cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('theme')}
                    >
                      <div className="flex items-center gap-2">
                        Theme
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
                    <th className="h-12 px-4 text-right align-middle font-medium">Actions</th>
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
                        <td className="p-4 align-middle font-medium">
                          {category.category}
                        </td>
                        <td className="p-4 align-middle text-muted-foreground hidden md:table-cell">
                          {formatThemeName(category.theme || '')}
                        </td>
                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-2">
                            <Badge variant={getStatusBadgeVariant(status)}>
                              {status.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {status.ratio}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 align-middle text-right">
                          <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(category.id);
                                }}
                                className="h-8 w-8 md:h-9 md:w-9 p-0 hover:bg-transparent"
                                disabled={loading[`favorite-${category.id}`]}
                              >
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
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleQueue(category.id);
                                }}
                                className="h-8 w-8 md:h-9 md:w-9 p-0 hover:bg-transparent"
                                disabled={loading[`queue-${category.id}`]}
                              >
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
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedCategory(category);
                                  setIsPromptListOpen(true);
                                }}
                                className="h-8 w-8 md:h-9 md:w-9 p-0 hover:bg-[#8fbc55] hover:text-white rounded-full"
                              >
                                <ListOrdered className="h-5 w-5 md:h-6 md:w-6 text-[#1B4332]" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.push(`/role-${currentRole.toLowerCase()}/topics/${category.id}`)}
                                className="h-8 w-8 md:h-9 md:w-9 p-0 hover:bg-[#8fbc55] hover:text-white rounded-full"
                              >
                                <ArrowRight className="h-5 w-5 md:h-6 md:w-6 text-[#1B4332] stroke-[3]" />
                              </Button>
                            </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((category) => (
            <TopicCard
              key={category.id}
              promptCategory={category}
              onFavoriteClick={(e: React.MouseEvent<Element>) => {
                e.stopPropagation();
                toggleFavorite(category.id);
              }}
              onQueueClick={(e: React.MouseEvent<Element>) => {
                e.stopPropagation();
                toggleQueue(category.id);
              }}
              onClick={() => {
                setSelectedCategory(category);
                setIsPromptListOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {selectedCategory && (
        <PromptListPopup
          promptCategory={selectedCategory}
          isOpen={isPromptListOpen}
          onClose={() => {
            setSelectedCategory(null);
            setIsPromptListOpen(false);
          }}
        />
      )}
    </div>
  );
} 