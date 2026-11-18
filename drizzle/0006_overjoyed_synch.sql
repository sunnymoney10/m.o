CREATE TABLE `activity` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`at` text NOT NULL,
	`text` text NOT NULL,
	`by_host` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `activity_plan_idx` ON `activity` (`plan_id`,`at`);--> statement-breakpoint
ALTER TABLE `guests` ADD `source` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `guests` ADD `updated` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `claim_source` text DEFAULT '' NOT NULL;