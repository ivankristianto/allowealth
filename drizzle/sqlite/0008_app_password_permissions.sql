ALTER TABLE `mcp_app_passwords` ADD `permissions` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
-- Backfilled here because production applies migrations at start and ships no CLI. Wildcards keep
-- each token covering permissions added to the registry later, as its scope does today.
UPDATE `mcp_app_passwords` SET `permissions` = '["*"]' WHERE `scope` = 'read-write';--> statement-breakpoint
UPDATE `mcp_app_passwords` SET `permissions` = '["*:read"]' WHERE `scope` = 'read';
