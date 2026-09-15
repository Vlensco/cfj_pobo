CREATE TABLE `followUpReminderSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`enabled` int NOT NULL DEFAULT 1,
	`lastRunAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `followUpReminderSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `followUpReminderSettings_scheduleCronTaskUid_unique` UNIQUE(`scheduleCronTaskUid`)
);
--> statement-breakpoint
ALTER TABLE `orderRequests` ADD `contactedAt` timestamp;--> statement-breakpoint
ALTER TABLE `orderRequests` ADD `lastFollowUpReminderAt` timestamp;