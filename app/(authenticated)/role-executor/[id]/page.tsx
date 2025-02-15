import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Bell, Users, Video } from 'lucide-react';

interface Props {
  params: {
    id: string;
  };
}

export default async function SharerExecutorPage({ params }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Verify executor relationship and get sharer details
  const { data: executorRelationship, error: relationshipError } = await supabase
    .from('ProfileExecutor')
    .select(`
      id,
      sharerId,
      sharer:ProfileSharer!sharerId (
        id,
        profile:Profile!profileId (
          id,
          firstName,
          lastName,
          email,
          avatarUrl
        )
      )
    `)
    .eq('executorId', user.id)
    .eq('sharerId', params.id)
    .single();

  if (relationshipError || !executorRelationship) {
    notFound();
  }

  const sharer = executorRelationship.sharer.profile;

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      <div className="mb-8">
        <Link 
          href="/role-executor"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Sharers
        </Link>
        <h1 className="text-2xl font-bold mt-2">
          Managing {sharer.firstName} {sharer.lastName}
        </h1>
        <p className="text-muted-foreground">{sharer.email}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href={`/role-executor/${params.id}/connections`}>
          <Card className="p-6 hover:shadow-md transition-shadow border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55]">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5" />
              <div>
                <h2 className="font-semibold">Manage Connections</h2>
                <p className="text-sm text-muted-foreground">
                  View and manage listeners and invitations
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href={`/role-executor/${params.id}/notifications`}>
          <Card className="p-6 hover:shadow-md transition-shadow border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55]">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5" />
              <div>
                <h2 className="font-semibold">Notifications</h2>
                <p className="text-sm text-muted-foreground">
                  View notifications for this sharer
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href={`/role-executor/${params.id}/topics`}>
          <Card className="p-6 hover:shadow-md transition-shadow border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55]">
            <div className="flex items-center gap-3">
              <Video className="h-5 w-5" />
              <div>
                <h2 className="font-semibold">Manage Content</h2>
                <p className="text-sm text-muted-foreground">
                  View and manage topics and responses
                </p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
} 