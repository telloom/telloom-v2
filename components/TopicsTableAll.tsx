// components/TopicsTableAll.tsx
'use client';

import { useState, useEffect } from 'react';
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
import { ArrowRight } from 'lucide-react';

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
  promptCategories: PromptCategory[];
}

export default function TopicsTableAll({ promptCategories: initialPromptCategories }: TopicsTableAllProps) {
  const router = useRouter();
  const supabase = createClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewFilter, setViewFilter] = useState('all');
  const [themeFilter, setThemeFilter] = useState('all');
  const [promptCategories, setPromptCategories] = useState<PromptCategory[]>(initialPromptCategories);
  const [selectedCategory, setSelectedCategory] = useState<PromptCategory | null>(null);
  const [isPromptListOpen, setIsPromptListOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const toggleFavorite = async (promptCategoryId: string) => {
    try {
      setError(null);
      const category = promptCategories.find(c => c.id === promptCategoryId);
      if (!category) return;

      const newIsFavorite = !category.isFavorite;
      
      // Update UI immediately
      setPromptCategories(prev => prev.map(cat => 
        cat.id === promptCategoryId 
          ? { ...cat, isFavorite: newIsFavorite }
          : cat
      ));
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user');

      if (!newIsFavorite) {
        const { error } = await supabase
          .from('TopicFavorite')
          .delete()
          .eq('profileId', user.id)
          .eq('promptCategoryId', promptCategoryId);

        if (error) {
          // Revert UI on error
          setPromptCategories(prev => prev.map(cat => 
            cat.id === promptCategoryId 
              ? { ...cat, isFavorite: !newIsFavorite }
              : cat
          ));
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('TopicFavorite')
          .insert({ 
            profileId: user.id,
            promptCategoryId 
          });

        if (error) {
          // Revert UI on error
          setPromptCategories(prev => prev.map(cat => 
            cat.id === promptCategoryId 
              ? { ...cat, isFavorite: !newIsFavorite }
              : cat
          ));
          throw error;
        }
      }
    } catch (error: any) {
      if (error.message.includes('auth')) {
        setError('Please log in to favorite topics');
      } else {
        setError('Failed to update favorite status');
      }
    }
  };

  const toggleQueue = async (promptCategoryId: string) => {
    try {
      setError(null);
      const category = promptCategories.find(c => c.id === promptCategoryId);
      if (!category) return;

      const newIsInQueue = !category.isInQueue;

      // Update UI immediately
      setPromptCategories(prev => prev.map(cat => 
        cat.id === promptCategoryId 
          ? { ...cat, isInQueue: newIsInQueue }
          : cat
      ));
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user');

      if (!newIsInQueue) {
        const { error } = await supabase
          .from('TopicQueueItem')
          .delete()
          .eq('profileId', user.id)
          .eq('promptCategoryId', promptCategoryId);

        if (error) {
          // Revert UI on error
          setPromptCategories(prev => prev.map(cat => 
            cat.id === promptCategoryId 
              ? { ...cat, isInQueue: !newIsInQueue }
              : cat
          ));
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('TopicQueueItem')
          .insert({ 
            profileId: user.id,
            promptCategoryId 
          });

        if (error) {
          // Revert UI on error
          setPromptCategories(prev => prev.map(cat => 
            cat.id === promptCategoryId 
              ? { ...cat, isInQueue: !newIsInQueue }
              : cat
          ));
          throw error;
        }
      }
    } catch (error: any) {
      if (error.message.includes('auth')) {
        setError('Please log in to add topics to queue');
      } else {
        setError('Failed to update queue status');
      }
    }
  };

  const filteredCategories = promptCategories.filter(category => {
    const matchesSearch = category.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'completed' && category.prompts.some(p => p.videos.length > 0)) ||
      (statusFilter === 'incomplete' && category.prompts.every(p => p.videos.length === 0));
    const matchesView = viewFilter === 'all' ||
      (viewFilter === 'favorites' && category.isFavorite) ||
      (viewFilter === 'queue' && category.isInQueue);
    const matchesTheme = themeFilter === 'all' || category.theme === themeFilter;

    return matchesSearch && matchesStatus && matchesView && matchesTheme;
  });

  const getCompletionStatus = (category: PromptCategory) => {
    const totalPrompts = category.prompts.length;
    const completedPrompts = category.prompts.filter(p => p.videos.length > 0).length;
    return `${completedPrompts}/${totalPrompts}`;
  };

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
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search topics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="sm:w-1/3 border-2 border-[#1B4332] rounded-lg focus-visible:ring-[#8fbc55]"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-1/6 border-2 border-[#1B4332] rounded-lg focus:ring-[#8fbc55]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="incomplete">Incomplete</SelectItem>
          </SelectContent>
        </Select>
        <Select value={viewFilter} onValueChange={setViewFilter}>
          <SelectTrigger className="sm:w-1/6 border-2 border-[#1B4332] rounded-lg focus:ring-[#8fbc55]">
            <SelectValue placeholder="View" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Topics</SelectItem>
            <SelectItem value="favorites">Favorites</SelectItem>
            <SelectItem value="queue">Queue</SelectItem>
          </SelectContent>
        </Select>
        <Select value={themeFilter} onValueChange={setThemeFilter}>
          <SelectTrigger className="sm:w-1/6 border-2 border-[#1B4332] rounded-lg focus:ring-[#8fbc55]">
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
      </div>

      <div className="border-2 border-[#1B4332] rounded-xl shadow-[6px_6px_0_0_#8fbc55] bg-white">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-[#1B4332]">
              <TableHead className="font-semibold">Topic</TableHead>
              <TableHead className="font-semibold">Theme</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-center font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCategories.map((category) => (
              <TableRow 
                key={category.id}
                className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                onClick={() => {
                  setSelectedCategory(category);
                  setIsPromptListOpen(true);
                }}
              >
                <TableCell>
                  <div>
                    <h3 className="font-medium">{category.category}</h3>
                  </div>
                </TableCell>
                <TableCell className="text-gray-500">
                  {formatThemeName(category.theme || '')}
                </TableCell>
                <TableCell>
                  <Badge variant={category.prompts.some(p => p.videos.length > 0) ? "default" : "secondary"}>
                    {getCompletionStatus(category)}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleFavorite(category.id)}
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
                            onClick={() => toggleQueue(category.id)}
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

      {selectedCategory && (
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

