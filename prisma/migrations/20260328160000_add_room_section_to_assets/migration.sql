ALTER TABLE `tbl_assets`
  ADD COLUMN `room_section` VARCHAR(100) NULL AFTER `location`,
  ADD INDEX `idx_assets_room_section` (`room_section`);

