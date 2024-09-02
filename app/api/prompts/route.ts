import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { promptsPrimaryTable, InsertPrompt } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const { text, categoryId } = await request.json();
    console.log("Received POST request with data:", { text, categoryId });
    
    const newPrompt: InsertPrompt = { 
      text,
      categoryId: categoryId !== undefined ? Number(categoryId) : null,
    };
    
    console.log("Attempting to insert new prompt:", newPrompt);
    const result = await db.insert(promptsPrimaryTable).values(newPrompt).returning();
    console.log("Insert result:", result);
    
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error creating prompt:', error);
    return NextResponse.json({ error: 'Error creating prompt', details: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    console.log("Attempting to fetch prompts...");
    const prompts = await db.select().from(promptsPrimaryTable).orderBy(desc(promptsPrimaryTable.createdAt));
    console.log("Fetched prompts:", prompts);
    return NextResponse.json(prompts);
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json({ error: 'Error fetching prompts', details: error.message }, { status: 500 });
  }
}