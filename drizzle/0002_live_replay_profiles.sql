CREATE TABLE `memories` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`actor` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`body` text NOT NULL,
	`photo_url` text,
	`created` text NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `poll_options` (
	`id` text PRIMARY KEY NOT NULL,
	`poll_id` text NOT NULL,
	`label` text NOT NULL,
	`added_by` text NOT NULL,
	FOREIGN KEY (`poll_id`) REFERENCES `polls`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `poll_votes` (
	`option_id` text NOT NULL,
	`poll_id` text NOT NULL,
	`actor` text NOT NULL,
	PRIMARY KEY(`option_id`, `actor`),
	FOREIGN KEY (`option_id`) REFERENCES `poll_options`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `polls` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`question` text NOT NULL,
	`kind` text NOT NULL,
	`decided_option` text,
	`created` text NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`actor` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`handle` text NOT NULL,
	`mo` text NOT NULL,
	`interests` text NOT NULL,
	`style` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_handle_unique` ON `profiles` (`handle`);--> statement-breakpoint
CREATE TABLE `stops` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`at` text NOT NULL,
	`title` text NOT NULL,
	`detail` text NOT NULL,
	`url` text,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `plans` ADD `made_it` integer DEFAULT 0 NOT NULL;
