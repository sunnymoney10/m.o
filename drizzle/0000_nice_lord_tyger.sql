CREATE TABLE `guests` (
	`plan_id` text NOT NULL,
	`actor` text NOT NULL,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`note` text NOT NULL,
	PRIMARY KEY(`plan_id`, `actor`),
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`date` text NOT NULL,
	`place` text NOT NULL,
	`budget` text NOT NULL,
	`note` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`claimed_by` text,
	`claimed_name` text,
	`done` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE no action
);
