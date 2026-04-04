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
