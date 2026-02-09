-- Backfill email_verified_at for existing users with active workspaces
-- These users were created before the email verification flow was added
-- and have been using the app with active workspaces but NULL email_verified_at.
UPDATE `users`
SET `email_verified_at` = `created_at`
WHERE `email_verified_at` IS NULL
  AND `deleted_at` IS NULL
  AND `workspace_id` IN (
    SELECT `id` FROM `workspaces` WHERE `status` = 'active'
  );
