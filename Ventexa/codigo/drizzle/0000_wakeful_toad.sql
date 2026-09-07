CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`revision` integer NOT NULL,
	`actor` text NOT NULL,
	`at` text NOT NULL,
	`action` text NOT NULL,
	`data` text NOT NULL,
	`hash` text NOT NULL,
	`previous_hash` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `estimated_measures` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`vano` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `files` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`name` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `official_measures` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`vano` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `order_measures` (
	`order_id` text NOT NULL,
	`official_id` text NOT NULL,
	PRIMARY KEY(`order_id`, `official_id`),
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`official_id`) REFERENCES `official_measures`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `revisions` (
	`tenant` text NOT NULL,
	`revision` integer NOT NULL,
	`operation` text NOT NULL,
	`actor` text NOT NULL,
	`at` text NOT NULL,
	PRIMARY KEY(`tenant`, `revision`)
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`tenant` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`data` text NOT NULL
);

--> statement-breakpoint
CREATE UNIQUE INDEX idx_revisions_tenant_operation ON revisions(tenant,operation);
--> statement-breakpoint
CREATE INDEX idx_audit_tenant_revision ON audit(tenant,revision);
--> statement-breakpoint
CREATE INDEX idx_official_tenant ON official_measures(tenant);
--> statement-breakpoint
CREATE INDEX idx_estimated_tenant ON estimated_measures(tenant);
--> statement-breakpoint
CREATE INDEX idx_orders_tenant ON orders(tenant);
--> statement-breakpoint
CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT,'Audit records are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT,'Audit records are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER official_no_update BEFORE UPDATE ON official_measures BEGIN SELECT RAISE(ABORT,'Official measurements are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER official_no_delete BEFORE DELETE ON official_measures BEGIN SELECT RAISE(ABORT,'Official measurements are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER estimated_no_update BEFORE UPDATE ON estimated_measures BEGIN SELECT RAISE(ABORT,'Estimated measurements are immutable'); END;
