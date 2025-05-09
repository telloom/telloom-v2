// components/TopicsList.tsx
// This component renders a list of topic categories, filtering them into in-progress, completed, and suggested sections.
"use client";

import React, { useEffect, useState } from 'react';
import { PromptCategory } from '@/types/models';
import TopicCard from './TopicCard';
import { useRouter } from 'next/navigation';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useCurrentRole } from '@/hooks/useCurrentRole';

export default function TopicsList({ promptCategories: initialPromptCategories }: { promptCategories: PromptCategory[] }) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [promptCategories, setPromptCategories] = useState<PromptCategory[]>(initialPromptCategories || []);
  const router = useRouter();
  const supabase = createClient();
  
  const roleStringFromHook = useCurrentRole(); // Assume this returns 'SHARER' | 'EXECUTOR' | 'LISTENER' | null

  // State for role details, populated by RPC
  const [role, setRole] = useState<'SHARER' | 'EXECUTOR' | 'LISTENER'>(roleStringFromHook || 'SHARER');
  const [relationshipId, setRelationshipId] = useState<string | undefined>();
  const [effectiveSharerId, setEffectiveSharerId] = useState<string | undefined>();
  
  // Function to fetch favorites, queue items, AND role details
  useEffect(() => {
    const fetchUserTopicRelationsAndRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setRole(roleStringFromHook || 'SHARER'); 
          setEffectiveSharerId(undefined);
          setRelationshipId(undefined);
          setPromptCategories(prev => prev.map(cat => ({ ...cat, isFavorite: false, isInQueue: false })));
          return;
        }

        console.log('[TOPICSLIST] Fetching role details and topic relations via RPC for user:', user.id);
        
        const { data: rpcRoleInfo, error: roleError } = await supabase.rpc(
          'get_user_role_emergency',
          { user_id: user.id } 
        );
        
        if (roleError) {
          console.error('[TOPICSLIST] Error getting role info from RPC:', roleError);
          setRole(roleStringFromHook || 'SHARER');
        } else if (rpcRoleInfo) {
          console.log('[TOPICSLIST] Got role info from RPC:', rpcRoleInfo);
          // Adjust property names if your RPC returns them differently:
          setRole(rpcRoleInfo.role || (roleStringFromHook || 'SHARER')); 
          setEffectiveSharerId(rpcRoleInfo.sharer_id); 
          setRelationshipId(rpcRoleInfo.relationship_id); 
        }

        const { data: relations, error: relationsError } = await supabase.rpc(
          'get_topic_relations',
          { profile_id: user.id }
        );
        
        if (relationsError) {
          console.error('[TOPICSLIST] Error fetching topic relations via RPC:', relationsError);
          setPromptCategories(prev => prev.map(cat => ({ ...cat, isFavorite: false, isInQueue: false })));
          return;
        }
        
        if (relations) {
          console.log('[TOPICSLIST] Got topic relations from RPC:', relations);
          const favoriteIds = new Set(relations.favorites || []);
          const queuedIds = new Set(relations.queue_items || []);
          setPromptCategories(prev => prev.map(cat => ({
            ...cat,
            isFavorite: favoriteIds.has(cat.id),
            isInQueue: queuedIds.has(cat.id)
          })));
        } else {
          setPromptCategories(prev => prev.map(cat => ({ ...cat, isFavorite: false, isInQueue: false })));
        }
        
      } catch (error) {
        console.error('[TOPICSLIST] General error in fetchUserTopicRelationsAndRole:', error);
        setRole(roleStringFromHook || 'SHARER');
        setPromptCategories(prev => prev.map(cat => ({ ...cat, isFavorite: false, isInQueue: false })));
      }
    };

    fetchUserTopicRelationsAndRole();
  }, [roleStringFromHook, supabase]); // Re-run if hook value changes or supabase client instance
  
  console.log('[TOPICSLIST] Current role context (state/hook):', { 
    roleState: role, 
    relationshipIdState: relationshipId, 
    effectiveSharerIdState: effectiveSharerId,
    roleDirectlyFromHook: roleStringFromHook
  });
  
  console.log('[TOPICSLIST] Received categories (initial prop):', initialPromptCategories?.length || 0);
  console.log('[TOPICSLIST] First category sample:', initialPromptCategories?.[0] ? {
    id: initialPromptCategories[0].id,
    category: initialPromptCategories[0].category,
    promptCount: initialPromptCategories[0].Prompt?.length || 0,
    isFavorite: initialPromptCategories[0].isFavorite,
    isInQueue: initialPromptCategories[0].isInQueue,
    firstPromptSample: initialPromptCategories[0].Prompt?.[0] ? {
      id: initialPromptCategories[0].Prompt[0].id,
      hasResponses: initialPromptCategories[0].Prompt[0].PromptResponse?.length > 0
    } : 'No prompts'
  } : 'No categories available');

  useEffect(() => {
    if (initialPromptCategories) {
      setPromptCategories(initialPromptCategories);
    }
  }, [initialPromptCategories]);

  // Get categories with at least one started but not all completed
  const inProgressCategories = promptCategories.filter(category => {
    const prompts = category.Prompt || [];
    const totalCount = prompts.length;
    if (totalCount === 0) return false;
    
    const completedCount = prompts.filter(prompt => 
      Array.isArray(prompt.PromptResponse) && prompt.PromptResponse.length > 0
    ).length;
    
    return completedCount > 0 && completedCount < totalCount;
  });
  
  console.log('[TOPICSLIST] In-progress categories:', inProgressCategories.length);

  // Get categories with all prompts completed
  const completedCategories = promptCategories.filter(category => {
    const prompts = category.Prompt || [];
    const totalCount = prompts.length;
    if (totalCount === 0) return false;
    
    const completedCount = prompts.filter(prompt => 
      Array.isArray(prompt.PromptResponse) && prompt.PromptResponse.length > 0
    ).length;
    
    return completedCount >= totalCount && completedCount > 0;
  });
  
  console.log('[TOPICSLIST] Completed categories:', completedCategories.length);

  // Get queued categories
  const queuedCategories = promptCategories.filter(category => category.isInQueue);
  console.log('[TOPICSLIST] Queued categories:', queuedCategories.length);

  // Get categories not started and not in queue
  const suggestedCategories = promptCategories.filter(category => {
    const prompts = category.Prompt || [];
    const totalCount = prompts.length;
    if (totalCount === 0) return false;
    
    const completedCount = prompts.filter(prompt => 
      Array.isArray(prompt.PromptResponse) && prompt.PromptResponse.length > 0
    ).length;
    
    return completedCount === 0 && !category.isInQueue;
  });
  
  console.log('[TOPICSLIST] Suggested categories:', suggestedCategories.length);

  const updateCategoryStatus = (categoryId: string, updates: { isFavorite?: boolean; isInQueue?: boolean }) => {
    setPromptCategories(prev => prev.map(category => {
      if (category.id === categoryId) {
        return { ...category, ...updates };
      }
      return category;
    }));
  };

  const handleFavoriteClick = async (e: React.MouseEvent, category: PromptCategory) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('[TOPICSLIST] Toggling favorite for category:', category.id);
      
      // Use RPC function to toggle favorite (bypasses RLS)
      const { data, error } = await supabase.rpc('toggle_topic_favorite', {
        profile_id: user.id,
        category_id: category.id
      });
      
      if (error) {
        console.error('[TOPICSLIST] Error toggling favorite:', error);
        toast.error('Failed to update favorites');
        return;
      }
      
      // Update UI based on the new favorite status
      // data should be true if favorited, false if unfavorited
      const newIsFavorite = !!data;
      console.log('[TOPICSLIST] New favorite status:', newIsFavorite);
      
      updateCategoryStatus(category.id, { isFavorite: newIsFavorite });
      toast.success(newIsFavorite ? 'Added to favorites' : 'Removed from favorites');
    } catch (error) {
      console.error('[TOPICSLIST] Error in handleFavoriteClick:', error);
      toast.error('An error occurred');
    }
  };

  const handleQueueClick = async (e: React.MouseEvent, category: PromptCategory) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('[TOPICSLIST] Toggling queue for category:', category.id);
      
      // Use RPC function to toggle queue (bypasses RLS)
      const { data, error } = await supabase.rpc('toggle_topic_queue', {
        profile_id: user.id,
        category_id: category.id
      });
      
      if (error) {
        console.error('[TOPICSLIST] Error toggling queue:', error);
        toast.error('Failed to update queue');
        return;
      }
      
      // Update UI based on the new queue status
      // data should be true if queued, false if removed from queue
      const newIsQueued = !!data;
      console.log('[TOPICSLIST] New queue status:', newIsQueued);
      
      updateCategoryStatus(category.id, { isInQueue: newIsQueued });
      toast.success(newIsQueued ? 'Added to queue' : 'Removed from queue');
    } catch (error) {
      console.error('[TOPICSLIST] Error in handleQueueClick:', error);
      toast.error('An error occurred');
    }
  };

  const renderTopicCard = (category: PromptCategory) => (
    <TopicCard 
      key={category.id} 
      promptCategory={category}
      onFavoriteClick={(e) => handleFavoriteClick(e, category)}
      onQueueClick={(e) => handleQueueClick(e, category)}
      currentRole={role as any}
      relationshipId={relationshipId}
      sharerId={effectiveSharerId}
    />
  );

  const renderTopicSection = (title: string, filteredCategories: PromptCategory[]) => {
    const getFilterParam = (title: string) => {
      switch (title) {
        case 'In Progress': return 'in-progress';
        case 'Completed': return 'completed';
        case 'Queue': return 'queue';
        case 'Suggested': return 'suggested';
        default: return 'all';
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{title}</h2>
          {filteredCategories.length > 0 && (
            <Button
              variant="link"
              className="text-[#1B4332] font-semibold"
              onClick={() => router.push(`/role-${role?.toLowerCase()}/topics?filter=${getFilterParam(title)}`)}
            >
              See All
            </Button>
          )}
        </div>

        {filteredCategories.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCategories.slice(0, isDesktop ? 6 : 4).map(category => renderTopicCard(category))}
          </div>
        ) : (
          renderEmptySection(title)
        )}
      </div>
    );
  };

  const renderEmptySection = (title: string) => (
    <div className="p-6 border rounded-lg border-gray-200 bg-gray-50 text-center">
      <p className="text-gray-500">
        {title === 'In Progress' && 'No topics are in progress. Start recording to see them here.'}
        {title === 'Completed' && 'No topics are completed. Complete all prompts in a topic to see it here.'}
        {title === 'Queue' && 'No topics are in your queue. Add topics to your queue to see them here.'}
        {title === 'Suggested' && 'No suggested topics found.'}
      </p>
    </div>
  );

  // Fall back to regular sections if no topics data
  if (!promptCategories || promptCategories.length === 0) {
    console.log('[TOPICSLIST] No categories to render');
    return (
      <div className="space-y-8">
        {renderEmptySection('In Progress')}
        {renderEmptySection('Queue')}
        {renderEmptySection('Suggested')}
      </div>
    );
  }

  console.log('[TOPICSLIST] Rendering sections for categories');
  
  return (
    <div>
      <Tabs defaultValue="all" className="space-y-8">
        <TabsList className="grid grid-cols-4 h-12">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-12">
          {queuedCategories.length > 0 && renderTopicSection('Queue', queuedCategories)}
          {inProgressCategories.length > 0 && renderTopicSection('In Progress', inProgressCategories)}
          {completedCategories.length > 0 && renderTopicSection('Completed', completedCategories)}
          {suggestedCategories.length > 0 && renderTopicSection('Suggested', suggestedCategories)}
          
          {inProgressCategories.length === 0 && queuedCategories.length === 0 && 
           completedCategories.length === 0 && suggestedCategories.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No topics found. Topics will appear here once you start recording.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="in-progress" className="space-y-12">
          {renderTopicSection('In Progress', inProgressCategories)}
        </TabsContent>

        <TabsContent value="completed" className="space-y-12">
          {renderTopicSection('Completed', completedCategories)}
        </TabsContent>

        <TabsContent value="queue" className="space-y-12">
          {renderTopicSection('Queue', queuedCategories)}
        </TabsContent>
      </Tabs>
    </div>
  );
}

