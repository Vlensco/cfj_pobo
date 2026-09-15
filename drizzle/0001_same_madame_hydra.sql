CREATE TABLE `orderRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reference` varchar(32) NOT NULL,
	`customerName` varchar(120) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(40) NOT NULL,
	`notes` text,
	`items` text NOT NULL,
	`subtotal` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'IDR',
	`status` enum('new','contacted','closed') NOT NULL DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orderRequests_id` PRIMARY KEY(`id`),
	CONSTRAINT `orderRequests_reference_unique` UNIQUE(`reference`)
);
