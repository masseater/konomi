CREATE TABLE `taste_note` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`statements` text NOT NULL,
	`coversUntilMs` integer NOT NULL,
	`createdAtMs` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `subject` ADD `vectorId` text;--> statement-breakpoint
CREATE UNIQUE INDEX `subject_vector_id` ON `subject` (`vectorId`);--> statement-breakpoint
CREATE INDEX `taste_note_created_at` ON `taste_note` (`createdAtMs`);