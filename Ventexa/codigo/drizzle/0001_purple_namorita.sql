CREATE TABLE `image_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`created_at` integer NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `image_jobs_actor_time` ON `image_jobs` (`actor`,`created_at`);