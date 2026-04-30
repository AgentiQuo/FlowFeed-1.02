ALTER TABLE `posts` ADD `postId` varchar(255);--> statement-breakpoint
ALTER TABLE `posts` ADD `postUrl` varchar(2048);--> statement-breakpoint
ALTER TABLE `posts` ADD `likes` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `posts` ADD `comments` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `posts` ADD `shares` int DEFAULT 0;