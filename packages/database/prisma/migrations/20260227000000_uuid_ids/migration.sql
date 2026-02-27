-- Migration: uuid_ids
-- Converts auto-increment integer PKs to UUID strings.
-- MySQL requires the FK constraint to be dropped before modifying referenced column types.

-- Step 1: Drop the foreign key constraint so we can change column types.
ALTER TABLE `Invoice` DROP FOREIGN KEY `Invoice_userId_fkey`;

-- Step 2: Change column types to VARCHAR(36) to hold UUID strings.
ALTER TABLE `User` MODIFY COLUMN `id` VARCHAR(36) NOT NULL;
ALTER TABLE `Invoice` MODIFY COLUMN `id` VARCHAR(36) NOT NULL;
ALTER TABLE `Invoice` MODIFY COLUMN `userId` VARCHAR(36) NOT NULL;

-- Step 3: Recreate the foreign key constraint with the new column types.
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
