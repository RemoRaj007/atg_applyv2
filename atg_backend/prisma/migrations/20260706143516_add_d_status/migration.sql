-- AlterTable
ALTER TABLE `customerapplication` ADD COLUMN `d_status` VARCHAR(191) NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE `job` ADD COLUMN `d_status` VARCHAR(191) NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE `logentry` ADD COLUMN `d_status` VARCHAR(191) NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE `notification` ADD COLUMN `d_status` VARCHAR(191) NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE `payment` ADD COLUMN `d_status` VARCHAR(191) NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE `scholarship` ADD COLUMN `d_status` VARCHAR(191) NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE `user` ADD COLUMN `d_status` VARCHAR(191) NOT NULL DEFAULT 'active';
