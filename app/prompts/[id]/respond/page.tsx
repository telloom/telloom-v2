// app/prompts/[id]/respond/page.tsx
import React from 'react';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import dynamic from 'next/dynamic';
import { db } from '@/db/db';
import { promptsPrimaryTable } from '@/db/schema/prompts_primary';
import { eq } from 'drizzle-orm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const Header = dynamic(() => import('@/components/Header'), { ssr: false });
const MuxUploaderComponent = dynamic(() => import('@/components/MuxUploader'), { ssr: false });

export default async function PromptResponsePage({ params }: { params: { id: string } }) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return <div>Please log in to respond to prompts.</div>;
  }

  const [prompt] = await db
    .select()
    .from(promptsPrimaryTable)
    .where(eq(promptsPrimaryTable.id, params.id));

  if (!prompt) {
    return <div>Prompt not found.</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="flex-grow container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>{prompt.prompt}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Any additional content can go here */}
          </CardContent>
        </Card>

        {/* Mux Uploader */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Your Response</CardTitle>
            </CardHeader>
            <CardContent>
              <MuxUploaderComponent promptId={params.id} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}