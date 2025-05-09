'use client';

import { Button } from '@/components/ui/button';
import { Star, ListPlus, MessageSquare, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewFilter = 'favorites' | 'queue' | 'has-responses';

interface TopicsTableFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  themeFilter: string;
  setThemeFilter: (theme: string) => void;
  themes: string[];
  activeFilters: ViewFilter[];
  onFilterChange: (filter: ViewFilter) => void;
  onResetFilters: () => void;
  showHasResponses?: boolean;
}

const FilterButton = ({ 
  filter, 
  label, 
  icon: Icon, 
  isActive, 
  onClick 
}: { 
  filter: ViewFilter;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick: (filter: ViewFilter) => void;
}) => (
  <Button
    variant={isActive ? 'default' : 'outline'}
    onClick={() => onClick(filter)}
    size="sm"
    className={cn(
      'border-0 rounded-lg transition-colors h-8 px-3',
      isActive
        ? 'bg-[#8fbc55] text-[#1B4332] hover:bg-[#8fbc55]/90 font-medium' 
        : 'bg-gray-200/50 text-gray-600 hover:bg-gray-200/80'
    )}
  >
    <Icon className="h-3.5 w-3.5 mr-1.5" />
    {label}
  </Button>
);

export default function TopicsTableFilters({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  themeFilter,
  setThemeFilter,
  themes,
  activeFilters,
  onFilterChange,
  onResetFilters,
  showHasResponses = true,
}: TopicsTableFiltersProps) {
  return (
    <div className="flex flex-wrap gap-x-1.5 gap-y-2 items-center">
      <FilterButton
        filter="favorites"
        label="Favorites"
        icon={Star}
        isActive={activeFilters.includes('favorites')}
        onClick={onFilterChange}
      />
      <FilterButton
        filter="queue"
        label="Queue"
        icon={ListPlus}
        isActive={activeFilters.includes('queue')}
        onClick={onFilterChange}
      />
      {showHasResponses && (
        <FilterButton
          filter="has-responses"
          label="Has Responses"
          icon={MessageSquare}
          isActive={activeFilters.includes('has-responses')}
          onClick={onFilterChange}
        />
      )}

      {(activeFilters.length > 0 || searchQuery || statusFilter !== 'all' || themeFilter !== 'all') && (
        <Button
          variant="outline"
          onClick={onResetFilters}
          size="sm"
          className="border-0 rounded-lg bg-gray-200/50 text-gray-600 hover:bg-gray-200/80 transition-colors h-8 px-3"
        >
          <X className="h-3.5 w-3.5 mr-1.5" />
          Clear
        </Button>
      )}
    </div>
  );
} 