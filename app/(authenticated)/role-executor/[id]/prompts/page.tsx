import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Suspense } from 'react';
import TopicsTableAll from '@/components/TopicsTableAll';
import TopicsList from '@/components/TopicsList';
import { LayoutGrid, List } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { PromptCategory } from '@/types/models';

interface Props {
  params: {
    id: string;
  };
}

interface ProfileData {
  id: string;
  Profile: {
    firstName: string | null;
    lastName: string | null;
  };
}

export default async function SharerExecutorPromptsPage({ params }: Props) {
  try {
    const supabase = createClient();
    const resolvedParams = await Promise.resolve(params);
    const sharerId = resolvedParams.id;

    // Get sharer details
    const { data: sharerData, error: sharerError } = await supabase
      .from('ProfileSharer')
      .select(`
        id,
        Profile (
          firstName,
          lastName
        )
      `)
      .eq('id', sharerId)
      .single();

    if (sharerError || !sharerData) {
      console.error('Error fetching sharer:', sharerError);
      notFound();
    }

    // Get prompt categories
    const { data: promptCategories, error: categoriesError } = await supabase
      .from('PromptCategory')
      .select('*')
      .order('sortOrder', { ascending: true });

    if (categoriesError) {
      console.error('Error fetching prompt categories:', categoriesError);
      return null;
    }

    // Construct sharer name
    const sharerName = `${sharerData.Profile.firstName || ''} ${sharerData.Profile.lastName || ''}`.trim();

    return (
      <div className="space-y-6">
        <BackButton href={`/role-executor/${sharerId}`} label="Back to Sharer" />
        
        <div>
          <h1 className="text-2xl font-bold mb-2">Video Prompts for {sharerName}</h1>
          <p className="text-muted-foreground">
            Manage video responses on behalf of {sharerName}.
          </p>
        </div>
        
        <Card>
          <Suspense fallback={<div>Loading topics...</div>}>
            <Tabs defaultValue="grid">
              <div className="flex justify-between items-center p-4 border-b">
                <h2 className="text-xl font-semibold">Topics</h2>
                <TabsList>
                  <TabsTrigger value="grid" className="flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4" /> Grid View
                  </TabsTrigger>
                  <TabsTrigger value="list" className="flex items-center gap-2">
                    <List className="h-4 w-4" /> List View
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="grid" className="p-4">
                <TopicsList promptCategories={promptCategories || []} />
              </TabsContent>
              
              <TabsContent value="list" className="p-0">
                <TopicsTableAll 
                  initialPromptCategories={promptCategories || []} 
                  currentRole="EXECUTOR"
                  sharerId={sharerId}
                />
              </TabsContent>
            </Tabs>
          </Suspense>
        </Card>
      </div>
    );
  } catch (error) {
    console.error('Error in SharerExecutorPromptsPage:', error);
    notFound();
  }
} 