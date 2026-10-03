ALTER TABLE `twoFactor` ADD `verified` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `twoFactor` ADD `failedVerificationCount` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `twoFactor` ADD `lockedUntil` integer;