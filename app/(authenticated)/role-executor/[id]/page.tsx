import { createClient } from '@/utils/supabase/server';
import { Card } from '@/components/ui/card';
import { Users, Video } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BackButton from '@/components/BackButton';
import UserAvatar from '@/components/UserAvatar';
import { getSignedAvatarUrl } from '@/utils/avatar';

interface Props {
  params: {
    id: string;
  };
}

interface Profile {
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

interface SharerData {
  id: string;
  profile: Profile;
}

export default async function RoleExecutorPage({ params }: Props) {
  const resolvedParams = await Promise.resolve(params);
  const sharerId = resolvedParams.id;
  
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    notFound();
  }

  // Get sharer details
  const { data: sharer, error: sharerError } = await supabase
    .from('ProfileSharer')
    .select(`
      id,
      profile:Profile!inner (
        firstName,
        lastName,
        avatarUrl
      )
    `)
    .eq('id', sharerId)
    .single() as { data: SharerData | null; error: any };

  if (sharerError || !sharer) {
    notFound();
  }

  // Get signed avatar URL if available
  let avatarUrl = null;
  if (sharer.profile.avatarUrl) {
    avatarUrl = await getSignedAvatarUrl(sharer.profile.avatarUrl);
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 py-6">
      <div className="mb-8">
        <BackButton href="/role-executor" label="Back to Sharers" />
        <div className="flex items-center gap-4 mt-4">
          <UserAvatar 
            avatarImageUrl={avatarUrl}
            firstName={sharer.profile.firstName || ''}
            lastName={sharer.profile.lastName || ''}
            size="h-12 w-12"
          />
          <h1 className="text-2xl font-semibold">
            {sharer.profile.firstName} {sharer.profile.lastName}&apos;s Executor Dashboard
          </h1>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href={`/role-executor/${sharerId}/connections`}>
          <Card className="p-6 hover:shadow-lg transition-shadow border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55]">
            <div className="flex flex-col items-center text-center space-y-4">
              <Users className="h-8 w-8 text-[#1B4332]" />
              <div>
                <h2 className="text-lg font-semibold">Manage Connections</h2>
                <p className="text-sm text-gray-600">Manage listeners and invitations on behalf of {sharer.profile.firstName}</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href={`/role-executor/${sharerId}/topics`}>
          <Card className="p-6 hover:shadow-lg transition-shadow border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55]">
            <div className="flex flex-col items-center text-center space-y-4">
              <Video className="h-8 w-8 text-[#1B4332]" />
              <div>
                <h2 className="text-lg font-semibold">Manage Content</h2>
                <p className="text-sm text-gray-600">Manage and create video content on behalf of {sharer.profile.firstName}</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
} 