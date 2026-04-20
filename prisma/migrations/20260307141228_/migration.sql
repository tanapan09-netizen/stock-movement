/*
  Warnings:

  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE `borrow_items` ADD COLUMN `returned_at` DATETIME(0) NULL,
    ADD COLUMN `returned_qty` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `borrow_requests` ADD COLUMN `returned_at` DATETIME(0) NULL;

-- AlterTable
ALTER TABLE `tbl_action_log` MODIFY `p_id` VARCHAR(50) NULL;

-- AlterTable
ALTER TABLE `tbl_products` ADD COLUMN `deleted_at` DATETIME(0) NULL,
    ADD COLUMN `is_luxury` BOOLEAN NULL DEFAULT false;

-- AlterTable
ALTER TABLE `tbl_suppliers` ADD COLUMN `tax_id` VARCHAR(20) NULL;

-- AlterTable
ALTER TABLE `tbl_users` ADD COLUMN `custom_permissions` TEXT NULL,
    ADD COLUMN `deleted_at` DATETIME(0) NULL,
    ADD COLUMN `email` VARCHAR(100) NULL,
    ADD COLUMN `failed_attempts` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `is_approver` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `line_user_id` VARCHAR(100) NULL,
    ADD COLUMN `locked_until` DATETIME(0) NULL;

-- DropTable
DROP TABLE `users`;

-- CreateTable
CREATE TABLE `tbl_maintenance_history` (
    `history_id` INTEGER NOT NULL AUTO_INCREMENT,
    `request_id` INTEGER NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `old_value` TEXT NULL,
    `new_value` TEXT NULL,
    `changed_by` VARCHAR(100) NOT NULL,
    `changed_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `tbl_maintenance_history_request_id_idx`(`request_id`),
    PRIMARY KEY (`history_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_maintenance_parts` (
    `part_id` INTEGER NOT NULL AUTO_INCREMENT,
    `request_id` INTEGER NOT NULL,
    `p_id` VARCHAR(50) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unit` VARCHAR(50) NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'withdrawn',
    `withdrawn_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `used_at` TIMESTAMP(0) NULL,
    `returned_at` TIMESTAMP(0) NULL,
    `returned_qty` INTEGER NOT NULL DEFAULT 0,
    `withdrawn_by` VARCHAR(100) NOT NULL,
    `notes` TEXT NULL,
    `actual_used` INTEGER NULL DEFAULT 0,
    `verified_quantity` INTEGER NULL DEFAULT 0,
    `verified_at` TIMESTAMP(0) NULL,
    `verification_notes` TEXT NULL,

    INDEX `tbl_maintenance_parts_p_id_idx`(`p_id`),
    INDEX `tbl_maintenance_parts_request_id_idx`(`request_id`),
    INDEX `tbl_maintenance_parts_status_idx`(`status`),
    PRIMARY KEY (`part_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_maintenance_requests` (
    `request_id` INTEGER NOT NULL AUTO_INCREMENT,
    `request_number` VARCHAR(50) NOT NULL,
    `room_id` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `priority` VARCHAR(20) NOT NULL DEFAULT 'normal',
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `reported_by` VARCHAR(100) NOT NULL,
    `assigned_to` VARCHAR(100) NULL,
    `completed_at` TIMESTAMP(0) NULL,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `actual_cost` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `estimated_cost` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `image_url` VARCHAR(500) NULL,
    `scheduled_date` DATE NULL,
    `category` VARCHAR(50) NULL,
    `department` VARCHAR(100) NULL,
    `contact_info` VARCHAR(100) NULL,
    `tags` VARCHAR(255) NULL,
    `completion_image_url` VARCHAR(500) NULL,
    `technician_signature` LONGTEXT NULL,
    `customer_signature` LONGTEXT NULL,
    `deleted_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `tbl_maintenance_requests_request_number_key`(`request_number`),
    INDEX `tbl_maintenance_requests_room_id_idx`(`room_id`),
    INDEX `tbl_maintenance_requests_status_idx`(`status`),
    PRIMARY KEY (`request_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_part_requests` (
    `request_id` INTEGER NOT NULL AUTO_INCREMENT,
    `request_number` VARCHAR(50) NULL,
    `maintenance_id` INTEGER NULL,
    `item_name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `requested_by` VARCHAR(100) NOT NULL,
    `department` VARCHAR(255) NULL,
    `date_needed` DATE NULL,
    `priority` VARCHAR(50) NOT NULL DEFAULT 'normal',
    `estimated_price` DECIMAL(10, 2) NULL,
    `supplier` VARCHAR(255) NULL,
    `quotation_file` VARCHAR(500) NULL,
    `quotation_link` VARCHAR(500) NULL,
    `approval_notes` TEXT NULL,
    `request_type` VARCHAR(50) NULL DEFAULT 'standard',
    `current_stage` INTEGER NULL DEFAULT 0,
    `category` VARCHAR(50) NULL,
    `supervisor_approved_by` VARCHAR(100) NULL,
    `supervisor_approved_at` TIMESTAMP(0) NULL,
    `accounting_approved_by` VARCHAR(100) NULL,
    `accounting_approved_at` TIMESTAMP(0) NULL,
    `manager_approved_by` VARCHAR(100) NULL,
    `manager_approved_at` TIMESTAMP(0) NULL,
    `rejection_reason` TEXT NULL,
    `rejected_by` VARCHAR(100) NULL,
    `rejected_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `tbl_part_requests_request_number_key`(`request_number`),
    INDEX `tbl_part_requests_maintenance_id_idx`(`maintenance_id`),
    INDEX `tbl_part_requests_status_idx`(`status`),
    INDEX `idx_date_needed`(`date_needed`),
    INDEX `idx_priority`(`priority`),
    PRIMARY KEY (`request_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_pm_plans` (
    `pm_id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `room_id` INTEGER NOT NULL,
    `frequency_type` VARCHAR(20) NOT NULL,
    `interval` INTEGER NOT NULL DEFAULT 1,
    `next_run_date` DATE NOT NULL,
    `assigned_to` VARCHAR(100) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `last_generated` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `tbl_pm_plans_room_id_idx`(`room_id`),
    PRIMARY KEY (`pm_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_rooms` (
    `room_id` INTEGER NOT NULL AUTO_INCREMENT,
    `room_code` VARCHAR(20) NOT NULL,
    `room_name` VARCHAR(100) NOT NULL,
    `building` VARCHAR(100) NULL,
    `floor` VARCHAR(20) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deleted_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `tbl_rooms_room_code_key`(`room_code`),
    PRIMARY KEY (`room_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_system_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `action` VARCHAR(50) NOT NULL,
    `entity` VARCHAR(50) NULL,
    `entity_id` VARCHAR(50) NULL,
    `details` TEXT NULL,
    `user_id` INTEGER NULL,
    `username` VARCHAR(100) NULL,
    `ip_address` VARCHAR(45) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `tbl_system_logs_action_idx`(`action`),
    INDEX `tbl_system_logs_entity_idx`(`entity`),
    INDEX `tbl_system_logs_username_idx`(`username`),
    INDEX `tbl_system_logs_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_system_settings` (
    `setting_key` VARCHAR(100) NOT NULL,
    `setting_value` LONGTEXT NOT NULL,
    `description` TEXT NULL,
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`setting_key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_technicians` (
    `tech_id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(100) NULL,
    `specialty` VARCHAR(100) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `notes` TEXT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `line_user_id` VARCHAR(100) NULL,

    INDEX `tbl_technicians_status_idx`(`status`),
    PRIMARY KEY (`tech_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `app_settings` (
    `k` VARCHAR(100) NOT NULL,
    `v` LONGTEXT NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`k`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_line_users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `line_user_id` VARCHAR(255) NOT NULL,
    `display_name` VARCHAR(255) NULL,
    `full_name` VARCHAR(255) NULL,
    `picture_url` VARCHAR(500) NULL,
    `is_approver` BOOLEAN NOT NULL DEFAULT false,
    `role` VARCHAR(50) NOT NULL DEFAULT 'general',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_interaction` DATETIME(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `tbl_line_users_line_user_id_key`(`line_user_id`),
    INDEX `idx_line_user_id`(`line_user_id`),
    INDEX `idx_is_approver`(`is_approver`),
    INDEX `idx_is_active`(`is_active`),
    INDEX `idx_user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_petty_cash` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `request_number` VARCHAR(50) NOT NULL,
    `requested_by` VARCHAR(255) NOT NULL,
    `purpose` TEXT NOT NULL,
    `requested_amount` DECIMAL(10, 2) NOT NULL,
    `dispensed_amount` DECIMAL(10, 2) NULL,
    `actual_spent` DECIMAL(10, 2) NULL,
    `change_returned` DECIMAL(10, 2) NULL,
    `receipt_urls` JSON NULL,
    `notes` TEXT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
    `has_original_receipt` BOOLEAN NOT NULL DEFAULT false,
    `cost_center` VARCHAR(100) NULL,
    `category` VARCHAR(100) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `dispensed_at` TIMESTAMP(0) NULL,
    `cleared_at` TIMESTAMP(0) NULL,
    `reconciled_at` TIMESTAMP(0) NULL,
    `dispensed_by` VARCHAR(255) NULL,
    `reconciled_by` VARCHAR(255) NULL,
    `payee_signature` LONGTEXT NULL,
    `payer_signature` LONGTEXT NULL,

    UNIQUE INDEX `tbl_petty_cash_request_number_key`(`request_number`),
    INDEX `idx_pc_status`(`status`),
    INDEX `idx_pc_requested_by`(`requested_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_petty_cash_fund` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fund_name` VARCHAR(100) NOT NULL,
    `max_limit` DECIMAL(10, 2) NOT NULL,
    `current_balance` DECIMAL(10, 2) NOT NULL,
    `warning_threshold` DECIMAL(10, 2) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `last_replenished_at` TIMESTAMP(0) NULL,
    `replenished_by` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_approval_requests` (
    `request_id` INTEGER NOT NULL AUTO_INCREMENT,
    `request_number` VARCHAR(50) NOT NULL,
    `request_type` VARCHAR(50) NOT NULL,
    `requested_by` INTEGER NOT NULL,
    `request_date` DATE NULL,
    `start_time` TIMESTAMP(0) NULL,
    `end_time` TIMESTAMP(0) NULL,
    `amount` DECIMAL(10, 2) NULL,
    `reason` TEXT NOT NULL,
    `reference_job` VARCHAR(50) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `supervisor_id` INTEGER NULL,
    `approved_at` TIMESTAMP(0) NULL,
    `rejection_reason` TEXT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `current_step` INTEGER NOT NULL DEFAULT 1,
    `total_steps` INTEGER NOT NULL DEFAULT 1,
    `workflow_id` INTEGER NULL,

    UNIQUE INDEX `tbl_approval_requests_request_number_key`(`request_number`),
    INDEX `tbl_approval_requests_request_type_idx`(`request_type`),
    INDEX `tbl_approval_requests_status_idx`(`status`),
    INDEX `tbl_approval_requests_workflow_id_idx`(`workflow_id`),
    PRIMARY KEY (`request_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_approval_workflows` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `workflow_name` VARCHAR(100) NOT NULL,
    `request_type` VARCHAR(50) NOT NULL,
    `condition_field` VARCHAR(50) NULL,
    `condition_op` VARCHAR(10) NULL,
    `condition_value` VARCHAR(50) NULL,
    `total_steps` INTEGER NOT NULL DEFAULT 1,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `tbl_approval_workflows_request_type_active_idx`(`request_type`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_approval_workflow_steps` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `workflow_id` INTEGER NOT NULL,
    `step_order` INTEGER NOT NULL,
    `approver_role` VARCHAR(50) NOT NULL,
    `approver_id` INTEGER NULL,

    INDEX `tbl_approval_workflow_steps_workflow_id_idx`(`workflow_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_approval_step_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `request_id` INTEGER NOT NULL,
    `step_order` INTEGER NOT NULL,
    `action` VARCHAR(20) NOT NULL,
    `acted_by` INTEGER NOT NULL,
    `acted_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `comment` TEXT NULL,

    INDEX `tbl_approval_step_logs_request_id_idx`(`request_id`),
    INDEX `tbl_approval_step_logs_acted_by_idx`(`acted_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tbl_action_log` ADD CONSTRAINT `fk_action_log_products` FOREIGN KEY (`p_id`) REFERENCES `tbl_products`(`p_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `tbl_maintenance_history` ADD CONSTRAINT `tbl_maintenance_history_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `tbl_maintenance_requests`(`request_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_maintenance_parts` ADD CONSTRAINT `tbl_maintenance_parts_p_id_fkey` FOREIGN KEY (`p_id`) REFERENCES `tbl_products`(`p_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_maintenance_parts` ADD CONSTRAINT `tbl_maintenance_parts_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `tbl_maintenance_requests`(`request_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_maintenance_requests` ADD CONSTRAINT `tbl_maintenance_requests_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `tbl_rooms`(`room_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_part_requests` ADD CONSTRAINT `tbl_part_requests_maintenance_id_fkey` FOREIGN KEY (`maintenance_id`) REFERENCES `tbl_maintenance_requests`(`request_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_pm_plans` ADD CONSTRAINT `tbl_pm_plans_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `tbl_rooms`(`room_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_product_movements` ADD CONSTRAINT `fk_product_movements_products` FOREIGN KEY (`p_id`) REFERENCES `tbl_products`(`p_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_stock_movements` ADD CONSTRAINT `tbl_stock_movements_ibfk_1` FOREIGN KEY (`p_id`) REFERENCES `tbl_products`(`p_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `tbl_system_logs` ADD CONSTRAINT `tbl_system_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `tbl_users`(`p_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_approval_requests` ADD CONSTRAINT `tbl_approval_requests_requested_by_fkey` FOREIGN KEY (`requested_by`) REFERENCES `tbl_users`(`p_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_approval_requests` ADD CONSTRAINT `tbl_approval_requests_supervisor_id_fkey` FOREIGN KEY (`supervisor_id`) REFERENCES `tbl_users`(`p_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_approval_requests` ADD CONSTRAINT `tbl_approval_requests_workflow_id_fkey` FOREIGN KEY (`workflow_id`) REFERENCES `tbl_approval_workflows`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_approval_workflow_steps` ADD CONSTRAINT `tbl_approval_workflow_steps_workflow_id_fkey` FOREIGN KEY (`workflow_id`) REFERENCES `tbl_approval_workflows`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_approval_step_logs` ADD CONSTRAINT `tbl_approval_step_logs_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `tbl_approval_requests`(`request_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_approval_step_logs` ADD CONSTRAINT `tbl_approval_step_logs_acted_by_fkey` FOREIGN KEY (`acted_by`) REFERENCES `tbl_users`(`p_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
