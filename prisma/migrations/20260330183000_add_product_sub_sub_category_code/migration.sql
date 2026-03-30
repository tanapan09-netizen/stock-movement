ALTER TABLE `tbl_products`
  ADD COLUMN `sub_sub_category_code` VARCHAR(50) NULL AFTER `sub_category_code`,
  ADD INDEX `idx_products_sub_sub_category_code` (`sub_sub_category_code`);
