-- Create Notification table
CREATE TABLE IF NOT EXISTS "Notification" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES "Profile"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "isRead" BOOLEAN DEFAULT FALSE,
  "data" JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view their own notifications
CREATE POLICY "view_own_notifications"
ON "Notification"
FOR SELECT
TO authenticated
USING (auth.uid() = "userId");

-- Policy to allow users to update their own notifications (for marking as read)
CREATE POLICY "update_own_notifications"
ON "Notification"
FOR UPDATE
TO authenticated
USING (auth.uid() = "userId")
WITH CHECK (auth.uid() = "userId");

-- Policy to allow service role to create notifications
CREATE POLICY "service_role_create_notifications"
ON "Notification"
FOR INSERT
TO service_role
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX "notification_user_id_idx" ON "Notification"("userId");
CREATE INDEX "notification_created_at_idx" ON "Notification"("createdAt");

-- Grant necessary permissions
GRANT ALL ON "Notification" TO authenticated;
GRANT ALL ON "Notification" TO service_role; 