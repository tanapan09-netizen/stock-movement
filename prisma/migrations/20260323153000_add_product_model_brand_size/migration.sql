-- AlterTable
ALTER TABLE `tbl_products`
  ADD COLUMN `model_name` VARCHAR(100) NULL,
  ADD COLUMN `brand_name` VARCHAR(100) NULL,
  ADD COLUMN `brand_code` VARCHAR(50) NULL,
  ADD COLUMN `size` VARCHAR(100) NULL;

