// components/UserProfileForm.tsx
// This client component handles the user profile form submission and displays notifications.

'use client';

import React, { useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProfileFormValues } from '@/schemas/profileSchema';
import { formatPhoneNumber } from '@/utils/formatPhoneNumber';
import { createClient } from '@/utils/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface UserProfileFormProps {
  initialData: ProfileFormValues;
  updateProfile: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
}

export default function UserProfileForm({ initialData, updateProfile }: UserProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [notification, setNotification] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatarUrl || '');
  const [uploading, setUploading] = useState(false);

  const supabase = createClient();

  const [phoneDisplay, setPhoneDisplay] = useState(formatPhoneNumber(initialData.phone));
  const [executorPhoneDisplay, setExecutorPhoneDisplay] = useState(
    formatPhoneNumber(initialData.executorPhone || '')
  );

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      // Check if the user is authenticated
      const {
        data: { session },
        error: authError,
      } = await supabase.auth.getSession();

      if (authError || !session) {
        setNotification('You must be logged in to upload an avatar.');
        setUploading(false);
        return;
      }

      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

      // Upload the image to Supabase Storage
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading avatar:', uploadError);
        setNotification('An error occurred while uploading your avatar.');
        setUploading(false);
        return;
      }

      // Get the public URL of the uploaded image
      const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filePath);

      if (publicData) {
        setAvatarUrl(publicData.publicUrl);
      } else {
        setNotification('Could not retrieve the avatar URL.');
      }
    } catch (error) {
      console.error('Error during avatar upload:', error);
      setNotification('An unexpected error occurred.');
    } finally {
      setUploading(false);
    }
  };

  // Re-fetch the profile after updating to get the latest avatarUrl
  const refreshProfile = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profileData, error } = await supabase
        .from('Profile')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!error && profileData) {
        // Update local state or store with the new profile data
        setAvatarUrl(profileData.avatarUrl || '');
      }
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    // Always include avatarUrl in the formData
    formData.append('avatarUrl', avatarUrl || '');

    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result?.success) {
        await refreshProfile();
        setNotification('Profile saved successfully!');
      } else {
        setNotification('An error occurred while saving your profile.');
      }
    });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    setPhoneDisplay(formatPhoneNumber(rawValue));
    const phoneInput = e.target.form?.elements.namedItem('phone');
    if (phoneInput && phoneInput instanceof HTMLInputElement) {
      phoneInput.value = rawValue;
    }
  };

  const handleExecutorPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    setExecutorPhoneDisplay(formatPhoneNumber(rawValue));
    const executorPhoneInput = e.target.form?.elements.namedItem('executorPhone');
    if (executorPhoneInput instanceof HTMLInputElement) {
      executorPhoneInput.value = rawValue;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Avatar Upload */}
      <div>
        <label>Profile Photo</label>
        <div className="flex items-center space-x-4">
          <Avatar>
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt="Avatar" />
            ) : (
              <AvatarFallback>
                {initialData.firstName?.charAt(0)}
                {initialData.lastName?.charAt(0)}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <Input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              disabled={uploading}
            />
            {uploading && <p>Uploading...</p>}
          </div>
        </div>
      </div>

      {/* Hidden input for the ID */}
      <input type="hidden" name="id" value={initialData.id} />

      {/* First Name */}
      <div>
        <label htmlFor="firstName">First Name *</label>
        <Input
          id="firstName"
          name="firstName"
          defaultValue={initialData.firstName}
          required
        />
      </div>
      {/* Last Name */}
      <div>
        <label htmlFor="lastName">Last Name *</label>
        <Input
          id="lastName"
          name="lastName"
          defaultValue={initialData.lastName}
          required
        />
      </div>
      {/* Email (read-only) */}
      <div>
        <label>Email</label>
        <p>{initialData.email}</p>
      </div>
      {/* Phone */}
      <div>
        <label htmlFor="phone">Phone *</label>
        <Input
          id="phone"
          name="phone"
          value={phoneDisplay}
          onChange={handlePhoneChange}
          required
        />
      </div>
      {/* Address */}
      <div className="space-y-2">
        <label>Address</label>
        <div className="grid grid-cols-2 gap-4">
          {/* Street */}
          <div>
            <Input
              id="addressStreet"
              name="addressStreet"
              defaultValue={initialData.addressStreet || ''}
              placeholder="Street"
            />
          </div>
          {/* Unit */}
          <div>
            <Input
              id="addressUnit"
              name="addressUnit"
              defaultValue={initialData.addressUnit || ''}
              placeholder="Unit"
            />
          </div>
          {/* City */}
          <div>
            <Input
              id="addressCity"
              name="addressCity"
              defaultValue={initialData.addressCity || ''}
              placeholder="City"
            />
          </div>
          {/* State */}
          <div>
            <Input
              id="addressState"
              name="addressState"
              defaultValue={initialData.addressState || ''}
              placeholder="State"
            />
          </div>
          {/* Zipcode */}
          <div>
            <Input
              id="addressZipcode"
              name="addressZipcode"
              defaultValue={initialData.addressZipcode || ''}
              placeholder="Zipcode"
            />
          </div>
        </div>
      </div>
      {/* Executor Information */}
      <div className="space-y-2">
        <label>Executor Information</label>
        <div className="grid grid-cols-2 gap-4">
          {/* Executor First Name */}
          <div>
            <Input
              id="executorFirstName"
              name="executorFirstName"
              defaultValue={initialData.executorFirstName || ''}
              placeholder="First Name"
            />
          </div>
          {/* Executor Last Name */}
          <div>
            <Input
              id="executorLastName"
              name="executorLastName"
              defaultValue={initialData.executorLastName || ''}
              placeholder="Last Name"
            />
          </div>
          {/* Executor Relation */}
          <div>
            <Input
              id="executorRelation"
              name="executorRelation"
              defaultValue={initialData.executorRelation || ''}
              placeholder="Relation"
            />
          </div>
          {/* Executor Phone */}
          <div>
            <Input
              id="executorPhone"
              name="executorPhone"
              value={executorPhoneDisplay}
              onChange={handleExecutorPhoneChange}
              placeholder="Phone"
            />
          </div>
          {/* Executor Email */}
          <div>
            <Input
              id="executorEmail"
              name="executorEmail"
              defaultValue={initialData.executorEmail || ''}
              placeholder="Email"
              type="email"
            />
          </div>
        </div>
      </div>
      {/* Save Button */}
      <div className="flex items-center">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Changes'}
        </Button>
        {notification && (
          <span className="ml-4 text-green-500">{notification}</span>
        )}
      </div>
    </form>
  );
}
