// schemas/profileSchema.ts
// This file contains the Zod schema and TypeScript types for the user profile.

import * as z from 'zod';

export const profileSchema = z.object({
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

export type ProfileFormValues = z.infer<typeof profileSchema>;