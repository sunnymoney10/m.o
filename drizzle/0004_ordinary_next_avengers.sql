ALTER TABLE `guests` ADD `id` text;--> statement-breakpoint
ALTER TABLE `guests` ADD `extra_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `guests` ADD `extra_names` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `guests` ADD `extra_status` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `guests` ADD `dietary` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `guests` ADD `staying` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `guests_id_unique` ON `guests` (`id`);--> statement-breakpoint
ALTER TABLE `plans` ADD `details` text DEFAULT '' NOT NULL;--> statement-breakpoint
-- Give existing guest rows a public row ID (never the actor).
UPDATE `guests` SET `id` = lower(hex(randomblob(16))) WHERE `id` IS NULL;