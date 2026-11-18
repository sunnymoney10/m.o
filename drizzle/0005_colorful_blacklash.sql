CREATE INDEX `guests_actor_idx` ON `guests` (`actor`);--> statement-breakpoint
CREATE INDEX `memories_plan_idx` ON `memories` (`plan_id`);--> statement-breakpoint
CREATE INDEX `plans_owner_idx` ON `plans` (`owner`,`created`);--> statement-breakpoint
CREATE INDEX `plans_created_idx` ON `plans` (`created`);--> statement-breakpoint
CREATE INDEX `poll_options_poll_idx` ON `poll_options` (`poll_id`);--> statement-breakpoint
CREATE INDEX `poll_votes_poll_idx` ON `poll_votes` (`poll_id`);--> statement-breakpoint
CREATE INDEX `stops_plan_idx` ON `stops` (`plan_id`);