import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { promptsTable } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const { text, categoryId } = await request.json();
    const result = await db.insert(promptsTable).values({ text, categoryId }).returning();
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error creating prompt:', error);
    return NextResponse.json({ error: 'Error creating prompt' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const prompts = await db.select().from(promptsTable).orderBy(desc(promptsTable.createdAt));
    return NextResponse.json(prompts);
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json({ error: 'Error fetching prompts' }, { status: 500 });
  }
}