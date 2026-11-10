-- Rows that relied on the old ms SQL default hold milliseconds in seconds columns. Values above
-- 1e11 cannot be seconds (year 5138+), so the guard is idempotent. timestamp_ms columns are skipped.
UPDATE `account` SET `accessTokenExpiresAt` = `accessTokenExpiresAt` / 1000 WHERE `accessTokenExpiresAt` > 100000000000;
--> statement-breakpoint
UPDATE `account` SET `createdAt` = `createdAt` / 1000 WHERE `createdAt` > 100000000000;
--> statement-breakpoint
UPDATE `account` SET `refreshTokenExpiresAt` = `refreshTokenExpiresAt` / 1000 WHERE `refreshTokenExpiresAt` > 100000000000;
--> statement-breakpoint
UPDATE `account` SET `updatedAt` = `updatedAt` / 1000 WHERE `updatedAt` > 100000000000;
--> statement-breakpoint
UPDATE `account_categories` SET `created_at` = `created_at` / 1000 WHERE `created_at` > 100000000000;
--> statement-breakpoint
UPDATE `account_categories` SET `updated_at` = `updated_at` / 1000 WHERE `updated_at` > 100000000000;
--> statement-breakpoint
UPDATE `account_history` SET `recorded_at` = `recorded_at` / 1000 WHERE `recorded_at` > 100000000000;
--> statement-breakpoint
UPDATE `account_snapshots` SET `created_at` = `created_at` / 1000 WHERE `created_at` > 100000000000;
--> statement-breakpoint
UPDATE `account_snapshots` SET `snapshot_date` = `snapshot_date` / 1000 WHERE `snapshot_date` > 100000000000;
--> statement-breakpoint
UPDATE `account_update_reminders` SET `created_at` = `created_at` / 1000 WHERE `created_at` > 100000000000;
--> statement-breakpoint
UPDATE `account_update_reminders` SET `last_updated` = `last_updated` / 1000 WHERE `last_updated` > 100000000000;
--> statement-breakpoint
UPDATE `account_update_reminders` SET `next_reminder` = `next_reminder` / 1000 WHERE `next_reminder` > 100000000000;
--> statement-breakpoint
UPDATE `accounts` SET `closed_at` = `closed_at` / 1000 WHERE `closed_at` > 100000000000;
--> statement-breakpoint
UPDATE `accounts` SET `created_at` = `created_at` / 1000 WHERE `created_at` > 100000000000;
--> statement-breakpoint
UPDATE `accounts` SET `deleted_at` = `deleted_at` / 1000 WHERE `deleted_at` > 100000000000;
--> statement-breakpoint
UPDATE `accounts` SET `last_updated` = `last_updated` / 1000 WHERE `last_updated` > 100000000000;
--> statement-breakpoint
UPDATE `accounts` SET `updated_at` = `updated_at` / 1000 WHERE `updated_at` > 100000000000;
--> statement-breakpoint
UPDATE `budget_categories` SET `created_at` = `created_at` / 1000 WHERE `created_at` > 100000000000;
--> statement-breakpoint
UPDATE `budget_categories` SET `updated_at` = `updated_at` / 1000 WHERE `updated_at` > 100000000000;
--> statement-breakpoint
UPDATE `budgets` SET `created_at` = `created_at` / 1000 WHERE `created_at` > 100000000000;
--> statement-breakpoint
UPDATE `budgets` SET `updated_at` = `updated_at` / 1000 WHERE `updated_at` > 100000000000;
--> statement-breakpoint
UPDATE `email_verification_tokens` SET `created_at` = `created_at` / 1000 WHERE `created_at` > 100000000000;
--> statement-breakpoint
UPDATE `email_verification_tokens` SET `expires_at` = `expires_at` / 1000 WHERE `expires_at` > 100000000000;
--> statement-breakpoint
UPDATE `oauthAccessToken` SET `createdAt` = `createdAt` / 1000 WHERE `createdAt` > 100000000000;
--> statement-breakpoint
UPDATE `oauthAccessToken` SET `expiresAt` = `expiresAt` / 1000 WHERE `expiresAt` > 100000000000;
--> statement-breakpoint
UPDATE `oauthAccessToken` SET `revoked` = `revoked` / 1000 WHERE `revoked` > 100000000000;
--> statement-breakpoint
UPDATE `oauthClient` SET `createdAt` = `createdAt` / 1000 WHERE `createdAt` > 100000000000;
--> statement-breakpoint
UPDATE `oauthClient` SET `updatedAt` = `updatedAt` / 1000 WHERE `updatedAt` > 100000000000;
--> statement-breakpoint
UPDATE `oauthClientAssertion` SET `expiresAt` = `expiresAt` / 1000 WHERE `expiresAt` > 100000000000;
--> statement-breakpoint
UPDATE `oauthClientResource` SET `createdAt` = `createdAt` / 1000 WHERE `createdAt` > 100000000000;
--> statement-breakpoint
UPDATE `oauthConsent` SET `createdAt` = `createdAt` / 1000 WHERE `createdAt` > 100000000000;
--> statement-breakpoint
UPDATE `oauthConsent` SET `updatedAt` = `updatedAt` / 1000 WHERE `updatedAt` > 100000000000;
--> statement-breakpoint
UPDATE `oauthRefreshToken` SET `authTime` = `authTime` / 1000 WHERE `authTime` > 100000000000;
--> statement-breakpoint
UPDATE `oauthRefreshToken` SET `createdAt` = `createdAt` / 1000 WHERE `createdAt` > 100000000000;
--> statement-breakpoint
UPDATE `oauthRefreshToken` SET `expiresAt` = `expiresAt` / 1000 WHERE `expiresAt` > 100000000000;
--> statement-breakpoint
UPDATE `oauthRefreshToken` SET `revoked` = `revoked` / 1000 WHERE `revoked` > 100000000000;
--> statement-breakpoint
UPDATE `oauthRefreshToken` SET `rotatedAt` = `rotatedAt` / 1000 WHERE `rotatedAt` > 100000000000;
--> statement-breakpoint
UPDATE `oauthRefreshToken` SET `rotationReplayExpiresAt` = `rotationReplayExpiresAt` / 1000 WHERE `rotationReplayExpiresAt` > 100000000000;
--> statement-breakpoint
UPDATE `oauthResource` SET `createdAt` = `createdAt` / 1000 WHERE `createdAt` > 100000000000;
--> statement-breakpoint
UPDATE `oauthResource` SET `updatedAt` = `updatedAt` / 1000 WHERE `updatedAt` > 100000000000;
--> statement-breakpoint
UPDATE `oauth_accounts` SET `created_at` = `created_at` / 1000 WHERE `created_at` > 100000000000;
--> statement-breakpoint
UPDATE `passkey` SET `createdAt` = `createdAt` / 1000 WHERE `createdAt` > 100000000000;
--> statement-breakpoint
UPDATE `passkey` SET `updatedAt` = `updatedAt` / 1000 WHERE `updatedAt` > 100000000000;
--> statement-breakpoint
UPDATE `password_reset_tokens` SET `created_at` = `created_at` / 1000 WHERE `created_at` > 100000000000;
--> statement-breakpoint
UPDATE `password_reset_tokens` SET `expires_at` = `expires_at` / 1000 WHERE `expires_at` > 100000000000;
--> statement-breakpoint
UPDATE `recurring_occurrences` SET `confirmed_at` = `confirmed_at` / 1000 WHERE `confirmed_at` > 100000000000;
--> statement-breakpoint
UPDATE `recurring_occurrences` SET `created_at` = `created_at` / 1000 WHERE `created_at` > 100000000000;
--> statement-breakpoint
UPDATE `recurring_occurrences` SET `updated_at` = `updated_at` / 1000 WHERE `updated_at` > 100000000000;
--> statement-breakpoint
UPDATE `recurring_templates` SET `created_at` = `created_at` / 1000 WHERE `created_at` > 100000000000;
--> statement-breakpoint
UPDATE `recurring_templates` SET `updated_at` = `updated_at` / 1000 WHERE `updated_at` > 100000000000;
--> statement-breakpoint
UPDATE `session` SET `createdAt` = `createdAt` / 1000 WHERE `createdAt` > 100000000000;
--> statement-breakpoint
UPDATE `session` SET `expiresAt` = `expiresAt` / 1000 WHERE `expiresAt` > 100000000000;
--> statement-breakpoint
UPDATE `session` SET `updatedAt` = `updatedAt` / 1000 WHERE `updatedAt` > 100000000000;
--> statement-breakpoint
UPDATE `transactions` SET `created_at` = `created_at` / 1000 WHERE `created_at` > 100000000000;
--> statement-breakpoint
UPDATE `transactions` SET `deleted_at` = `deleted_at` / 1000 WHERE `deleted_at` > 100000000000;
--> statement-breakpoint
UPDATE `transactions` SET `transaction_date` = `transaction_date` / 1000 WHERE `transaction_date` > 100000000000;
--> statement-breakpoint
UPDATE `transactions` SET `updated_at` = `updated_at` / 1000 WHERE `updated_at` > 100000000000;
--> statement-breakpoint
UPDATE `twoFactor` SET `lockedUntil` = `lockedUntil` / 1000 WHERE `lockedUntil` > 100000000000;
--> statement-breakpoint
UPDATE `user` SET `createdAt` = `createdAt` / 1000 WHERE `createdAt` > 100000000000;
--> statement-breakpoint
UPDATE `user` SET `updatedAt` = `updatedAt` / 1000 WHERE `updatedAt` > 100000000000;
--> statement-breakpoint
UPDATE `user_meta` SET `created_at` = `created_at` / 1000 WHERE `created_at` > 100000000000;
--> statement-breakpoint
UPDATE `user_meta` SET `updated_at` = `updated_at` / 1000 WHERE `updated_at` > 100000000000;
--> statement-breakpoint
UPDATE `user_mfa` SET `created_at` = `created_at` / 1000 WHERE `created_at` > 100000000000;
--> statement-breakpoint
UPDATE `user_mfa` SET `updated_at` = `updated_at` / 1000 WHERE `updated_at` > 100000000000;
--> statement-breakpoint
UPDATE `user_mfa_backup_codes` SET `created_at` = `created_at` / 1000 WHERE `created_at` > 100000000000;
--> statement-breakpoint
UPDATE `user_mfa_backup_codes` SET `used_at` = `used_at` / 1000 WHERE `used_at` > 100000000000;
--> statement-breakpoint
UPDATE `users` SET `created_at` = `created_at` / 1000 WHERE `created_at` > 100000000000;
--> statement-breakpoint
UPDATE `users` SET `deleted_at` = `deleted_at` / 1000 WHERE `deleted_at` > 100000000000;
--> statement-breakpoint
UPDATE `users` SET `email_verified_at` = `email_verified_at` / 1000 WHERE `email_verified_at` > 100000000000;
--> statement-breakpoint
UPDATE `users` SET `updated_at` = `updated_at` / 1000 WHERE `updated_at` > 100000000000;
--> statement-breakpoint
UPDATE `verification` SET `createdAt` = `createdAt` / 1000 WHERE `createdAt` > 100000000000;
--> statement-breakpoint
UPDATE `verification` SET `expiresAt` = `expiresAt` / 1000 WHERE `expiresAt` > 100000000000;
--> statement-breakpoint
UPDATE `verification` SET `updatedAt` = `updatedAt` / 1000 WHERE `updatedAt` > 100000000000;
--> statement-breakpoint
UPDATE `workspace_invitations` SET `accepted_at` = `accepted_at` / 1000 WHERE `accepted_at` > 100000000000;
--> statement-breakpoint
UPDATE `workspace_invitations` SET `created_at` = `created_at` / 1000 WHERE `created_at` > 100000000000;
--> statement-breakpoint
UPDATE `workspace_invitations` SET `expires_at` = `expires_at` / 1000 WHERE `expires_at` > 100000000000;
--> statement-breakpoint
UPDATE `workspace_meta` SET `created_at` = `created_at` / 1000 WHERE `created_at` > 100000000000;
--> statement-breakpoint
UPDATE `workspace_meta` SET `updated_at` = `updated_at` / 1000 WHERE `updated_at` > 100000000000;
--> statement-breakpoint
UPDATE `workspaces` SET `created_at` = `created_at` / 1000 WHERE `created_at` > 100000000000;
--> statement-breakpoint
UPDATE `workspaces` SET `updated_at` = `updated_at` / 1000 WHERE `updated_at` > 100000000000;
