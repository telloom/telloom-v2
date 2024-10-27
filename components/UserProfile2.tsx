// components/user-profile.tsx
// This component displays and updates the user's profile information.

import * as z from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/prisma';

const profileSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  addressStreet: z.string().optional().nullable(),
  addressUnit: z.string().optional().nullable(),
  addressCity: z.string().optional().nullable(),
  addressState: z.string().optional().nullable(),
  addressZipcode: z.string().optional().nullable(),
  executorFirstName: z.string().optional().nullable(),
  executorLastName: z.string().optional().nullable(),
  executorRelation: z.string().optional().nullable(),
  executorPhone: z.string().optional().nullable(),
  executorEmail: z.string().optional().nullable(),
  updatedAt: z.string().optional().nullable(),
});

interface UserProfileProps {
  initialData: z.infer<typeof profileSchema>;
}

export default function UserProfile({ initialData }: UserProfileProps) {
  // Server Action for handling form submission
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
      // Handle validation errors
      console.error('Validation errors:', parsedData.error);
      // Optionally, you can set a state to display errors to the user
      return;
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

      // Revalidate the current path to reflect the updated data
      revalidatePath('/profile');
    } catch (error) {
      console.error('Error updating profile:', error);
      // Handle the error appropriately
      // Optionally, you can set a state to display errors to the user
      return;
    }

    // Perform the redirect outside of the try...catch block
    redirect('/profile?success=true');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={updateProfile} className="space-y-8">
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
          <Button type="submit">Save Changes</Button>
        </form>
      </CardContent>
    </Card>
  );
}