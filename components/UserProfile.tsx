// components/UserProfile.tsx
// This component displays and updates the user's profile information.

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import UserProfileForm from './UserProfileForm';
import { ProfileFormValues } from '@/schemas/profileSchema';

interface UserProfileProps {
  initialData: ProfileFormValues;
  updateProfile: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
}

export default function UserProfile({ initialData, updateProfile }: UserProfileProps) {
  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-semibold">Your Profile</CardTitle>
        <CardContent className="text-muted-foreground">
          Manage your personal information and preferences
        </CardContent>
      </CardHeader>
      <CardContent>
        <UserProfileForm initialData={initialData} updateProfile={updateProfile} />
      </CardContent>
    </Card>
  );
}