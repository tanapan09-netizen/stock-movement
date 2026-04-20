-- AlterTable
ALTER TABLE `tbl_line_customers`
    ADD COLUMN `room_number` VARCHAR(50) NULL;

-- CreateIndex
CREATE INDEX `idx_line_customer_room` ON `tbl_line_customers`(`room_number`);
