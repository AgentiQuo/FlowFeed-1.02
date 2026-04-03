CREATE TABLE `agents` (
	`id` varchar(36) NOT NULL,
	`brandId` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `brands` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`websiteUrl` varchar(2048),
	`voiceBibleUrl` varchar(2048),
	`voiceBibleContent` longtext,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brands_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` varchar(36) NOT NULL,
	`brandId` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contentAssets` (
	`id` varchar(36) NOT NULL,
	`brandId` varchar(36) NOT NULL,
	`categoryId` varchar(36) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`s3Key` varchar(2048) NOT NULL,
	`s3Url` varchar(2048) NOT NULL,
	`mimeType` varchar(100),
	`fileSize` int,
	`extractedMetadata` json,
	`status` enum('pending','processing','completed','failed') DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contentAssets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
