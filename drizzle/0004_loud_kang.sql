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
