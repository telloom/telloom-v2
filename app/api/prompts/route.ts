import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { promptsPrimaryTable, InsertPromptPrimary } from '@/db/schema/prompts_primary';
import { desc, sql } from 'drizzle-orm';

const VALID_PROMPT_TYPES = [
  'Advice/Reflections/Perspectives',
  'Stories',
  'Personal or Family History',
  'Expertise in a Topic'
];

export async function POST(request: Request) {
  try {
    const { prompt, categoryId, promptType, contextEstablishingQuestion } = await request.json();
    
    // Ensure promptType is a valid value
    const sanitizedPromptType = VALID_PROMPT_TYPES.includes(promptType) ? promptType : VALID_PROMPT_TYPES[0];

    const result = await db.insert(promptsPrimaryTable).values({
      prompt,
      promptCategoryId: categoryId || null,
      promptType: sanitizedPromptType,
      contextEstablishingQuestion: contextEstablishingQuestion || false
    }).returning();

    console.log("Insert result:", result);

    return NextResponse.json(result[0]);
  } catch (error: unknown) {
    console.error('Error creating prompt:', error);
    return NextResponse.json({ error: 'Error creating prompt', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    console.log("Attempting to fetch prompts...");
    const prompts = await db.select().from(promptsPrimaryTable).orderBy(desc(promptsPrimaryTable.createdAt));
    console.log("Fetched prompts:", prompts);
    return NextResponse.json(prompts);
  } catch (error: unknown) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json({ error: 'Error fetching prompts', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}