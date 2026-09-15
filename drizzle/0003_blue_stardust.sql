CREATE TABLE `followUpReminderDeliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderRequestId` int NOT NULL,
	`reminderDate` varchar(10) NOT NULL,
	`claimToken` varchar(64) NOT NULL,
	`status` enum('claimed','delivered') NOT NULL DEFAULT 'claimed',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`deliveredAt` timestamp,
	CONSTRAINT `followUpReminderDeliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `followUpReminderDeliveries_order_day_unique` UNIQUE(`orderRequestId`,`reminderDate`)
);
