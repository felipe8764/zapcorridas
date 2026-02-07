CREATE TABLE `auth_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(512) NOT NULL,
	`userType` enum('passenger','driver') NOT NULL,
	`userId` int NOT NULL,
	`phone` varchar(20) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auth_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_sessions_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `drivers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(20) NOT NULL,
	`name` varchar(255) NOT NULL,
	`carModel` varchar(100) NOT NULL,
	`carColor` varchar(50) NOT NULL,
	`plate` varchar(20) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`isBlocked` boolean NOT NULL DEFAULT false,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`totalRides` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drivers_id` PRIMARY KEY(`id`),
	CONSTRAINT `drivers_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`target` enum('all','passengers','drivers') NOT NULL DEFAULT 'all',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `passengers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(20) NOT NULL,
	`name` varchar(255) NOT NULL,
	`totalRides` int NOT NULL DEFAULT 0,
	`isBlocked` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `passengers_id` PRIMARY KEY(`id`),
	CONSTRAINT `passengers_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `rides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`passengerId` int NOT NULL,
	`driverId` int,
	`originAddress` text NOT NULL,
	`originLat` decimal(10,7) NOT NULL,
	`originLng` decimal(10,7) NOT NULL,
	`destinationAddress` text NOT NULL,
	`destinationLat` decimal(10,7) NOT NULL,
	`destinationLng` decimal(10,7) NOT NULL,
	`distanceKm` decimal(8,2) NOT NULL,
	`durationMinutes` int NOT NULL,
	`status` enum('waiting','accepted','in_progress','completed','cancelled_by_passenger','cancelled_by_driver') NOT NULL DEFAULT 'waiting',
	`acceptedAt` timestamp,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`cancelledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `verification_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(20) NOT NULL,
	`code` varchar(6) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`used` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `verification_codes_id` PRIMARY KEY(`id`)
);
