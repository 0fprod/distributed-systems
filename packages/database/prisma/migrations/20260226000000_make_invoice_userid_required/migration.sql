-- Drop the old nullable FK constraint first
ALTER TABLE `Invoice` DROP FOREIGN KEY `Invoice_userId_fkey`;

-- Make userId NOT NULL (any existing NULL rows must have been deleted / migrated beforehand)
ALTER TABLE `Invoice` MODIFY COLUMN `userId` INTEGER NOT NULL;

-- Re-add the FK with CASCADE delete so invoices are removed when their owner is deleted
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
