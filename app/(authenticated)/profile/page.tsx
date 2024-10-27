// app/(authenticated)/profile/page.tsx
import { redirect } from 'next/navigation';
import UserProfile from '@/components/UserProfile';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { profileSchema, ProfileFormValues } from '@/schemas/profileSchema';

export default async function ProfilePage() {
  const session = await getSession();
  const userEmail = session?.user?.email;

  if (!userEmail) {
    redirect('/login');
  }

  const profile = await prisma.profile.findUnique({
    where: { email: userEmail },
  });

  if (!profile) {
    redirect('/setup-profile');
  }

  // Server Action
  async function updateProfile(formData: FormData) {
    'use server';

    // Extract form data
    const data = Object.fromEntries(formData.entries());

    // Validate data using Zod
    const parsedData = profileSchema.safeParse({
      ...data,
      // Convert empty strings to null for optional fields
      addressStreet: data.addressStreet || null,
      addressUnit: data.addressUnit || null,
      addressCity: data.addressCity || null,
      addressState: data.addressState || null,
      addressZipcode: data.addressZipcode || null,
      executorFirstName: data.executorFirstName || null,
      executorLastName: data.executorLastName || null,
      executorRelation: data.executorRelation || null,
      executorPhone: data.executorPhone || null,
      executorEmail: data.executorEmail || null,
    });

    if (!parsedData.success) {
      console.error('Validation errors:', parsedData.error);
      return { success: false, error: 'Validation errors' };
    }

    try {
      // Update the profile using Prisma ORM
      await prisma.profile.update({
        where: { id: parsedData.data.id },
        data: {
          firstName: parsedData.data.firstName,
          lastName: parsedData.data.lastName,
          phone: parsedData.data.phone,
          addressStreet: parsedData.data.addressStreet,
          addressUnit: parsedData.data.addressUnit,
          addressCity: parsedData.data.addressCity,
          addressState: parsedData.data.addressState,
          addressZipcode: parsedData.data.addressZipcode,
          executorFirstName: parsedData.data.executorFirstName,
          executorLastName: parsedData.data.executorLastName,
          executorRelation: parsedData.data.executorRelation,
          executorPhone: parsedData.data.executorPhone,
          executorEmail: parsedData.data.executorEmail,
          updatedAt: new Date().toISOString(),
        },
      });

      // Revalidate the current path
      revalidatePath('/profile');
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: 'Error updating profile' };
    }

    return { success: true };
  }

  return <UserProfile initialData={profile} updateProfile={updateProfile} />;
}