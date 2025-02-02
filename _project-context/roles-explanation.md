# **Roles Overview in the Telloom Next.js App**

In **Telloom**, each user can assume one or more roles—**SHARER**, **LISTENER**, **EXECUTOR**, and/or **ADMIN**—to define their privileges and available features. This document expands on **how** these roles map to the **database schema** via `ProfileRole`, `ProfileSharer`, `ProfileListener`, and `ProfileExecutor` tables, and **how** those tables interrelate to the main `Profile` record.

---

## **User Roles and Authentication**

1. **Roles**
   - **Sharer**: Creates and manages personal video content and attachments.
   - **Listener**: Views content shared by a Sharer.
   - **Executor**: Oversees a Sharer’s content (pre- and post-passing), with most of the Sharer’s privileges.
   - **Admin**: Has system-wide superuser capabilities.

2. **Authentication**
   - **Supabase Auth**: Users can register or log in with **email/password** or **Google OAuth**.
   - **Profile**: A `Profile` row (1:1 with `auth.users`) is created via a trigger `handle_new_user()`.
   - **Role Assignment**:
     - Persisted in the **`ProfileRole`** table.
     - A user can have multiple roles simultaneously.
     - If a user holds multiple roles, upon login they can choose which role to use at `app/(authenticated)/select-role/page` or via a **header dropdown**.

3. **Onboarding Process**
   - **Sharers**: Create a `ProfileSharer` record upon selecting the Sharer role and possibly purchase a subscription (e.g., via RevenueCat).
   - **Listeners**: Typically join via an **Invitation** from a Sharer. Once accepted, a `ProfileListener` row is created.
   - **Executors**: Invited by the Sharer. Accepting the invitation creates a `ProfileExecutor` row linking them to the Sharer’s account.

---

## **Schema Tables for Roles & Relationships**

### **1. ProfileRole**

- **Purpose**: Assigns the *role* to a user’s `Profile`.
- **Columns**:
  - `id: uuid (PK)`
  - `profileId: uuid (FK → Profile.id)`
  - `role: enum('LISTENER','SHARER','EXECUTOR','ADMIN')`
- **Notes**:
  - A **user can have multiple** rows in `ProfileRole` if they hold more than one role.
  - For example, a single user can be both a **SHARER** and a **LISTENER**.

### **2. ProfileSharer**

- **Purpose**: Stores **Sharer-specific** fields, like subscription status.
- **Columns**:
  - `id: uuid (PK)`
  - `profileId: uuid (unique FK → Profile.id)`
  - `subscriptionStatus: boolean` (active or not)
  - `createdAt: timestamptz`
- **Relationship**:
  - **1-to-1** with `Profile`: if a user holds the **SHARER** role, they will typically have exactly **one** `ProfileSharer` entry referencing `profileId`.
  - This table holds Sharer-specific data beyond the generic `Profile` columns.

### **3. ProfileListener**

- **Purpose**: Manages relationships between a **Listener** (`Profile.id`) and a **Sharer** (`ProfileSharer.id`).
- **Columns**:
  - `id: uuid (PK)`
  - `listenerId: uuid (FK → Profile.id)` → who is the listener?
  - `sharerId: uuid (FK → ProfileSharer.id)` → which Sharer do they follow?
  - `hasAccess: boolean (default true)`
  - `sharedSince: timestamptz`
  - `createdAt, updatedAt: timestamptz`
- **Relationship**:
  - Many **Listeners** can point to a single `ProfileSharer.id`.
  - Each row ties one **listener** to one **sharer**, enabling the **listener** to view the Sharer’s content.
  - The `ProfileListener.hasAccess` flag can revoke or grant viewing privileges.

### **4. ProfileExecutor**

- **Purpose**: Links an **Executor** user to a **Sharer**.
- **Columns**:
  - `id: uuid (PK)`
  - `sharerId: uuid (FK → ProfileSharer.id)` → who is the Sharer?
  - `executorId: uuid (FK → Profile.id)` → who is the Executor?
  - `createdAt: timestamptz`
- **Relationship**:
  - Typically **1:1** or **1:many**: a Sharer may optionally designate exactly **one** or multiple Executors, depending on your business logic.
  - Executors have near-identical privileges as the Sharer for content management.

---

## **Role-by-Role Details**

### **Sharer**
- **Age Group**: Often adults 60+ (but not enforced).
- **Tech Savviness**: Potentially limited; UI must be accessible.
- **Key Capabilities**:
  - **Record/Upload** video responses, manage attachments, control privacy levels.
  - Send **Invitations** to Listeners or Executors.
  - Manage or cancel a **subscription** (linked via `ProfileSharer`).
- **Schema Ties**:
  - **`ProfileRole.role = 'SHARER'`**  
  - **`ProfileSharer.profileId = Profile.id`** (1:1 for the Sharer’s specialized info)

### **Listener**
- **Age Group**: Family or loved ones, typically under 60.
- **Key Capabilities**:
  - **View** and **favorite** Sharer content.
  - Use auto-play feed or topic-based navigation.
  - Accept or request follow access to a Sharer.
- **Schema Ties**:
  - **`ProfileRole.role = 'LISTENER'`**  
  - **`ProfileListener.listenerId = Profile.id`**  
  - **`ProfileListener.sharerId = ProfileSharer.id`**  

### **Executor**
- **Purpose**: Trusted individual assigned by Sharer to manage content **before and after** the Sharer passes.
- **Key Capabilities**:
  - Identical to Sharer for content management (share, delete, or modify).
  - Invite additional Listeners.
- **Schema Ties**:
  - **`ProfileRole.role = 'EXECUTOR'`**  
  - **`ProfileExecutor.executorId = Profile.id`** → references the user assigned as Executor.
  - **`ProfileExecutor.sharerId = ProfileSharer.id`** → references which Sharer they manage.

### **Admin**
- **Key Capabilities**:
  - Full superuser privileges across the entire system.
  - Typically bypasses row-level security or has overarching read/write permissions.
- **Schema Ties**:
  - **`ProfileRole.role = 'ADMIN'`** → usually no additional bridging table required.

---

## **How Roles Are Chosen & Maintained**

1. **During Signup**: 
   - By default, new users might start as `LISTENER`.  
   - They can **upgrade** to `SHARER` at any time, creating `ProfileSharer`.  
   - The first `ProfileRole` is assigned by the `handle_new_user()` trigger (often `LISTENER`).
2. **Invitation Flow**:
   - **Sharer** invites a **Listener** or **Executor** by email → an `Invitation` record is created.  
   - On acceptance:
     - The relevant `ProfileListener` or `ProfileExecutor` row is inserted.
     - The user’s `ProfileRole` table is updated with the new role if missing.
3. **Role Switching**:
   - If a user has multiple roles in `ProfileRole`, upon login they choose the role from `/(authenticated)/select-role` or a dropdown.

---

## **Usage in the Next.js App**

- **(authenticated)/role-sharer** routes for Sharers:
  - Dashboards, prompts, media library, invitation management, settings.
- **(authenticated)/role-listener** routes for Listeners:
  - Auto-play feed, favorites, recently watched, notifications, topic-based content browsing.
- **(authenticated)/role-executor** routes for Executors:
  - Manage the Sharer’s media and invites, see a “sharers” list if assigned to multiple.
- **Admin** routes (optional):
  - Typically `(authenticated)/admin/...` for system-wide tasks.

---

## **Summary**

- **ProfileRole** is the central table linking `Profile` to any role (`SHARER`, `LISTENER`, `EXECUTOR`, `ADMIN`).
- **ProfileSharer** holds **sharer-specific** fields (subscriptions, etc.) and is **1:1** with `Profile` if that user is a Sharer.
- **ProfileListener** associates **listeners** (`Profile.id`) to the **sharer** (`ProfileSharer.id`) they follow.
- **ProfileExecutor** associates **executors** (`Profile.id`) to a **sharer** (`ProfileSharer.id`), granting near-full Sharer privileges.
- Each role unlocks different parts of the application’s UI and follows its own RLS policies in the database.

By organizing these roles in separate but interrelated tables, **Telloom** achieves robust, **role-based access control** and flexible user management throughout the entire platform.