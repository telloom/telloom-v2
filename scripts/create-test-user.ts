import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userId = 'f0321e1a-c8d5-449e-b346-e9acbfc94f6e';
  const now = new Date();

  // Create or update profile
  const profile = await prisma.profile.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      updatedAt: now
    }
  });

  // Create ProfileRole records
  const roles = [Role.LISTENER, Role.SHARER];
  for (const role of roles) {
    await prisma.profileRole.upsert({
      where: {
        profileId_role: {
          profileId: userId,
          role: role
        }
      },
      update: {},
      create: {
        profileId: userId,
        role: role
      }
    });
  }

  // Create ProfileSharer record
  const profileSharer = await prisma.profileSharer.upsert({
    where: { profileId: userId },
    update: {},
    create: {
      profileId: userId,
      subscriptionStatus: true
    }
  });

  // Verify the created records
  const verifyProfile = await prisma.profile.findUnique({
    where: { id: userId },
    include: {
      roles: true,
      profileSharer: true
    }
  });

  console.log('Created records:', JSON.stringify(verifyProfile, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 