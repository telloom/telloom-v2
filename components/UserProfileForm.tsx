// components/UserProfileForm.tsx
// This client component handles the user profile form submission and displays notifications.

'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProfileFormValues } from '@/schemas/profileSchema';
import { formatPhoneNumber } from '@/utils/formatPhoneNumber';
import { createClient } from '@/utils/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';

interface UserProfileFormProps {
  initialData: ProfileFormValues;
  updateProfile: (formData: FormData) => Promise<{ success: boolean; error?: string; avatarUrl?: string }>;
}

export default function UserProfileForm({ initialData, updateProfile }: UserProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [notification, setNotification] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatarUrl || null);
  const [avatarImageUrl, setAvatarImageUrl] = useState<string | null>(null);

  const supabase = createClient();

  const [phoneDisplay, setPhoneDisplay] = useState(formatPhoneNumber(initialData.phone));
  const [executorPhoneDisplay, setExecutorPhoneDisplay] = useState(
    formatPhoneNumber(initialData.executorPhone || '')
  );

  useEffect(() => {
    if (avatarUrl) {
      const fetchAvatar = async (path: string) => {
        try {
          const { data, error } = await supabase.storage
            .from('avatars')
            .createSignedUrl(path, 60); // URL valid for 60 seconds
          if (error) {
            throw error;
          }
          setAvatarImageUrl(data.signedUrl);
        } catch (error) {
          console.error('Error creating signed URL for avatar:', error);
        }
      };
      fetchAvatar(avatarUrl);
    } else {
      setAvatarImageUrl(null);
    }
  }, [avatarUrl, supabase]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result?.success) {
        setAvatarUrl(result.avatarUrl || null); // Update avatarUrl state
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
    if (executorPhoneInput && executorPhoneInput instanceof HTMLInputElement) {
      executorPhoneInput.value = rawValue;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Avatar Upload */}
      <div className="flex flex-col space-y-1.5">
        <Label>Profile Photo</Label>
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            {avatarImageUrl ? (
              <AvatarImage src={avatarImageUrl} alt="Avatar" />
            ) : (
              <AvatarFallback>
                {initialData.firstName?.charAt(0)}
                {initialData.lastName?.charAt(0)}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1">
            <Input
              type="file"
              accept="image/*"
              name="avatar"
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Hidden input for the ID */}
      <input type="hidden" name="id" value={initialData.id} />

      {/* Personal Information Section */}
      <div className="space-y-4">
        <h3 className="font-medium">Personal Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              name="firstName"
              defaultValue={initialData.firstName}
              required
            />
          </div>
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              name="lastName"
              defaultValue={initialData.lastName}
              required
            />
          </div>
        </div>
        <div className="flex flex-col space-y-1.5">
          <Label>Email</Label>
          <p className="text-sm text-muted-foreground">{initialData.email}</p>
        </div>
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="phone">Phone *</Label>
          <Input
            id="phone"
            name="phone"
            value={phoneDisplay}
            onChange={handlePhoneChange}
            required
          />
        </div>
      </div>

      {/* Address Section */}
      <div className="space-y-4">
        <h3 className="font-medium">Address</h3>
        <div className="grid gap-4">
          <Input
            id="addressStreet"
            name="addressStreet"
            defaultValue={initialData.addressStreet || ''}
            placeholder="Street"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="addressUnit"
              name="addressUnit"
              defaultValue={initialData.addressUnit || ''}
              placeholder="Unit"
            />
            <Input
              id="addressCity"
              name="addressCity"
              defaultValue={initialData.addressCity || ''}
              placeholder="City"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="addressState"
              name="addressState"
              defaultValue={initialData.addressState || ''}
              placeholder="State"
            />
            <Input
              id="addressZipcode"
              name="addressZipcode"
              defaultValue={initialData.addressZipcode || ''}
              placeholder="Zipcode"
            />
          </div>
        </div>
      </div>

      {/* Executor Section */}
      <div className="space-y-4">
        <h3 className="font-medium">Executor Information</h3>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="executorFirstName"
              name="executorFirstName"
              defaultValue={initialData.executorFirstName || ''}
              placeholder="First Name"
            />
            <Input
              id="executorLastName"
              name="executorLastName"
              defaultValue={initialData.executorLastName || ''}
              placeholder="Last Name"
            />
          </div>
          <Input
            id="executorRelation"
            name="executorRelation"
            defaultValue={initialData.executorRelation || ''}
            placeholder="Relation"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="executorPhone"
              name="executorPhone"
              value={executorPhoneDisplay}
              onChange={handleExecutorPhoneChange}
              placeholder="Phone"
            />
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

      {/* Save Button and Notification */}
      <div className="flex flex-col items-center space-y-4 pt-4">
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Changes'}
        </Button>
        {notification && (
          <p className="text-sm text-green-500">{notification}</p>
        )}
      </div>
    </form>
  );
}