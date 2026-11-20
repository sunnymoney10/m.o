ALTER TABLE `guests` ADD `with_guest` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `open_plus_ones` integer DEFAULT 0 NOT NULL;