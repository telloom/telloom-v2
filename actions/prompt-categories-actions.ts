"use server";

import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { promptsPrimaryTable, InsertPromptPrimary } from '@/db/schema/prompts_primary';
import { desc } from 'drizzle-orm';
import { createPromptCategory, deletePromptCategory, getAllPromptCategories, getPromptCategoryById, updatePromptCategory } from "@/db/queries/prompt_categories-queries";
import { ActionState } from "@/types";
import { InsertPromptCategory } from "@/db/schema/prompt_categories";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  try {
    const { text, categoryId } = await request.json();
    
    const newPrompt: InsertPromptPrimary = {
      prompt: text,
      categoryId: categoryId !== undefined ? Number(categoryId) : null,
      promptType: 'default',
      contextEstablishingQuestion: false,
    };
    
    const result = await db.insert(promptsPrimaryTable).values(newPrompt).returning();
    
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

export async function createPromptCategoryAction(data: InsertPromptCategory): Promise<ActionState> {
  try {
    const newPromptCategory = await createPromptCategory(data);
    revalidatePath("/prompt-categories");
    return { status: "success", message: "Prompt category created successfully", data: newPromptCategory };
  } catch (error) {
    return { status: "error", message: "Failed to create prompt category" };
  }
}