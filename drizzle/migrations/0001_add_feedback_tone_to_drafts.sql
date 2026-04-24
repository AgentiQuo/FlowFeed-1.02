-- Add feedback and tone columns to drafts table
ALTER TABLE `drafts` ADD COLUMN `feedback` longtext AFTER `sourceReference`;
ALTER TABLE `drafts` ADD COLUMN `tone` varchar(50) AFTER `feedback`;
