// app/(authenticated)/profile/page.tsx

import { redirect } from 'next/navigation';
import UserProfile from '@/components/UserProfile';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { profileSchema, ProfileFormValues } from '@/schemas/profileSchema';
import { createClient } from '@/utils/supabase/server';

export default async function ProfilePage() {
  const supabase = createClient();

  // Get the authenticated user
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const userId = user.id;

  const profile = await prisma.profile.findUnique({
    where: { id: userId },
  });

  if (!profile) {
    redirect('/setup-profile');
  }

  // Server Action
  async function updateProfile(formData: FormData) {
    'use server';

    const supabase = createClient();

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      redirect('/login');
    }

    const userId = user.id;

    // Handle avatar URL
    const avatarUrl = formData.get('avatarUrl') as string; // Changed to const

    // Extract and prepare form data
    const data = Object.fromEntries(formData.entries());
    data.id = userId;
    data.email = user.email ?? '';
    data.avatarUrl = avatarUrl;

    // Validate data using Zod
    const parsedData = profileSchema.safeParse({
      ...data,
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
      avatarUrl: data.avatarUrl || null,
    });

    if (!parsedData.success) {
      console.error('Validation errors:', parsedData.error);
      return { success: false, error: 'Validation errors' };
    }

    try {
      // Update the profile using Prisma ORM
      await prisma.profile.update({
        where: { id: userId },
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
          avatarUrl: parsedData.data.avatarUrl,
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

  // Ensure required fields are present and handle optional fields
  const sanitizedProfile: ProfileFormValues = {
    id: profile.id,
    email: profile.email ?? '',
    firstName: profile.firstName ?? '',
    lastName: profile.lastName ?? '',
    phone: profile.phone ?? '',
    avatarUrl: profile.avatarUrl ?? undefined,
    addressStreet: profile.addressStreet ?? undefined,
    addressUnit: profile.addressUnit ?? undefined,
    addressCity: profile.addressCity ?? undefined,
    addressState: profile.addressState ?? undefined,
    addressZipcode: profile.addressZipcode ?? undefined,
    executorFirstName: profile.executorFirstName ?? undefined,
    executorLastName: profile.executorLastName ?? undefined,
    executorRelation: profile.executorRelation ?? undefined,
    executorPhone: profile.executorPhone ?? undefined,
    executorEmail: profile.executorEmail ?? undefined,
    updatedAt: profile.updatedAt?.toISOString() ?? undefined,
  };

  return (
    <UserProfile initialData={sanitizedProfile} updateProfile={updateProfile} />
  );
}
