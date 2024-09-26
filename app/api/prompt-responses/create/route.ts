import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  // Create Supabase client linked to the request
  const supabase = createRouteHandlerClient({ cookies });

  // Get the session (user authentication info)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Retrieve the authenticated user's ID
  const userId = session?.user.id;

  // If no user is authenticated, return an error
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse the request body
  const { uploadId, promptId } = await request.json();

  try {
    // Insert video information into the database
    const video = await prisma.video.create({
      data: {
        userId,
        muxUploadId: uploadId,
        status: 'WAITING', // Assuming 'WAITING' is a valid enum value for VideoStatus
      },
    });

    // Create the prompt response tied to the user, prompt, and video
    const promptResponse = await prisma.promptResponse.create({
      data: {
        userId,
        promptId,
        videoId: video.id,
      },
    });

    // Return success response
    return NextResponse.json({
      success: true,
      promptResponseId: promptResponse.id,
    });
  } catch (error) {
    console.error('Failed to create prompt response:', error);
    return NextResponse.json(
      { error: 'Failed to create prompt response' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}