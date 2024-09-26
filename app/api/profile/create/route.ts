import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const { user_id, email, first_name, last_name } = await request.json();

  try {
    const profile = await prisma.profile.upsert({
      where: { id: user_id },
      update: {
        email: email,
        firstName: first_name,
        lastName: last_name,
        fullName: `${first_name} ${last_name}`.trim(),
        updatedAt: new Date(),
      },
      create: {
        id: user_id,
        email: email,
        firstName: first_name,
        lastName: last_name,
        fullName: `${first_name} ${last_name}`.trim(),
      },
    });

    return NextResponse.json({ success: true, profile: profile });
  } catch (error) {
    console.error('Error creating/updating profile:', error);
    return NextResponse.json({ error: 'Failed to create/update profile' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}