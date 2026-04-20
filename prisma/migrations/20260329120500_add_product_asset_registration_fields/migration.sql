ALTER TABLE `tbl_products`
  ADD COLUMN `main_category_code` VARCHAR(50) NULL AFTER `main_category`,
  ADD COLUMN `sub_category_code` VARCHAR(50) NULL AFTER `main_category_code`,
  ADD COLUMN `is_asset` BOOLEAN NULL DEFAULT false AFTER `is_luxury`,
  ADD COLUMN `asset_current_location` VARCHAR(255) NULL AFTER `is_asset`,
  ADD INDEX `idx_products_main_category_code` (`main_category_code`),
  ADD INDEX `idx_products_sub_category_code` (`sub_category_code`),
  ADD INDEX `idx_products_is_asset` (`is_asset`);

