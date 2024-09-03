"use server";

import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { promptsPrimaryTable, InsertPromptPrimary } from '@/db/schema/prompts_primary';
import { desc } from 'drizzle-orm';

// Remove this local declaration as we're importing it now
// export type InsertPromptPrimary = {
//   prompt: string;
//   categoryId?: number | null;
//   createdAt?: Date | null;
//   updatedAt?: Date | null;
// };

export async function POST(request: Request) {
  try {
    const { text, categoryId } = await request.json();
    console.log("Received POST request with data:", { text, categoryId });
    
    const newPrompt: InsertPromptPrimary = {
      prompt: text,
      categoryId: categoryId !== undefined ? Number(categoryId) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    console.log("Attempting to insert new prompt:", newPrompt);
    const result = await db.insert(promptsPrimaryTable).values(newPrompt).returning();
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