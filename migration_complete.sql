-- Migration 0000-0013: Complete database schema setup
-- This script applies all pending migrations to bring the database up to date

-- Migration 0000
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);

-- Migration 0001
CREATE TABLE `agents` (
	`id` varchar(36) NOT NULL,
	`brandId` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agents_id` PRIMARY KEY(`id`)
);

CREATE TABLE `brands` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`websiteUrl` varchar(2048),
	`voiceBibleUrl` varchar(2048),
	`voiceBibleContent` longtext,
	`description` text,
	`copywritingGuide` longtext,
	`imageGenerationGuide` longtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brands_id` PRIMARY KEY(`id`)
);

CREATE TABLE `categories` (
	`id` varchar(36) NOT NULL,
	`brandId` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`)
);

CREATE TABLE `contentAssets` (
	`id` varchar(36) NOT NULL,
	`brandId` varchar(36) NOT NULL,
	`categoryId` varchar(36) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`s3Key` varchar(2048) NOT NULL,
	`s3Url` varchar(2048) NOT NULL,
	`mimeType` varchar(100),
	`fileSize` int,
	`status` enum('pending','processing','completed','failed') DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contentAssets_id` PRIMARY KEY(`id`)
);

CREATE TABLE `drafts` (
	`id` varchar(36) NOT NULL,
	`brandId` varchar(36) NOT NULL,
	`assetId` varchar(36) NOT NULL,
	`categoryId` varchar(36) NOT NULL,
	`platform` enum('instagram','linkedin','facebook','website') NOT NULL,
	`content` longtext NOT NULL,
	`variations` json,
	`sourceReference` json,
	`status` enum('draft','reviewed','scheduled','published') DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drafts_id` PRIMARY KEY(`id`)
);

CREATE TABLE `feedbackLogs` (
	`id` varchar(36) NOT NULL,
	`brandId` varchar(36) NOT NULL,
	`categoryId` varchar(36) NOT NULL,
	`platform` enum('instagram','linkedin','facebook','website') NOT NULL,
	`originalContent` longtext NOT NULL,
	`editedContent` longtext NOT NULL,
	`feedback` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feedbackLogs_id` PRIMARY KEY(`id`)
);

CREATE TABLE `leads` (
	`id` varchar(36) NOT NULL,
	`postId` varchar(36) NOT NULL,
	`brandId` varchar(36) NOT NULL,
	`agentId` varchar(36),
	`customerName` varchar(255) NOT NULL,
	`customerEmail` varchar(320) NOT NULL,
	`customerPhone` varchar(20),
	`message` longtext,
	`status` enum('new','contacted','converted','lost') DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);

CREATE TABLE `partners` (
	`id` varchar(36) NOT NULL,
	`brandId` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`contactEmail` varchar(320),
	`phone` varchar(20),
	`type` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `partners_id` PRIMARY KEY(`id`)
);

CREATE TABLE `posts` (
	`id` varchar(36) NOT NULL,
	`brandId` varchar(36) NOT NULL,
	`draftId` varchar(36) NOT NULL,
	`platform` enum('instagram','linkedin','facebook','website') NOT NULL,
	`content` longtext NOT NULL,
	`status` enum('queued','scheduled','published','failed') DEFAULT 'queued',
	`scheduledFor` timestamp,
	`publishedAt` timestamp,
	`queuePosition` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `posts_id` PRIMARY KEY(`id`)
);

-- Migration 0002
ALTER TABLE `drafts` MODIFY COLUMN `platform` enum('instagram','linkedin','facebook','x','website') NOT NULL;
ALTER TABLE `feedbackLogs` MODIFY COLUMN `platform` enum('instagram','linkedin','facebook','x','website') NOT NULL;
ALTER TABLE `posts` MODIFY COLUMN `platform` enum('instagram','linkedin','facebook','x','website') NOT NULL;

-- Migration 0003
ALTER TABLE `posts` ADD `impressions` int DEFAULT 0;
ALTER TABLE `posts` ADD `engagements` int DEFAULT 0;
ALTER TABLE `posts` ADD `clicks` int DEFAULT 0;
ALTER TABLE `posts` ADD `conversions` int DEFAULT 0;

-- Migration 0004
CREATE TABLE `brandCredentials` (
	`id` varchar(36) NOT NULL,
	`brandId` varchar(36) NOT NULL,
	`platform` enum('instagram','linkedin','facebook','x','website') NOT NULL,
	`accountId` varchar(255),
	`accountName` varchar(255),
	`accountEmail` varchar(320),
	`credentials` longtext NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastVerified` timestamp,
	`verificationStatus` enum('pending','verified','failed') DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brandCredentials_id` PRIMARY KEY(`id`)
);

-- Migration 0005
CREATE TABLE `postingSchedules` (
	`id` varchar(36) NOT NULL,
	`platform` enum('instagram','linkedin','facebook','x') NOT NULL,
	`minHoursBetweenPosts` int NOT NULL,
	`maxHoursBetweenPosts` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `postingSchedules_id` PRIMARY KEY(`id`),
	CONSTRAINT `postingSchedules_platform_unique` UNIQUE(`platform`)
);

-- Migration 0006
ALTER TABLE `posts` ADD `thumbnailUrl` varchar(2048);

-- Migration 0008
ALTER TABLE `brands` ADD `brandLearnings` longtext;

-- Migration 0009
ALTER TABLE `drafts` ADD `title` varchar(500);

-- Migration 0010
ALTER TABLE `brands` DROP COLUMN `brandLearnings`;

-- Migration 0011
ALTER TABLE `posts` ADD `title` varchar(500);

-- Migration 0012 (partial - add imageGenerationModel)
ALTER TABLE `brands` ADD `imageGenerationModel` varchar(50) DEFAULT 'default';

-- Migration 0013 (add feedback and tone columns)
ALTER TABLE `drafts` ADD `feedback` longtext;
ALTER TABLE `drafts` ADD `tone` varchar(50);
