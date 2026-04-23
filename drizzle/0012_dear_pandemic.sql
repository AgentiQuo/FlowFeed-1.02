ALTER TABLE `brands` ADD `imageGenerationModel` varchar(50) DEFAULT 'default';--> statement-breakpoint
ALTER TABLE `drafts` DROP COLUMN `feedback`;--> statement-breakpoint
ALTER TABLE `drafts` DROP COLUMN `tone`;