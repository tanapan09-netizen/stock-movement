-- Add user-id ownership for purchase orders
ALTER TABLE `tbl_purchase_orders`
  ADD COLUMN `created_by_user_id` INT NULL AFTER `supplier_id`;

CREATE INDEX `idx_po_created_by_user_id`
  ON `tbl_purchase_orders` (`created_by_user_id`);

-- Best-effort backfill from existing creator string (assumes created_by stored username)
UPDATE `tbl_purchase_orders` po
LEFT JOIN `tbl_users` u ON u.`username` = po.`created_by`
SET po.`created_by_user_id` = u.`p_id`
WHERE po.`created_by_user_id` IS NULL;