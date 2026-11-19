CREATE TABLE `errors` (
	`id` text PRIMARY KEY NOT NULL,
	`at` text NOT NULL,
	`area` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `errors_at_idx` ON `errors` (`at`);