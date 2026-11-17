CREATE TABLE `reply_links` (
	`hash` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`guest_id` text NOT NULL,
	`created` text NOT NULL
);
