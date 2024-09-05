import React from 'react';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import MuxUploaderComponent from '@/components/MuxUploader';
import { db } from '@/db/db';
import { promptsPrimaryTable } from '@/db/schema/prompts_primary';
import { eq } from 'drizzle-orm';

export default async function PromptResponsePage({ params }: { params: { id: string } }) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return <div>Please log in to respond to prompts.</div>;
  }

  const [prompt] = await db.select().from(promptsPrimaryTable).where(eq(promptsPrimaryTable.id, params.id));

  if (!prompt) {
    return <div>Prompt not found.</div>;
  }

  return (
    <div>
      <h1>{prompt.prompt}</h1>
      <MuxUploaderComponent promptId={params.id} userId={session.user.id} />
    </div>
  );
}