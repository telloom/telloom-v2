# **Logic for Inviting a Listener or Executor from a Sharer Role**

Below is a step-by-step workflow for how a **Sharer** can invite someone to become a **Listener** or **Executor** in your Telloom application. We’ll cover:

1. **Sharer’s Invitation Flow** (UI + data creation)  
2. **Email Delivery** (with unique token)  
3. **Invite Acceptance** (token validation, user account creation/sign-in)  
4. **Post-Acceptance** (record creation in `ProfileListener` or `ProfileExecutor`)  
5. **Cleanup** (updating `Invitation.status` or removing relationships)

---

## **1. Sharer’s Invitation Flow**

**Where**: `(authenticated)/role-sharer/...` (e.g., a dedicated `Invitations` section, or inside your Sharer Dashboard).  

1. **User Interface**:  
   - Sharer clicks something like “Invite a New Listener” or “Invite a New Executor.”  
   - A modal/form appears asking for:
     - The **email** of the invitee (`inviteeEmail`)
     - The **role** to assign (LISTENER or EXECUTOR)

2. **Client-Side Validation**:  
   - Confirm it’s a valid email format  
   - Role is either `'LISTENER'` or `'EXECUTOR'` (or `'ADMIN'` if you allow that)

3. **Make an API Call** to your server (e.g., `POST /api/trpc/createInvitation` or a dedicated route like `POST /api/invitations`) with:
   - `inviteeEmail`
   - `role` (LISTENER or EXECUTOR)
   - Possibly the `sharerId` (the ID from `ProfileSharer`)
   - The current user’s profile ID (`inviterId`)

4. **Server-Side Actions** (in your `createInvitation` endpoint or route):
   - **Generate a unique `token`** (e.g., UUID or random string).
   - **Insert** a row into your **`Invitation`** table, something like:
     ```sql
     INSERT INTO "Invitation" (
       id,
       "sharerId",
       "inviterId",
       "inviteeEmail",
       role,
       status,
       token,
       "createdAt"
     ) VALUES (
       gen_random_uuid(),
       :sharerId,
       :inviterId,
       :inviteeEmail,
       :role,
       'PENDING',
       :token,
       now()
     );
     ```
   - Return success (or error) to the client.

5. **UI Feedback**:
   - Show a success toast/notification: “Invitation sent to [inviteeEmail].”

---

## **2. Email Delivery**

**Where**: You might integrate with Loops.so or another email service to send the invite.

1. **Construct Email**:
   - To: `inviteeEmail`
   - Subject: `You’ve been invited to join Telloom as a [Listener/Executor]`
   - Body includes:
     - A personalized message from the Sharer (optional)
     - **Unique acceptance link** containing `?token=...`

2. **Link Example**:

https://yourapp.com/invitation/accept?token=someUniqueToken

- The **`token`** is the same token inserted into the `Invitation` table.

3. **Send the Email** (via Loops.so or any email API):
- If Loops.so is used, you’d call their API with template variables:
  ```json
  {
    "email": inviteeEmail,
    "template_id": "invitation-template",
    "merge_fields": {
      "invite_link": "https://yourapp.com/invitation/accept?token=someUniqueToken",
      "inviter_name": currentSharerName
      // ... etc.
    }
  }
  ```

---

## **3. Invite Acceptance**

**Where**: A new user or existing user visits the invite link.

### 3.1 Route Setup

1. **Create** a dedicated route, for example:
- `app/invitation/accept/page.tsx` (or if you prefer `(auth)/accept-invite/[token]/page.tsx`)
2. The route will:
- **Extract** `token` from the query string (`?token=XYZ`).
- **Check** if the user is already authenticated (via SSR or use of `getServerSession` in Next.js).
  - **If not** logged in, redirect them to `(auth)/login` **and** preserve the token in a session or query param so it’s not lost after login/registration.
  - **If** logged in, continue the acceptance logic.

### 3.2 Validate the Token

1. **Fetch** the `Invitation` record by `token`.  
2. Check if:
- `Invitation.status` is still `'PENDING'` (or `'EXPIRED'`, `'DECLINED'`, etc.)
- `Invitation.token` matches
- Possibly check if `acceptedAt` is still `NULL`
- (Optionally) confirm the invitation is not older than 30 days or your chosen expiry.

3. **If Invalid**:
- Show an error page or toast: “This invitation has expired or was invalid.”

### 3.3 Finalize Acceptance

If everything is valid:

1. **Update** the `Invitation.status` to `'ACCEPTED'` (and set `acceptedAt = now()`).
2. **Identify** the **invitee**:
- The current `auth.uid()` user. Let’s call it `inviteeProfileId`.
3. **Create or Update** the user’s **ProfileRole** if needed:
- If `Invitation.role = 'EXECUTOR'`, ensure the user has a `ProfileRole` of `'EXECUTOR'`.
- If `Invitation.role = 'LISTENER'`, ensure `'LISTENER'` is in `ProfileRole`.
4. **Create** the pivot record:
- **If `'EXECUTOR'`**:
  - Insert into `ProfileExecutor` with:
    - `sharerId = invitation.sharerId` (the `ProfileSharer` row ID)
    - `executorId = inviteeProfileId` (the user’s `Profile.id` — note that you might need to join `ProfileSharer.profileId` to `Profile.id`)
- **If `'LISTENER'`**:
  - Insert into `ProfileListener` with:
    - `listenerId = inviteeProfileId`
    - `sharerId = invitation.sharerId`
    - `hasAccess = true`
    - `sharedSince = now()`
5. **Redirect** the user to a success page or their new role’s dashboard.

---

## **4. Post-Acceptance**

### 4.1 Reroute to Role Selection (Optional)

If your platform allows the same user to have multiple roles, you might want to **prompt** them to pick a role each session. In that case:

1. On acceptance, you set `ProfileRole` = `'LISTENER'` or `'EXECUTOR'`.
2. The next time they log in, they see a “Select your role” page at something like:  

/(authenticated)/select-role/page.tsx

letting them choose among `SHARER`, `LISTENER`, `EXECUTOR` if they have more than one role assigned.

### 4.2 Sharer’s View

- The Sharer can see a new item in their “Invitations” or “Collaborators” table showing “Accepted” or “Active.”
- The Sharer can **remove** the relationship at any time by:
- Deleting that row in `ProfileExecutor` or `ProfileListener`.

### 4.3 Executor’s / Listener’s View

- The new user can see the Sharer they are connected to in their own dashboard:
- For **LISTENER**: They see the Sharer’s content via `ProfileListener.hasAccess = true`.
- For **EXECUTOR**: They see the Sharer’s data via `ProfileExecutor`.

---

## **5. Cleanup / Edge Cases**

1. **Invitation Expiry**:
- If you want them to expire after 30 days, have a cron or check at acceptance time. If older than 30 days, set `status='EXPIRED'`.
2. **User Doesn’t Accept**:
- The invitation remains `'PENDING'`.  
- Sharer can see that it hasn’t been accepted yet.
3. **User Accepts but is the Wrong Person**:
- The sharer can revoke. You do that by removing the pivot record (`ProfileExecutor` or `ProfileListener`)—the invitation doesn’t get “unaccepted,” but the access is effectively gone.
4. **Invitee Already Has an Account**:
- They’ll just sign in. The logic remains the same.
5. **Invitee Doesn’t Have an Account**:
- They’ll create one upon hitting the invitation link (or after being redirected to register).
- After successful registration + login, the acceptance flow completes automatically.

---

## **Putting It All Together**

**High-Level Pseudocode**:

1. **(Sharer invites)**  
```typescript
// POST /api/invitations
const { inviteeEmail, role, sharerId } = req.body;
const token = generateToken(); // e.g. uuid
await db.invitation.create({
  data: {
    sharerId,
    inviterId: currentUserProfileId,
    inviteeEmail,
    role,
    status: 'PENDING',
    token,
    createdAt: new Date(),
  },
});
sendEmail({
  to: inviteeEmail,
  subject: 'You’ve been invited to join Telloom!',
  templateVars: { inviteLink: `https://.../invitation/accept?token=${token}` },
});

Return success.
	2.	(Invitee clicks link)

// GET /invitation/accept?token=XYZ
// SSR or RSC fetch the invitation by token
const invitation = await db.invitation.findUnique({ where: { token: tokenParam } });
if (!invitation || invitation.status !== 'PENDING') {
  return <Error>Invalid or expired invitation</Error>;
}
// If user is not logged in, redirect to /login?next=/invitation/accept?token=XYZ
// Otherwise: proceed


	3.	(Accept invitation)

// Inside a server action or next step after login
await db.invitation.update({
  where: { token },
  data: {
    status: 'ACCEPTED',
    acceptedAt: new Date(),
  },
});
// Add role if needed
await db.profileRole.upsert({
  where: { profileId_role: { profileId: inviteeProfileId, role: invitation.role } },
  update: {},
  create: { profileId: inviteeProfileId, role: invitation.role },
});
if (invitation.role === 'LISTENER') {
  await db.profileListener.create({
    data: {
      listenerId: inviteeProfileId,
      sharerId: invitation.sharerId,
      hasAccess: true,
      sharedSince: new Date(),
    },
  });
} else if (invitation.role === 'EXECUTOR') {
  await db.profileExecutor.create({
    data: {
      sharerId: invitation.sharerId,
      executorId: inviteeProfileId,
      createdAt: new Date(),
    },
  });
}
// Then redirect them to their new dashboard or role selector


	4.	(Sharer sees accepted)
	•	The invitation.status is now 'ACCEPTED'.
	•	ProfileExecutor or ProfileListener relationships exist.

Conclusion

This flow ensures:
	•	Sharers can invite users by email.
	•	Invitees receive an email link with a unique token.
	•	The user either registers or signs in, then the system updates the Invitation.status, creates ProfileListener or ProfileExecutor, and optionally adds the appropriate row in ProfileRole.
	•	Revocation is simply removing that relationship row.

Implementing this carefully in your routes (both UI and API code) will give you a robust, user-friendly invitation system for adding Listeners and Executors.

