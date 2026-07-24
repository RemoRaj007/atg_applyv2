-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'customer',
    `pkg` VARCHAR(191) NOT NULL DEFAULT 'Trial',
    `appsUsed` INTEGER NOT NULL DEFAULT 0,
    `appsTotal` INTEGER NOT NULL DEFAULT 10,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Job` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `company` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NULL,
    `source` VARCHAR(191) NULL,
    `deadline` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerApplication` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `jobId` INTEGER NOT NULL,
    `staffId` INTEGER NULL,
    `fitScore` DOUBLE NULL,
    `reason` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending_approval',
    `customerApproval` BOOLEAN NOT NULL DEFAULT false,
    `qcApproval` BOOLEAN NOT NULL DEFAULT false,
    `proof` VARCHAR(191) NULL,
    `proofRef` VARCHAR(191) NULL,
    `internalNotes` VARCHAR(191) NULL,
    `appliedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `pkg` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `paid` BOOLEAN NOT NULL DEFAULT false,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `method` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `ref` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` VARCHAR(191) NOT NULL,
    `unread` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LogEntry` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `category` VARCHAR(191) NOT NULL,
    `level` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `meta` JSON NULL,
    `userId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LogEntry_category_createdAt_idx`(`category`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CustomerApplication` ADD CONSTRAINT `CustomerApplication_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerApplication` ADD CONSTRAINT `CustomerApplication_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `Job`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerApplication` ADD CONSTRAINT `CustomerApplication_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
