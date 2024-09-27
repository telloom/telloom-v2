import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  console.log('Profile creation route called');
  
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  try {
    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Request body:', body);

    const { email, first_name, last_name } = body;

    if (!email || !first_name || !last_name) {
      console.error('Missing required fields:', { email, first_name, last_name });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('Attempting to insert profile:', { userId: user.id, email, first_name, last_name });

    // Use Prisma to create the profile
    const profile = await prisma.profile.create({
      data: {
        userId: user.id,
        email,
        firstName: first_name,
        lastName: last_name,
      },
    });

    console.log('Profile created successfully:', profile);
    return NextResponse.json(profile);
  } catch (error) {
    console.error('Profile creation error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json({ error: 'Failed to create profile', details: error }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}