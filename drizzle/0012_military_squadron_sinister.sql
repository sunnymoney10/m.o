CREATE TABLE `guest_access` (
	`guest_id` text NOT NULL,
	`visitor` text NOT NULL,
	`invite_hash` text NOT NULL,
	PRIMARY KEY(`guest_id`, `visitor`)
);
--> statement-breakpoint
CREATE INDEX `guest_access_visitor_idx` ON `guest_access` (`visitor`);--> statement-breakpoint
ALTER TABLE `guests` ADD `invite_hash` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `guests` ADD `invite_expires` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `guests` ADD `invite_required` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `guests` ADD `details_approved` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `door_code` text DEFAULT '' NOT NULL;