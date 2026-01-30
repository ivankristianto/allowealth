ALTER TABLE `assets` ADD COLUMN `category_id` text REFERENCES `asset_categories`(`id`);
--> statement-breakpoint
CREATE INDEX `assets_category_id_idx` ON `assets` (`category_id`);
