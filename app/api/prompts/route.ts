import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { promptsPrimaryTable, InsertPrompt } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const { text, categoryId } = await request.json();
    const newPrompt: InsertPrompt = { 
      id: 0, // or any default value, if 'id' is auto-generated, you can omit it
      text,
      createdAt: new Date(), // or any default value
      updatedAt: new Date(), // or any default value
      categoryId: categoryId !== undefined ? Number(categoryId) : null,
    };
    const result = await db.insert(promptsPrimaryTable).values(newPrompt).returning();
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error creating prompt:', error);
    return NextResponse.json({ error: 'Error creating prompt' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const prompts = await db.select().from(promptsPrimaryTable).orderBy(desc(promptsPrimaryTable.createdAt));
    return NextResponse.json(prompts);
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json({ error: 'Error fetching prompts' }, { status: 500 });
  }
}