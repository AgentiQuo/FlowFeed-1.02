ALTER TABLE `drafts` MODIFY COLUMN `platform` enum('instagram','linkedin','facebook','x','website') NOT NULL;--> statement-breakpoint
ALTER TABLE `feedbackLogs` MODIFY COLUMN `platform` enum('instagram','linkedin','facebook','x','website') NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` MODIFY COLUMN `platform` enum('instagram','linkedin','facebook','x','website') NOT NULL;