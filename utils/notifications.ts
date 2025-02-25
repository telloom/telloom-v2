import { createAdminClient } from '@/utils/supabase/admin';

export type NotificationType = 
  | 'FOLLOW_REQUEST'
  | 'INVITATION'
  | 'CONNECTION_CHANGE'
  | 'TOPIC_RESPONSE'
  | 'TOPIC_COMMENT';

interface NotificationData {
  userId: string;
  type: NotificationType;
  message: string;
  data?: any;
}

export async function createNotification({
  userId,
  type,
  message,
  data
}: NotificationData) {
  console.log('[Notifications] Creating notification:', { userId, type, message, data });
  
  const supabase = createAdminClient();
  console.log('[Notifications] Admin client created');

  try {
    const { data: notification, error } = await supabase
      .from('Notification')
      .insert({
        userId,
        type,
        message,
        data,
        isRead: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('[Notifications] Error creating notification:', error);
      throw error;
    }

    console.log('[Notifications] Notification created successfully:', notification);
    return notification;
  } catch (error) {
    console.error('[Notifications] Error in createNotification:', error);
    throw error;
  }
}

export async function createFollowRequestNotification(
  sharerId: string,
  listenerData: {
    firstName: string
    lastName: string
    email: string
  }
) {
  console.log('[Notifications] Creating follow request notification for:', { sharerId, listenerData });
  
  const message = `${listenerData.firstName} ${listenerData.lastName} (${listenerData.email}) has requested to follow you.`
  
  try {
    const notification = await createNotification({
      userId: sharerId,
      type: 'FOLLOW_REQUEST',
      message,
      data: { 
        listener: listenerData,
        role: 'SHARER'
      }
    })
    
    console.log('[Notifications] Follow request notification created successfully:', notification);
    return notification;
  } catch (error) {
    console.error('[Notifications] Error in createFollowRequestNotification:', error);
    throw error;
  }
}

export async function createInvitationNotification(
  inviterId: string,
  inviteeData: { email: string; role: string }
) {
  const message = `You've invited ${inviteeData.email} to be a ${inviteeData.role.toLowerCase()}.`;
  
  await createNotification({
    userId: inviterId,
    type: 'INVITATION',
    message,
    data: { 
      ...inviteeData,
      role: 'SHARER'
    }
  });
}

export async function createConnectionChangeNotification(
  userId: string,
  changeType: 'ACCEPTED' | 'DECLINED' | 'REVOKED',
  connectionData: { firstName: string; lastName: string; email: string; role?: string }
) {
  const message = (() => {
    switch (changeType) {
      case 'ACCEPTED':
        return `${connectionData.firstName} ${connectionData.lastName} accepted your invitation.`;
      case 'DECLINED':
        return `${connectionData.firstName} ${connectionData.lastName} declined your invitation.`;
      case 'REVOKED':
        return `Your access to ${connectionData.firstName} ${connectionData.lastName}'s content has been revoked.`;
    }
  })();

  await createNotification({
    userId,
    type: 'CONNECTION_CHANGE',
    message,
    data: { 
      ...connectionData, 
      changeType,
      role: connectionData.role || 'SHARER'
    }
  });
} 