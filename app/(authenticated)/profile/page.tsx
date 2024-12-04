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

    // Handle avatar file upload if present
    const avatarFile = formData.get('avatar') as File | null;
    let avatarUrl = profile?.avatarUrl ?? null;

    if (avatarFile && avatarFile.size > 0) {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Remove old avatar if it exists
      if (avatarUrl) {
        await supabase.storage.from('avatars').remove([avatarUrl]);
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, {
          upsert: true, // Ensure the file is overwritten if it already exists
        });

      if (uploadError) {
        console.error('Error uploading avatar:', uploadError);
        return { success: false, error: 'Error uploading avatar' };
      }

      avatarUrl = filePath;
    }

    // Extract and prepare form data
    const data = Object.fromEntries(formData.entries());
    data.id = userId;
    data.email = user.email || '';

    // Assign the updated avatarUrl to data
    if (avatarUrl) {
      data.avatarUrl = avatarUrl;
    } else {
      delete data.avatarUrl;
    }

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
          avatarUrl: parsedData.data.avatarUrl, // Ensure avatarUrl is updated
          updatedAt: new Date().toISOString(),
        },
      });

      // Revalidate the current path
      revalidatePath('/profile');

      return { success: true, avatarUrl: parsedData.data.avatarUrl };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: 'Error updating profile' };
    }
  }

  // Ensure required fields are present and handle optional fields
  const sanitizedProfile: ProfileFormValues = {
    id: profile.id,
    email: profile.email ?? '',
    firstName: profile.firstName ?? '',
    lastName: profile.lastName ?? '',
    phone: profile.phone ?? '',
    avatarUrl: profile.avatarUrl ?? null,
    addressStreet: profile.addressStreet ?? null,
    addressUnit: profile.addressUnit ?? null,
    addressCity: profile.addressCity ?? null,
    addressState: profile.addressState ?? null,
    addressZipcode: profile.addressZipcode ?? null,
    executorFirstName: profile.executorFirstName ?? null,
    executorLastName: profile.executorLastName ?? null,
    executorRelation: profile.executorRelation ?? null,
    executorPhone: profile.executorPhone ?? null,
    executorEmail: profile.executorEmail ?? null,
    updatedAt: profile.updatedAt?.toISOString() ?? undefined,
  };

  return (
    <main className="mx-auto max-w-[600px] px-4 pt-12 pb-8">
      <UserProfile initialData={sanitizedProfile} updateProfile={updateProfile} />
    </main>
  );
}