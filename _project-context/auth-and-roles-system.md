# Authentication, Profile Roles, and Relationship Management System

This document outlines the complete end-to-end process of authentication, user roles, invitations, and relationship management in the Telloom application.

## Table of Contents
1. [Authentication and Profile Setup](#1-authentication-and-profile-setup)
2. [Invitations and Access Grants](#2-invitations-and-access-grants)
3. [Executor Relationships](#3-executor-relationships)
4. [Listener Relationships](#4-listener-relationships)
5. [Follow Request System](#5-follow-request-system)
6. [Role Selection UI](#6-role-selection-ui)
7. [Access Management](#7-access-management)
8. [Best Practices and Security](#8-best-practices-and-security)
9. [Implementation Examples](#9-implementation-examples)
10. [System Overview](#10-system-overview)

## 1. Authentication and Profile Setup

### 1.1 Authentication with Supabase

#### Sign Up Process
- User provides email, password, and initial details (firstName, lastName)
- Supabase Auth service creates user record
- Trigger (`on_auth_user_created`) calls `handle_new_user()` to create Profile record
- Profile.id matches Supabase auth.uid()

#### Login Process
- Supabase manages auth cookies/tokens
- Profile.id matches auth.uid() for role enforcement
- Role-based logic enforced through relationship tables

### 1.2 Profile Tables

#### Profile Table
- 1:1 relationship with Supabase Auth user
- Key columns:
  - `id: uuid`
  - `email: text`
  - `firstName: text`
  - `lastName: text`
  - Standard timestamps

#### ProfileRole Table
Available roles:
- `SHARER`
- `LISTENER`
- `EXECUTOR`
- `ADMIN` (optional)

#### ProfileSharer Table
- Created for users with SHARER role
- Key columns:
  - `profileId: uuid`
  - `subscriptionStatus: text`
  - Standard timestamps

## 2. Invitations and Access Grants

### 2.1 Invitation Table

**Purpose**: Temporary storage for Executor/Listener invitations

**Structure**:
```sql
CREATE TABLE IF NOT EXISTS "Invitation" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "sharerId" UUID REFERENCES "ProfileSharer"("id"),
  "inviterId" UUID REFERENCES "Profile"("id"),
  "inviteeEmail" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "token" TEXT NOT NULL,
  "acceptedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);
```

**Workflow**:
1. Send Invite
   - Create Invitation row with role='EXECUTOR'/'LISTENER'
   - Email invitee with acceptance token

2. Accept Invite
   - User clicks link with token
   - System validates and updates status
   - Creates appropriate relationship record

3. Non-Revocable Nature
   - Invitations remain as historical record
   - Access managed through relationship tables

## 3. Executor Relationships

### 3.1 ProfileExecutor Table

**Purpose**: Links Sharer to Executor

**Structure**:
```sql
CREATE TABLE IF NOT EXISTS "ProfileExecutor" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "sharerId" UUID REFERENCES "ProfileSharer"("id"),
  "executorId" UUID REFERENCES "Profile"("id"),
  "createdAt" TIMESTAMPTZ DEFAULT now()
);
```

**Features**:
- Supports multiple Sharer relationships
- Easily revocable
- Created upon invitation acceptance

## 4. Listener Relationships

### 4.1 ProfileListener Table

**Structure**:
```sql
CREATE TABLE IF NOT EXISTS "ProfileListener" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "listenerId" UUID REFERENCES "Profile"("id"),
  "sharerId" UUID REFERENCES "ProfileSharer"("id"),
  "sharedSince" TIMESTAMPTZ DEFAULT now(),
  "hasAccess" BOOLEAN DEFAULT true,
  "lastViewed" TIMESTAMPTZ,
  "notifications" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);
```

**Features**:
- Tracks viewing history
- Manages notification preferences
- Supports access control

## 5. Follow Request System

### 5.1 FollowRequest Table (Optional)

**Structure**:
```sql
CREATE TABLE IF NOT EXISTS "FollowRequest" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "sharerId" UUID REFERENCES "ProfileSharer"("id"),
  "requestorId" UUID REFERENCES "Profile"("id"),
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now(),
  "approvedAt" TIMESTAMPTZ,
  "deniedAt" TIMESTAMPTZ
);
```

**Workflow**:
- User requests to follow
- Sharer approves/denies
- Approved requests create ProfileListener entry

## 6. Role Selection UI

### 6.1 Role Management

**Initial Setup**:
1. New users get LISTENER role
2. Additional roles added as needed:
   - SHARER → Creates ProfileSharer
   - EXECUTOR → Creates ProfileExecutor

### 6.2 Role Selection Flow
- Users see available roles from ProfileRole
- Executors choose active Sharer if multiple

## 7. Access Management

### 7.1 Removing Access

**Executor Removal**:
```sql
DELETE FROM "ProfileExecutor"
WHERE "sharerId" = :sharerId AND "executorId" = :executorId;
```

**Listener Removal**:
```sql
DELETE FROM "ProfileListener"
WHERE "sharerId" = :sharerId AND "listenerId" = :listenerId;
```

## 8. Best Practices and Security

### 8.1 Row-Level Security (RLS)

**Key Policies**:
- Sharers manage their relationships
- Users access only their records
- Invitations restricted to authorized parties

### 8.2 Security Measures

1. Token Security
   - Random, unique strings
   - Expiration handling
   - Secure transmission

2. Audit Trail
   - Status tracking
   - Timestamp logging
   - Action history

3. Access Control
   - Relationship-based
   - Role-based
   - Time-based (optional)

## 9. Implementation Examples

### 9.1 Creating New Executor

```typescript
async function inviteExecutor(sharerId: string, inviteeEmail: string) {
  const token = generateSecureToken();
  
  // Create invitation
  const invitation = await supabase
    .from('Invitation')
    .insert({
      sharerId,
      inviteeEmail,
      role: 'EXECUTOR',
      token
    })
    .single();

  // Send email
  await sendInvitationEmail(inviteeEmail, token);
  
  return invitation;
}
```

### 9.2 Accepting Invitation

```typescript
async function acceptInvitation(token: string, userId: string) {
  // Validate invitation
  const invitation = await supabase
    .from('Invitation')
    .update({ 
      status: 'ACCEPTED',
      acceptedAt: new Date()
    })
    .match({ token, status: 'PENDING' })
    .single();

  if (invitation.role === 'EXECUTOR') {
    // Create executor relationship
    await supabase
      .from('ProfileExecutor')
      .insert({
        sharerId: invitation.sharerId,
        executorId: userId
      });
  }

  // Ensure role exists
  await ensureUserRole(userId, invitation.role);
}
```

## 10. System Overview

### Key Components
1. **Authentication**: Supabase-based with Profile sync
2. **Roles**: ProfileRole table with role capabilities
3. **Relationships**: 
   - ProfileSharer for content owners
   - ProfileExecutor for managers
   - ProfileListener for content consumers
4. **Access Control**:
   - Invitation system for onboarding
   - Direct relationship management
   - RLS policies for security

### Benefits
- Clean separation of concerns
- Scalable relationship model
- Secure access control
- Audit-friendly design
- Flexible role management

### Best Practices
1. Always use RLS policies
2. Maintain audit trails
3. Implement proper error handling
4. Use type-safe interfaces
5. Follow security protocols

This system provides a robust foundation for managing user relationships, roles, and access control in the Telloom application while maintaining security and scalability. 