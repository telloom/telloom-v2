-- First, create Profile entries for each user
INSERT INTO "Profile" (id, email, "firstName", "lastName", "createdAt", "updatedAt")
VALUES
  ('f0321e1a-c8d5-449e-b346-e9acbfc94f6e', '123@test.com', 'Joe', 'Tully', NOW(), NOW()),
  ('5530bc36-c645-488a-b770-bf4dd9d6be00', 'test2@test.com', 'Jane', 'Smith', NOW(), NOW()),
  ('b75e3f37-a803-434b-8dff-e6edc047db99', 'test3@test.com', 'Bob', 'Johnson', NOW(), NOW());

-- Create ProfileRole entries (both SHARER and LISTENER for each)
INSERT INTO "ProfileRole" (id, "profileId", role)
VALUES
  (gen_random_uuid(), 'f0321e1a-c8d5-449e-b346-e9acbfc94f6e', 'SHARER'),
  (gen_random_uuid(), 'f0321e1a-c8d5-449e-b346-e9acbfc94f6e', 'LISTENER'),
  (gen_random_uuid(), '5530bc36-c645-488a-b770-bf4dd9d6be00', 'SHARER'),
  (gen_random_uuid(), '5530bc36-c645-488a-b770-bf4dd9d6be00', 'LISTENER'),
  (gen_random_uuid(), 'b75e3f37-a803-434b-8dff-e6edc047db99', 'SHARER'),
  (gen_random_uuid(), 'b75e3f37-a803-434b-8dff-e6edc047db99', 'LISTENER');

-- Create ProfileSharer entries
INSERT INTO "ProfileSharer" (id, "profileId", "subscriptionStatus", "createdAt")
VALUES
  (gen_random_uuid(), 'f0321e1a-c8d5-449e-b346-e9acbfc94f6e', true, NOW()),
  (gen_random_uuid(), '5530bc36-c645-488a-b770-bf4dd9d6be00', true, NOW()),
  (gen_random_uuid(), 'b75e3f37-a803-434b-8dff-e6edc047db99', true, NOW());

-- Create ProfileListener entries (each user follows the other two)
DO $$
DECLARE
  sharer1_id UUID;
  sharer2_id UUID;
  sharer3_id UUID;
BEGIN
  -- Get the ProfileSharer IDs
  SELECT id INTO sharer1_id FROM "ProfileSharer" WHERE "profileId" = 'f0321e1a-c8d5-449e-b346-e9acbfc94f6e';
  SELECT id INTO sharer2_id FROM "ProfileSharer" WHERE "profileId" = '5530bc36-c645-488a-b770-bf4dd9d6be00';
  SELECT id INTO sharer3_id FROM "ProfileSharer" WHERE "profileId" = 'b75e3f37-a803-434b-8dff-e6edc047db99';

  -- Create ProfileListener relationships
  INSERT INTO "ProfileListener" (id, "listenerId", "sharerId", "sharedSince", "hasAccess", "notifications", "createdAt", "updatedAt")
  VALUES
    -- User 1 follows User 2 and 3
    (gen_random_uuid(), 'f0321e1a-c8d5-449e-b346-e9acbfc94f6e', sharer2_id, NOW(), true, true, NOW(), NOW()),
    (gen_random_uuid(), 'f0321e1a-c8d5-449e-b346-e9acbfc94f6e', sharer3_id, NOW(), true, true, NOW(), NOW()),
    -- User 2 follows User 1 and 3
    (gen_random_uuid(), '5530bc36-c645-488a-b770-bf4dd9d6be00', sharer1_id, NOW(), true, true, NOW(), NOW()),
    (gen_random_uuid(), '5530bc36-c645-488a-b770-bf4dd9d6be00', sharer3_id, NOW(), true, true, NOW(), NOW()),
    -- User 3 follows User 1 and 2
    (gen_random_uuid(), 'b75e3f37-a803-434b-8dff-e6edc047db99', sharer1_id, NOW(), true, true, NOW(), NOW()),
    (gen_random_uuid(), 'b75e3f37-a803-434b-8dff-e6edc047db99', sharer2_id, NOW(), true, true, NOW(), NOW());
END $$; 