'use client';

import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCircle, Clock, LayoutGrid, List } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AcceptExecutorInvitation from '@/components/executor/AcceptExecutorInvitation';

interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
}

interface ProfileSharer {
  id: string;
  profile: Profile;
}

interface ExecutorRelationship {
  id: string;
  sharerId: string;
  createdAt: string;
  sharer: ProfileSharer;
}

interface Invitation {
  id: string;
  token: string;
  createdAt: string;
  sharerId: string;
  sharer: ProfileSharer;
}

interface ExecutorViewProps {
  executorRelationships: ExecutorRelationship[];
  pendingInvitations: Invitation[];
}

export default function ExecutorView({ executorRelationships, pendingInvitations }: ExecutorViewProps) {
  return (
    <div className="space-y-8">
      {pendingInvitations && pendingInvitations.length > 0 && (
        <Card className="border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55]">
          <div className="p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
              <Clock className="h-5 w-5" />
              Pending Invitations
            </h2>
            <div className="space-y-4">
              {pendingInvitations.map((invitation) => (
                <div 
                  key={invitation.id}
                  className="p-6 rounded-lg border hover:border-[#1B4332] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-10 w-10">
                        {invitation.sharer.profile.avatarUrl ? (
                          <AvatarImage
                            src={invitation.sharer.profile.avatarUrl}
                            alt={`${invitation.sharer.profile.firstName}'s avatar`}
                          />
                        ) : (
                          <AvatarFallback>
                            <UserCircle className="h-5 w-5" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <h3 className="font-medium">
                          {invitation.sharer.profile.firstName} {invitation.sharer.profile.lastName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {invitation.sharer.profile.email}
                        </p>
                      </div>
                    </div>
                    <AcceptExecutorInvitation
                      invitationId={invitation.id}
                      token={invitation.token}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <div>
        <h1 className="text-2xl font-bold mb-8">Your Sharers</h1>
        
        {executorRelationships && executorRelationships.length > 0 ? (
          <Tabs defaultValue="grid">
            <div className="flex justify-end mb-6">
              <TabsList className="grid w-[200px] grid-cols-2">
                <TabsTrigger value="grid" className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Grid
                </TabsTrigger>
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  List
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="grid">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {executorRelationships.map((relationship) => (
                  <Link key={relationship.id} href={`/role-executor/${relationship.sharerId}`}>
                    <Card className="overflow-hidden hover:shadow-md transition-all border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55] hover:shadow-[8px_8px_0_0_#8fbc55]">
                      <div className="p-8 flex flex-col items-center text-center">
                        <Avatar className="h-24 w-24 mb-6">
                          {relationship.sharer.profile.avatarUrl ? (
                            <AvatarImage
                              src={relationship.sharer.profile.avatarUrl}
                              alt={`${relationship.sharer.profile.firstName}'s avatar`}
                            />
                          ) : (
                            <AvatarFallback className="bg-[#1B4332] text-white">
                              <UserCircle className="h-12 w-12" />
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <h2 className="text-xl font-semibold mb-2">
                          {relationship.sharer.profile.firstName} {relationship.sharer.profile.lastName}
                        </h2>
                        <p className="text-sm text-muted-foreground mb-4">
                          {relationship.sharer.profile.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Executor since {new Date(relationship.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="list">
              <Card className="border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55]">
                <div className="divide-y">
                  {executorRelationships.map((relationship) => (
                    <Link key={relationship.id} href={`/role-executor/${relationship.sharerId}`}>
                      <div className="p-6 hover:bg-gray-50">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            {relationship.sharer.profile.avatarUrl ? (
                              <AvatarImage
                                src={relationship.sharer.profile.avatarUrl}
                                alt={`${relationship.sharer.profile.firstName}'s avatar`}
                              />
                            ) : (
                              <AvatarFallback>
                                <UserCircle className="h-8 w-8" />
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1">
                            <h2 className="font-semibold">
                              {relationship.sharer.profile.firstName} {relationship.sharer.profile.lastName}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                              {relationship.sharer.profile.email}
                            </p>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Executor since {new Date(relationship.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="p-8 text-center border-2 border-[#1B4332] shadow-[6px_6px_0_0_#8fbc55]">
            <p className="text-muted-foreground">
              You are not currently managing any sharers.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
} 