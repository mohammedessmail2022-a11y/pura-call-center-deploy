-- Drop clinic column and add numberOfTrials column
ALTER TABLE `calls` DROP COLUMN `clinic`;
ALTER TABLE `calls` ADD COLUMN `numberOfTrials` int NOT NULL DEFAULT 1;
