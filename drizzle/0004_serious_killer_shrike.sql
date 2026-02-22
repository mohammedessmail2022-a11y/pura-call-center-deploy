ALTER TABLE `calls` ADD `numberOfTrials` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `calls` DROP COLUMN `clinic`;