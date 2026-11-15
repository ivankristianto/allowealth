-- Backfilled in SQL because production applies migrations at start and ships no CLI.
UPDATE `mcp_app_passwords` SET `permissions` = '["*"]' WHERE `scope` = 'read-write';--> statement-breakpoint
UPDATE `mcp_app_passwords` SET `permissions` = '["*:read"]' WHERE `scope` = 'read';
