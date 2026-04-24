-- Add missing columns to drafts table
ALTER TABLE `drafts` ADD `feedback` longtext;
ALTER TABLE `drafts` ADD `tone` varchar(50);
