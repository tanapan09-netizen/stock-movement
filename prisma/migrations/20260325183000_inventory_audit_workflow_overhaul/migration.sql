ALTER TABLE `tbl_inventory_audits`
  MODIFY COLUMN `status` ENUM('draft', 'in_progress', 'completed', 'frozen', 'counting', 'review', 'approved', 'posted', 'cancelled') NULL DEFAULT 'draft';

UPDATE `tbl_inventory_audits`
SET `status` = CASE
  WHEN `status` = 'in_progress' THEN 'counting'
  WHEN `status` = 'completed' THEN 'posted'
  ELSE `status`
END;

ALTER TABLE `tbl_inventory_audits`
  ADD COLUMN `total_variance_qty` INT NULL DEFAULT 0 AFTER `total_discrepancy`,
  ADD COLUMN `total_variance_abs` INT NULL DEFAULT 0 AFTER `total_variance_qty`,
  ADD COLUMN `total_variance_value` DECIMAL(12,2) NULL DEFAULT 0.00 AFTER `total_variance_abs`,
  ADD COLUMN `recounted_items` INT NULL DEFAULT 0 AFTER `total_variance_value`,
  ADD COLUMN `reason_pending_items` INT NULL DEFAULT 0 AFTER `recounted_items`,
  ADD COLUMN `started_by` VARCHAR(50) NULL AFTER `created_by`,
  ADD COLUMN `reviewed_by` VARCHAR(50) NULL AFTER `started_by`,
  ADD COLUMN `approved_by` VARCHAR(50) NULL AFTER `reviewed_by`,
  ADD COLUMN `posted_by` VARCHAR(50) NULL AFTER `approved_by`,
  ADD COLUMN `started_at` TIMESTAMP NULL AFTER `completed_at`,
  ADD COLUMN `frozen_at` TIMESTAMP NULL AFTER `started_at`,
  ADD COLUMN `reviewed_at` TIMESTAMP NULL AFTER `frozen_at`,
  ADD COLUMN `approved_at` TIMESTAMP NULL AFTER `reviewed_at`,
  ADD COLUMN `posted_at` TIMESTAMP NULL AFTER `approved_at`;

ALTER TABLE `tbl_inventory_audits`
  MODIFY COLUMN `status` ENUM('draft', 'frozen', 'counting', 'review', 'approved', 'posted', 'cancelled') NULL DEFAULT 'draft';

ALTER TABLE `tbl_inventory_audits`
  ADD INDEX `warehouse_id` (`warehouse_id`),
  ADD CONSTRAINT `tbl_inventory_audits_ibfk_1`
    FOREIGN KEY (`warehouse_id`) REFERENCES `tbl_warehouses`(`warehouse_id`)
    ON DELETE SET NULL ON UPDATE RESTRICT;

ALTER TABLE `tbl_audit_items`
  ADD COLUMN `snapshot_qty` INT NOT NULL DEFAULT 0 AFTER `p_id`,
  ADD COLUMN `first_count_qty` INT NULL AFTER `counted_qty`,
  ADD COLUMN `recount_qty` INT NULL AFTER `first_count_qty`,
  ADD COLUMN `final_count_qty` INT NULL AFTER `recount_qty`,
  ADD COLUMN `variance_qty` INT NULL AFTER `discrepancy`,
  ADD COLUMN `variance_value` DECIMAL(12,2) NULL DEFAULT 0.00 AFTER `variance_qty`,
  ADD COLUMN `reason_code` VARCHAR(50) NULL AFTER `notes`,
  ADD COLUMN `reason_note` TEXT NULL AFTER `reason_code`,
  ADD COLUMN `movement_delta_qty` INT NULL DEFAULT 0 AFTER `reason_note`,
  ADD COLUMN `approved_adjustment_qty` INT NULL DEFAULT 0 AFTER `movement_delta_qty`,
  ADD COLUMN `item_status` VARCHAR(30) NULL DEFAULT 'pending' AFTER `approved_adjustment_qty`,
  ADD COLUMN `requires_recount` BOOLEAN NULL DEFAULT FALSE AFTER `item_status`,
  ADD COLUMN `counted_by` VARCHAR(100) NULL AFTER `requires_recount`,
  ADD COLUMN `recounted_by` VARCHAR(100) NULL AFTER `counted_by`,
  ADD COLUMN `reviewed_at` TIMESTAMP NULL AFTER `counted_at`,
  ADD COLUMN `posted_at` TIMESTAMP NULL AFTER `reviewed_at`,
  ADD INDEX `idx_audit_items_status` (`item_status`);

UPDATE `tbl_audit_items`
SET
  `snapshot_qty` = COALESCE(`system_qty`, 0),
  `first_count_qty` = `counted_qty`,
  `final_count_qty` = `counted_qty`,
  `variance_qty` = `discrepancy`,
  `variance_value` = 0.00,
  `approved_adjustment_qty` = COALESCE(`discrepancy`, 0),
  `item_status` = CASE
    WHEN `counted_qty` IS NULL THEN 'pending'
    WHEN COALESCE(`discrepancy`, 0) = 0 THEN 'matched'
    ELSE 'variance'
  END;

CREATE TABLE `tbl_inventory_audit_events` (
  `event_id` INT NOT NULL AUTO_INCREMENT,
  `audit_id` INT NOT NULL,
  `item_id` INT NULL,
  `event_type` VARCHAR(50) NOT NULL,
  `event_label` VARCHAR(100) NULL,
  `from_status` VARCHAR(50) NULL,
  `to_status` VARCHAR(50) NULL,
  `old_value` INT NULL,
  `new_value` INT NULL,
  `note` TEXT NULL,
  `reason_code` VARCHAR(50) NULL,
  `metadata` TEXT NULL,
  `performed_by` VARCHAR(100) NULL,
  `performed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ip_address` VARCHAR(45) NULL,
  PRIMARY KEY (`event_id`),
  INDEX `audit_id` (`audit_id`),
  INDEX `event_type` (`event_type`),
  INDEX `item_id` (`item_id`),
  INDEX `performed_at` (`performed_at`),
  CONSTRAINT `tbl_inventory_audit_events_ibfk_1`
    FOREIGN KEY (`audit_id`) REFERENCES `tbl_inventory_audits`(`audit_id`)
    ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `tbl_inventory_audit_events_ibfk_2`
    FOREIGN KEY (`item_id`) REFERENCES `tbl_audit_items`(`item_id`)
    ON DELETE SET NULL ON UPDATE RESTRICT
);
