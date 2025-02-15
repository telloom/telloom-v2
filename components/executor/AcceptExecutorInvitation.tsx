'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Props {
  invitationId: string;
  token: string;
}

export default function AcceptExecutorInvitation({ invitationId, token }: Props) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const router = useRouter();

  const handleAccept = async () => {
    try {
      setIsAccepting(true);
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId,
          token,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to accept invitation');
      }

      toast.success('Invitation accepted successfully');
      router.refresh();
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error('Failed to accept invitation');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    try {
      setIsDeclining(true);
      const response = await fetch('/api/invitations/decline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to decline invitation');
      }

      toast.success('Invitation declined');
      router.refresh();
    } catch (error) {
      console.error('Error declining invitation:', error);
      toast.error('Failed to decline invitation');
    } finally {
      setIsDeclining(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleAccept}
        disabled={isAccepting || isDeclining}
        className="bg-[#1B4332] hover:bg-[#8fbc55] text-white rounded-full min-w-[100px]"
        size="sm"
      >
        {isAccepting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="ml-2">Accepting...</span>
          </>
        ) : (
          <>
            <Check className="h-4 w-4" />
            <span className="ml-2">Accept</span>
          </>
        )}
      </Button>
      <Button
        onClick={handleDecline}
        disabled={isAccepting || isDeclining}
        variant="outline"
        className="border-[#1B4332] text-[#1B4332] hover:bg-red-50 hover:text-red-600 hover:border-red-600 rounded-full min-w-[100px]"
        size="sm"
      >
        {isDeclining ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="ml-2">Declining...</span>
          </>
        ) : (
          <>
            <X className="h-4 w-4" />
            <span className="ml-2">Decline</span>
          </>
        )}
      </Button>
    </div>
  );
} 