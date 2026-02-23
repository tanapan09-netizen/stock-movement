-- CreateTable
CREATE TABLE `audit_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `p_id` VARCHAR(50) NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `username` VARCHAR(100) NOT NULL,
    `details` TEXT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `actor_user_id` INTEGER NULL,
    `action_type` VARCHAR(100) NOT NULL,
    `object_type` VARCHAR(50) NOT NULL,
    `object_id` INTEGER NULL,
    `data` LONGTEXT NULL,
    `created_at` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `borrow_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `borrow_request_id` INTEGER NOT NULL,
    `p_id` VARCHAR(50) NOT NULL,
    `qty` INTEGER NOT NULL,
    `unit` VARCHAR(50) NULL,

    INDEX `borrow_request_id`(`borrow_request_id`),
    INDEX `p_id`(`p_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `borrow_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `borrower_name` VARCHAR(191) NOT NULL,
    `borrower_id` VARCHAR(100) NULL,
    `note` TEXT NULL,
    `status` ENUM('pending', 'approved', 'returned', 'cancelled') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `logout_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `logout_time` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_action_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `action` TEXT NOT NULL,
    `p_id` VARCHAR(50) NOT NULL,
    `log_time` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `ip_address` VARCHAR(45) NULL DEFAULT 'unknown',
    `description` TEXT NULL,
    `log_date` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `borrow_status` BOOLEAN NOT NULL DEFAULT false,
    `quantity` INTEGER NOT NULL,
    `remarks` TEXT NULL,
    `details` TEXT NULL,

    INDEX `fk_action_log_products`(`p_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_admin` (
    `admin_id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(100) NOT NULL,
    `password` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`admin_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_admin_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `admin_username` VARCHAR(50) NOT NULL,
    `action` TEXT NOT NULL,
    `log_time` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_api_keys` (
    `key_id` INTEGER NOT NULL AUTO_INCREMENT,
    `key_name` VARCHAR(100) NOT NULL,
    `api_key` VARCHAR(64) NOT NULL,
    `description` TEXT NULL,
    `permissions` LONGTEXT NULL,
    `active` BOOLEAN NULL DEFAULT true,
    `usage_count` INTEGER NULL DEFAULT 0,
    `last_used` TIMESTAMP(0) NULL,
    `expires_at` TIMESTAMP(0) NULL,
    `created_by` VARCHAR(50) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `api_key`(`api_key`),
    PRIMARY KEY (`key_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_audit_items` (
    `item_id` INTEGER NOT NULL AUTO_INCREMENT,
    `audit_id` INTEGER NOT NULL,
    `p_id` VARCHAR(50) NOT NULL,
    `system_qty` INTEGER NOT NULL DEFAULT 0,
    `counted_qty` INTEGER NULL,
    `discrepancy` INTEGER NULL,
    `notes` VARCHAR(255) NULL,
    `counted_at` TIMESTAMP(0) NULL,

    INDEX `audit_id`(`audit_id`),
    INDEX `p_id`(`p_id`),
    PRIMARY KEY (`item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_borrow_items` (
    `item_id` INTEGER NOT NULL AUTO_INCREMENT,
    `borrow_id` INTEGER NOT NULL,
    `p_id` VARCHAR(50) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `returned_qty` INTEGER NULL DEFAULT 0,
    `condition_out` ENUM('ดี', 'พอใช้', 'ชำรุด') NULL DEFAULT 'ดี',
    `condition_in` ENUM('ดี', 'พอใช้', 'ชำรุด', 'สูญหาย') NULL,
    `notes` VARCHAR(255) NULL,

    PRIMARY KEY (`item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_borrow_requests` (
    `borrow_id` INTEGER NOT NULL AUTO_INCREMENT,
    `borrow_number` VARCHAR(50) NOT NULL,
    `borrower_name` VARCHAR(100) NOT NULL,
    `department` VARCHAR(100) NULL,
    `purpose` TEXT NULL,
    `borrow_date` DATE NOT NULL,
    `expected_return_date` DATE NULL,
    `actual_return_date` DATE NULL,
    `status` ENUM('pending', 'approved', 'borrowed', 'partial_return', 'returned', 'overdue', 'cancelled') NULL DEFAULT 'pending',
    `notes` TEXT NULL,
    `created_by` VARCHAR(50) NULL,
    `approved_by` VARCHAR(50) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `borrow_number`(`borrow_number`),
    PRIMARY KEY (`borrow_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_categories` (
    `cat_id` INTEGER NOT NULL AUTO_INCREMENT,
    `cat_name` VARCHAR(255) NOT NULL,
    `cat_desc` TEXT NULL,

    PRIMARY KEY (`cat_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_inventory_audits` (
    `audit_id` INTEGER NOT NULL AUTO_INCREMENT,
    `audit_number` VARCHAR(50) NULL,
    `audit_date` DATE NULL,
    `warehouse_id` INTEGER NULL,
    `status` ENUM('draft', 'in_progress', 'completed', 'cancelled') NULL DEFAULT 'draft',
    `notes` TEXT NULL,
    `total_items` INTEGER NULL DEFAULT 0,
    `total_discrepancy` INTEGER NULL DEFAULT 0,
    `created_by` VARCHAR(50) NULL,
    `completed_by` VARCHAR(50) NULL,
    `completed_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `audit_number`(`audit_number`),
    PRIMARY KEY (`audit_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_po_items` (
    `item_id` INTEGER NOT NULL AUTO_INCREMENT,
    `po_id` INTEGER NOT NULL,
    `p_id` VARCHAR(50) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `unit_price` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `line_total` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `received_qty` INTEGER NULL DEFAULT 0,
    `notes` VARCHAR(255) NULL,

    PRIMARY KEY (`item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_product_movements` (
    `movement_id` INTEGER NOT NULL AUTO_INCREMENT,
    `warehouse_id` INTEGER NULL,
    `p_id` VARCHAR(50) NOT NULL,
    `username` VARCHAR(100) NOT NULL,
    `movement_type` VARCHAR(50) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `remarks` TEXT NULL,
    `movement_time` DATETIME(0) NOT NULL,

    INDEX `idx_pm_movement_time`(`movement_time`),
    INDEX `idx_pm_movement_type`(`movement_type`),
    INDEX `idx_pm_p_id`(`p_id`),
    INDEX `p_id`(`p_id`),
    PRIMARY KEY (`movement_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_products` (
    `p_id` VARCHAR(50) NOT NULL,
    `type_name` VARCHAR(100) NULL,
    `cat_id` INTEGER NULL,
    `main_category` VARCHAR(50) NULL,
    `p_name` VARCHAR(255) NOT NULL,
    `p_desc` TEXT NULL,
    `supplier` VARCHAR(255) NULL,
    `p_sku` VARCHAR(50) NULL,
    `p_unit` VARCHAR(20) NULL DEFAULT 'ชิ้น',
    `p_count` INTEGER NOT NULL,
    `expiry_date` DATE NULL,
    `batch_number` VARCHAR(50) NULL,
    `price_unit` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `safety_stock` INTEGER NOT NULL,
    `p_image` VARCHAR(255) NULL,
    `active` BOOLEAN NULL DEFAULT true,
    `order_number` INTEGER NULL,
    `created_at` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `p_name`(`p_name`),
    INDEX `fk_products_category`(`cat_id`),
    INDEX `idx_p_p_id`(`p_id`),
    INDEX `idx_p_p_name`(`p_name`),
    PRIMARY KEY (`p_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_purchase_orders` (
    `po_id` INTEGER NOT NULL AUTO_INCREMENT,
    `po_number` VARCHAR(50) NOT NULL,
    `supplier_id` INTEGER NULL,
    `status` ENUM('draft', 'pending', 'approved', 'ordered', 'partial', 'received', 'cancelled') NULL DEFAULT 'draft',
    `order_date` DATE NULL,
    `expected_date` DATE NULL,
    `received_date` DATE NULL,
    `subtotal` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `tax_amount` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `total_amount` DECIMAL(12, 2) NULL DEFAULT 0.00,
    `notes` TEXT NULL,
    `created_by` VARCHAR(50) NULL,
    `approved_by` VARCHAR(50) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `po_number`(`po_number`),
    PRIMARY KEY (`po_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_roles` (
    `role_id` INTEGER NOT NULL AUTO_INCREMENT,
    `role_name` VARCHAR(50) NOT NULL,
    `role_description` VARCHAR(255) NULL,
    `permissions` LONGTEXT NULL,
    `is_system` BOOLEAN NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `role_name`(`role_name`),
    PRIMARY KEY (`role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_stock_movements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `p_id` VARCHAR(50) NOT NULL,
    `username` VARCHAR(100) NOT NULL,
    `movement_type` VARCHAR(50) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `remarks` TEXT NULL,
    `movement_time` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `p_id`(`p_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_stock_transfers` (
    `transfer_id` INTEGER NOT NULL AUTO_INCREMENT,
    `transfer_number` VARCHAR(50) NULL,
    `from_warehouse_id` INTEGER NOT NULL,
    `to_warehouse_id` INTEGER NOT NULL,
    `status` ENUM('pending', 'in_transit', 'received', 'cancelled') NULL DEFAULT 'pending',
    `transfer_date` DATE NULL,
    `received_date` DATE NULL,
    `notes` TEXT NULL,
    `created_by` VARCHAR(50) NULL,
    `received_by` VARCHAR(50) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `transfer_number`(`transfer_number`),
    INDEX `from_warehouse_id`(`from_warehouse_id`),
    INDEX `to_warehouse_id`(`to_warehouse_id`),
    PRIMARY KEY (`transfer_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_suppliers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `contact_name` VARCHAR(255) NULL,
    `phone` VARCHAR(50) NULL,
    `email` VARCHAR(100) NULL,
    `address` TEXT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_transfer_items` (
    `item_id` INTEGER NOT NULL AUTO_INCREMENT,
    `transfer_id` INTEGER NOT NULL,
    `p_id` VARCHAR(50) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `received_qty` INTEGER NULL DEFAULT 0,

    INDEX `p_id`(`p_id`),
    INDEX `transfer_id`(`transfer_id`),
    PRIMARY KEY (`item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_users` (
    `p_id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `role_id` INTEGER NULL DEFAULT 3,
    `password` VARCHAR(255) NOT NULL,
    `role` VARCHAR(50) NOT NULL DEFAULT 'employee',
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `username`(`username`),
    PRIMARY KEY (`p_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_warehouse_stock` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `warehouse_id` INTEGER NOT NULL,
    `p_id` VARCHAR(50) NOT NULL,
    `quantity` INTEGER NULL DEFAULT 0,
    `min_stock` INTEGER NULL DEFAULT 0,
    `last_updated` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `p_id`(`p_id`),
    UNIQUE INDEX `unique_warehouse_product`(`warehouse_id`, `p_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_warehouses` (
    `warehouse_id` INTEGER NOT NULL AUTO_INCREMENT,
    `warehouse_code` VARCHAR(20) NULL,
    `warehouse_name` VARCHAR(100) NOT NULL,
    `location` VARCHAR(255) NULL,
    `manager` VARCHAR(100) NULL,
    `phone` VARCHAR(20) NULL,
    `is_default` BOOLEAN NULL DEFAULT false,
    `active` BOOLEAN NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `warehouse_code`(`warehouse_code`),
    PRIMARY KEY (`warehouse_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(100) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'staff', 'user') NOT NULL DEFAULT 'user',
    `display_name` VARCHAR(191) NULL,
    `created_at` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `username`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_assets` (
    `asset_id` INTEGER NOT NULL AUTO_INCREMENT,
    `asset_code` VARCHAR(50) NOT NULL,
    `asset_name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(100) NOT NULL,
    `purchase_date` DATE NOT NULL,
    `purchase_price` DECIMAL(10, 2) NOT NULL,
    `useful_life_years` INTEGER NOT NULL,
    `salvage_value` DECIMAL(10, 2) NOT NULL DEFAULT 1,
    `location` VARCHAR(100) NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'Active',
    `image_url` VARCHAR(255) NULL,
    `vendor` VARCHAR(255) NULL,
    `brand` VARCHAR(100) NULL,
    `model` VARCHAR(100) NULL,
    `serial_number` VARCHAR(100) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `asset_code`(`asset_code`),
    PRIMARY KEY (`asset_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_asset_history` (
    `history_id` INTEGER NOT NULL AUTO_INCREMENT,
    `asset_id` INTEGER NOT NULL,
    `action_type` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `cost` DECIMAL(10, 2) NULL DEFAULT 0,
    `performed_by` VARCHAR(100) NULL,
    `action_date` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_asset_history_asset`(`asset_id`),
    PRIMARY KEY (`history_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `borrow_items` ADD CONSTRAINT `borrow_items_ibfk_1` FOREIGN KEY (`borrow_request_id`) REFERENCES `borrow_requests`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `tbl_audit_items` ADD CONSTRAINT `tbl_audit_items_ibfk_1` FOREIGN KEY (`audit_id`) REFERENCES `tbl_inventory_audits`(`audit_id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `tbl_products` ADD CONSTRAINT `fk_products_category` FOREIGN KEY (`cat_id`) REFERENCES `tbl_categories`(`cat_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `tbl_stock_transfers` ADD CONSTRAINT `tbl_stock_transfers_ibfk_1` FOREIGN KEY (`from_warehouse_id`) REFERENCES `tbl_warehouses`(`warehouse_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `tbl_stock_transfers` ADD CONSTRAINT `tbl_stock_transfers_ibfk_2` FOREIGN KEY (`to_warehouse_id`) REFERENCES `tbl_warehouses`(`warehouse_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `tbl_transfer_items` ADD CONSTRAINT `tbl_transfer_items_ibfk_1` FOREIGN KEY (`transfer_id`) REFERENCES `tbl_stock_transfers`(`transfer_id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `tbl_warehouse_stock` ADD CONSTRAINT `tbl_warehouse_stock_ibfk_1` FOREIGN KEY (`warehouse_id`) REFERENCES `tbl_warehouses`(`warehouse_id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `tbl_asset_history` ADD CONSTRAINT `tbl_asset_history_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `tbl_assets`(`asset_id`) ON DELETE CASCADE ON UPDATE CASCADE;
