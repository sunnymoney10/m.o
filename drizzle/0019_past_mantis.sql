CREATE TABLE `usage_counts` (
	`day` text NOT NULL,
	`area` text NOT NULL,
	`n` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`day`, `area`)
);
