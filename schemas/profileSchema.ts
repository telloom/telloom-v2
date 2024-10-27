// schemas/profileSchema.ts
// This file contains the Zod schema and TypeScript types for the user profile.

import { z } from 'zod';

export const profileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string(),
  avatarUrl: z.string().url().nullable().optional(),
  addressStreet: z.string().nullable().optional(),
  addressUnit: z.string().nullable().optional(),
  addressCity: z.string().nullable().optional(),
  addressState: z.string().nullable().optional(),
  addressZipcode: z.string().nullable().optional(),
  executorFirstName: z.string().nullable().optional(),
  executorLastName: z.string().nullable().optional(),
  executorRelation: z.string().nullable().optional(),
  executorPhone: z.string().nullable().optional(),
  executorEmail: z.string().email().nullable().optional(),
  updatedAt: z.string().optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
