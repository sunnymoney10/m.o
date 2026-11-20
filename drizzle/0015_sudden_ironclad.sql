CREATE TABLE `host_access` (
	`plan_id` text NOT NULL,
	`visitor` text NOT NULL,
	`key_hash` text NOT NULL,
	PRIMARY KEY(`plan_id`, `visitor`)
);
--> statement-breakpoint
CREATE INDEX `host_access_visitor_idx` ON `host_access` (`visitor`);