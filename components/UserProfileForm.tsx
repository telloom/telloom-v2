// components/UserProfileForm.tsx
// This client component handles the user profile form submission and displays notifications.

'use client';

import React, { useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProfileFormValues } from '@/schemas/profileSchema';

interface UserProfileFormProps {
  initialData: ProfileFormValues;
  updateProfile: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
}

export default function UserProfileForm({ initialData, updateProfile }: UserProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [notification, setNotification] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result?.success) {
        setNotification('Profile saved successfully!');
      } else {
        setNotification('An error occurred while saving your profile.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
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
        <label htmlFor="email">Email</label>
        <Input
          id="email"
          name="email"
          defaultValue={initialData.email}
          readOnly
        />
      </div>
      {/* Phone */}
      <div>
        <label htmlFor="phone">Phone *</label>
        <Input
          id="phone"
          name="phone"
          defaultValue={initialData.phone}
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
              defaultValue={initialData.executorPhone || ''}
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