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

    // Fetch sharer details
    const { data: sharer, error } = await supabase
      .from('ProfileSharer')
      .select(`
        id,
        Profile!inner (
          firstName,
          lastName
        )
      `)
      .eq('id', sharerId)
      .single() as { data: ProfileData | null; error: any };

    if (error || !sharer?.Profile) {
      console.error('Error fetching sharer details:', error);
      notFound();
    }

    const sharerName = `${sharer.Profile.firstName || ''} ${sharer.Profile.lastName || ''}`.trim();

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <BackButton href={`/role-executor/${sharerId}`} label="Back to Sharer" />
          <h1 className="text-2xl font-bold mt-4">
            Video Prompts for {sharerName}
          </h1>
          <p className="text-muted-foreground mt-1">
            Record and manage video responses on behalf of {sharerName}
          </p>
        </div>

        <Card className="border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55]">
          <Suspense fallback={<div>Loading...</div>}>
            <Tabs defaultValue="grid" className="p-6">
              <div className="flex justify-end mb-6">
                <TabsList className="grid w-[200px] grid-cols-2">
                  <TabsTrigger value="grid" className="flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    Grid
                  </TabsTrigger>
                  <TabsTrigger value="list" className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    List
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="grid">
                <TopicsList sharerId={sharerId} role="EXECUTOR" />
              </TabsContent>

              <TabsContent value="list">
                <TopicsTableAll sharerId={sharerId} role="EXECUTOR" />
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