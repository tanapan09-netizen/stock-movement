-- CreateTable
CREATE TABLE `tbl_line_customers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `line_user_id` VARCHAR(255) NOT NULL,
    `display_name` VARCHAR(255) NULL,
    `full_name` VARCHAR(255) NOT NULL,
    `phone_number` VARCHAR(30) NULL,
    `picture_url` VARCHAR(500) NULL,
    `notes` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `registered_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `last_interaction` DATETIME(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `tbl_line_customers_line_user_id_key`(`line_user_id`),
    INDEX `idx_line_customer_user_id`(`line_user_id`),
    INDEX `idx_line_customer_phone`(`phone_number`),
    INDEX `idx_line_customer_active`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
