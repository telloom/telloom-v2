import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    const result = await prisma.prompt.create({
      data: {
        promptText: prompt,
        promptCategoryId: categoryId || undefined,
        promptType: sanitizedPromptType,
        isContextEstablishing: contextEstablishingQuestion || false
      }
    });

    console.log("Insert result:", result);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error creating prompt:', error);
    return NextResponse.json({ error: 'Error creating prompt', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    console.log("Attempting to fetch prompts...");
    const prompts = await prisma.prompt.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    console.log("Fetched prompts:", prompts);
    return NextResponse.json(prompts);
  } catch (error: unknown) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json({ error: 'Error fetching prompts', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}