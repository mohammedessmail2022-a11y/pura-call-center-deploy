CREATE TABLE `agent_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentName` varchar(255) NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`isAdmin` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastActiveAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `agent_sessions_sessionId_unique` UNIQUE(`sessionId`)
);
--> statement-breakpoint
CREATE TABLE `calls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientName` varchar(255) NOT NULL,
	`appointmentTime` varchar(50) NOT NULL,
	`agentName` varchar(255) NOT NULL,
	`status` enum('no_answer','confirmed','redirected') NOT NULL DEFAULT 'no_answer',
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calls_id` PRIMARY KEY(`id`)
);
