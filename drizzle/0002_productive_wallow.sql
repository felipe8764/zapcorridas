CREATE TABLE `admins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(20) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`isBlocked` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admins_id` PRIMARY KEY(`id`),
	CONSTRAINT `admins_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `message_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`template` text NOT NULL,
	`variables` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `message_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `message_templates_key_unique` UNIQUE(`key`)
);
