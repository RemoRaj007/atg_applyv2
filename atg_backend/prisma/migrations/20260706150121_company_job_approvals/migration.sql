-- AlterTable
ALTER TABLE `job` ADD COLUMN `companyId` INTEGER NULL,
    ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'approved';

-- AlterTable
ALTER TABLE `payment` ADD COLUMN `jobId` INTEGER NULL,
    MODIFY `pkg` VARCHAR(191) NULL DEFAULT 'Trial';

-- AlterTable
ALTER TABLE `user` ADD COLUMN `companyId` INTEGER NULL;

-- CreateTable
CREATE TABLE `Company` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `website` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `d_status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Company_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChangeRequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(191) NOT NULL,
    `targetId` INTEGER NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `details` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdById` INTEGER NOT NULL,
    `d_status` VARCHAR(191) NOT NULL DEFAULT 'active',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Job` ADD CONSTRAINT `Job_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `Job`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChangeRequest` ADD CONSTRAINT `ChangeRequest_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
