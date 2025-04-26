'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X, User, CalendarClock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface InvitationProps {
  invitation: {
    id: string;
    token: string;
    createdAt: string;
    sharerId: string;
    inviteeEmail: string;
    role: string;
    status: string;
    sharer: {
      id: string;
      profile: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        avatarUrl: string | null;
      }
    }
  }
}

export default function ExecutorInvitationCard({ invitation }: InvitationProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  const profile = invitation.sharer.profile;
  const displayName = `${profile.firstName} ${profile.lastName}`;
  const initials = `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`;
  const formattedDate = formatDistanceToNow(new Date(invitation.createdAt), { addSuffix: true });

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('accept_invitation', { 
        invitation_id: invitation.id, 
        invitation_token: invitation.token 
      });
      
      if (error) {
        console.error('Failed to accept invitation:', error);
        toast.error('Failed to accept invitation');
      } else {
        toast.success('Invitation accepted successfully');
        router.refresh();
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('decline_invitation', { 
        invitation_id: invitation.id, 
        invitation_token: invitation.token 
      });
      
      if (error) {
        console.error('Failed to decline invitation:', error);
        toast.error('Failed to decline invitation');
      } else {
        toast.success('Invitation declined');
        router.refresh();
      }
    } catch (error) {
      console.error('Error declining invitation:', error);
      toast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55] transition-all duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={profile.avatarUrl || ''} alt={displayName} />
            <AvatarFallback className="bg-[#1B4332] text-white">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-lg">{displayName}</CardTitle>
            <CardDescription className="text-sm">{profile.email}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 space-y-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <User className="mr-2 h-4 w-4" />
            <span>Invited you to be their executor</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <CalendarClock className="mr-2 h-4 w-4" />
            <span>Invited {formattedDate}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="default" 
            className="flex-1 rounded-full"
            onClick={handleAccept}
            disabled={isLoading}
          >
            <Check className="mr-2 h-4 w-4" />
            Accept
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 rounded-full"
            onClick={handleDecline}
            disabled={isLoading}
          >
            <X className="mr-2 h-4 w-4" />
            Decline
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 