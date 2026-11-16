CREATE TABLE `setter_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`content` text NOT NULL,
	`base` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE no action
);
