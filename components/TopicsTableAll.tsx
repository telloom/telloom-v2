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

export interface TopicsTableAllProps {
  promptCategories: PromptCategory[];
}

interface PromptCategory {
  id: string;
  category: string | null;
  description: string | null;
  theme: Theme | null;
  prompts: Prompt[];
}

interface Prompt {
  id: string;
  promptText: string;
  promptType: string | null;
  isContextEstablishing: boolean | null;
  promptCategoryId: string | null;
  videos: { id: string }[];
  promptResponses: { id: string }[];
}

export default function TopicsTableAll({ promptCategories }: TopicsTableAllProps) {
  const router = useRouter();
  const supabase = createClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewFilter, setViewFilter] = useState('all');
  const [themeFilter, setThemeFilter] = useState('all');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [queued, setQueued] = useState<string[]>([]);

  useEffect(() => {
    const loadUserPreferences = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      const [{ data: favoriteData }, { data: queuedData }] = await Promise.all([
        supabase
          .from('FavoritePromptCategory')
          .select('promptCategoryId')
          .eq('profileId', user.id),
        supabase
          .from('QueuedPromptCategory')
          .select('promptCategoryId')
          .eq('profileId', user.id),
      ]);

      setFavorites(favoriteData?.map(f => f.promptCategoryId) || []);
      setQueued(queuedData?.map(q => q.promptCategoryId) || []);
    };

    loadUserPreferences();
  }, [supabase]);

  const toggleFavorite = async (promptCategoryId: string) => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return;

    if (favorites.includes(promptCategoryId)) {
      await supabase
        .from('FavoritePromptCategory')
        .delete()
        .eq('profileId', user.id)
        .eq('promptCategoryId', promptCategoryId);
      setFavorites(prev => prev.filter(id => id !== promptCategoryId));
    } else {
      await supabase
        .from('FavoritePromptCategory')
        .insert({
          profileId: user.id,
          promptCategoryId: promptCategoryId,
        });
      setFavorites(prev => [...prev, promptCategoryId]);
    }
  };

  const toggleQueue = async (promptCategoryId: string) => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return;

    if (queued.includes(promptCategoryId)) {
      await supabase
        .from('QueuedPromptCategory')
        .delete()
        .eq('profileId', user.id)
        .eq('promptCategoryId', promptCategoryId);
      setQueued(prev => prev.filter(id => id !== promptCategoryId));
    } else {
      await supabase
        .from('QueuedPromptCategory')
        .insert({
          profileId: user.id,
          promptCategoryId: promptCategoryId,
        });
      setQueued(prev => [...prev, promptCategoryId]);
    }
  };

  const filteredCategories = promptCategories.filter(category => {
    const matchesSearch = category.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'completed' && category.prompts.some(p => p.videos.length > 0)) ||
      (statusFilter === 'incomplete' && category.prompts.every(p => p.videos.length === 0));
    const matchesView = viewFilter === 'all' ||
      (viewFilter === 'favorites' && favorites.includes(category.id)) ||
      (viewFilter === 'queue' && queued.includes(category.id));
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
    promptCategories?.forEach(category => {
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search topics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="sm:w-1/3"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-1/6">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="incomplete">Incomplete</SelectItem>
          </SelectContent>
        </Select>
        <Select value={viewFilter} onValueChange={setViewFilter}>
          <SelectTrigger className="sm:w-1/6">
            <SelectValue placeholder="View" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Topics</SelectItem>
            <SelectItem value="favorites">Favorites</SelectItem>
            <SelectItem value="queue">Queue</SelectItem>
          </SelectContent>
        </Select>
        <Select value={themeFilter} onValueChange={setThemeFilter}>
          <SelectTrigger className="sm:w-1/6">
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Topic</TableHead>
              <TableHead>Theme</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCategories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  <div>
                    <h3 className="font-medium">{category.category}</h3>
                    <p className="text-sm text-gray-500">{category.description}</p>
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
                <TableCell>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFavorite(category.id)}
                    >
                      {favorites.includes(category.id) ? '★' : '☆'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleQueue(category.id)}
                    >
                      {queued.includes(category.id) ? '📋' : '➕'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/role-sharer/topics/${category.id}`)}
                    >
                      View
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

