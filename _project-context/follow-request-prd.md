# **Logic for Requesting to Follow a Sharer (or Executor) from a Listener Role**

Below is a step-by-step PRD describing how a **Listener** can request to follow a **Sharer** (or Executor, who has the same privileges). In addition, we include an example **Loops.so** email-sending flow similar to your existing `invitation` route, showing how to notify the Sharer/Executor that someone wants to follow them.

We’ll cover:

1. [**Listener’s Request Flow**](#1-listeners-request-flow)  
2. [**Sending Email via Loops.so**](#2-sending-email-via-loopsso)  
3. [**Sharer/Executor Approval/Denial**](#3-sharerexecutor-approvaldenial)  
4. [**Post-Approval**](#4-post-approval)  
5. [**Cleanup & Edge Cases**](#5-cleanup--edge-cases)  

---

## **1. Listener’s Request Flow**

### **Where**  
- `(authenticated)/role-listener/...` — a page where any logged-in **Listener** can search for Sharers/Executors by email and submit a follow request.

### **Steps**

1. **Search UI**  
   - A Listener enters the **email** of the Sharer/Executor they want to follow.  
   - The system checks if a **ProfileSharer** or **ProfileExecutor** exists with that email.

2. **Display Sharer Profile**  
   - If found, display the Sharer’s (or Executor’s) basic info (e.g., `firstName`, `lastName`, `avatarUrl`).
   - Show a **“Request to Follow”** button.

3. **Request to Follow**  
   - The Listener clicks **“Request to Follow.”**  
   - **Client-Side Validation**: Confirm the user is logged in, the Sharer/Executor is valid, etc.  
   - **API Call**:
     ```typescript
     POST /api/follow-requests
     {
       sharerId: "<the found ProfileSharer ID>",
       requestorId: "<the current Listener’s Profile ID>"
     }
     ```

4. **Server-Side: Create FollowRequest**  
   - Insert a row into **`FollowRequest`**:
     ```sql
     INSERT INTO "FollowRequest" (
       id,
       "sharerId",
       "requestorId",
       status,
       "createdAt",
       "updatedAt"
     ) VALUES (
       gen_random_uuid(),
       :sharerId,
       :requestorId,
       'PENDING',
       now(),
       now()
     );
     ```
   - Return success or error to the client.

5. **UI Feedback**  
   - Show a success message:  
     > **“Your follow request has been sent to [SharerName].”**

6. **(Optional) Trigger Email**  
   - You can **immediately** send an email (via Loops.so) to the Sharer/Executor notifying them of the new request. Alternatively, you can handle this in a separate step (see below).

---

## **2. Sending Email via Loops.so**

Below is an **example** route similar to your existing `app/api/invitations/send-email/route.ts`, but for **FollowRequests**. This route can be called immediately after a follow request is created, or at some later point if you allow “resend notifications.”

> **File**: `app/api/follow-requests/send-email/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { loops, TRANSACTIONAL_EMAIL_IDS } from '@/utils/loops';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Ensure user is authenticated
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the followRequestId from the request body
    const { followRequestId } = await request.json();
    if (!followRequestId) {
      return NextResponse.json({ error: 'Missing followRequestId' }, { status: 400 });
    }

    // Fetch FollowRequest details along with Sharer info
    const { data: followRequest, error: followRequestError } = await supabase
      .from('FollowRequest')
      .select(`
        id,
        sharerId,
        requestorId,
        status,
        sharer:ProfileSharer!sharerId (
          profile:Profile!profileId (
            firstName,
            lastName,
            email
          )
        )
      `)
      .eq('id', followRequestId)
      .single();

    if (followRequestError || !followRequest) {
      console.error('Error fetching FollowRequest:', followRequestError);
      return NextResponse.json({ error: 'FollowRequest not found' }, { status: 404 });
    }

    // Gather Sharer info
    const sharerProfile = followRequest.sharer?.profile;
    if (!sharerProfile || !sharerProfile.email) {
      return NextResponse.json({ error: 'Sharer profile not found' }, { status: 404 });
    }

    const sharerEmail = sharerProfile.email;
    const sharerName = `${sharerProfile.firstName || ''} ${sharerProfile.lastName || ''}`.trim();

    // Compose email link
    const followRequestsUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/role-sharer/follow-requests`;

    try {
      // Send email via Loops
      await loops.sendTransactionalEmail({
        transactionalId: TRANSACTIONAL_EMAIL_IDS.FOLLOW_REQUEST,
        email: sharerEmail,
        dataVariables: {
          sharerName,
          requestorName: user.email,
          followRequestsUrl,
        },
      });

      return NextResponse.json({ success: true });
    } catch (emailError) {
      console.error('Error sending email via Loops:', emailError);
      return NextResponse.json(
        { error: 'Failed to send email through Loops' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in follow-requests/send-email route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
## **3. Sharer/Executor Approval/Denial**

### **Where**  
- `(authenticated)/role-sharer/follow-requests` (or a similar route) where Sharers/Executors manage incoming requests.

### **Steps**

1. **Sharer/Executor Views Requests**  
   - They see a list of **PENDING** `FollowRequest` records.
   - Each request shows the requestor’s name/email so the Sharer knows who is asking.

2. **Sharer/Executor Approves or Denies**  
   - **Approve** → Marks request as `APPROVED`.  
   - **Deny** → Marks request as `DENIED`.  

---

## **4. Post-Approval**

Once the Sharer (or Executor) approves:

1. **Create `ProfileListener` Record**  
   ```sql
   INSERT INTO "ProfileListener" (
     id,
     "listenerId",
     "sharerId",
     "sharedSince",
     "hasAccess",
     "createdAt",
     "updatedAt"
   ) VALUES (
     gen_random_uuid(),
     :requestorId,
     :sharerId,
     now(),
     true,
     now(),
     now()
   );
### **2. Assign Role (if needed)**  

If the requestor does not already have the `'LISTENER'` role in **`ProfileRole`**, insert it:

```sql
INSERT INTO "ProfileRole" (id, "profileId", role)
VALUES (gen_random_uuid(), :requestorId, 'LISTENER');
## **5. Cleanup & Edge Cases**

1. **No Expiration**  
   - If the Sharer/Executor never acts, the request remains **`PENDING`** indefinitely.

2. **Revoking Access**  
   - Removing the `ProfileListener` record removes access while keeping the request marked as **`APPROVED`**.

3. **Request Already Exists**  
   - If a Listener tries again for the same Sharer, handle gracefully (e.g., **“Request already pending.”**).

4. **Executors Can Approve**  
   - Executors have the same ability to approve or deny requests on behalf of the Sharer.

5. **Notifications**  
   - Ensure both Sharer and Listener receive relevant **in-app** or **email notifications** (via Loops) at each step.