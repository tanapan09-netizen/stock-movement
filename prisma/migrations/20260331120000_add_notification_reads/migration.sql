CREATE TABLE `tbl_notification_reads` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `notification_id` VARCHAR(191) NOT NULL,
  `read_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uniq_notification_reads_user_notification` (`user_id`, `notification_id`),
  INDEX `idx_notification_reads_user` (`user_id`),
  INDEX `idx_notification_reads_read_at` (`read_at`),
  CONSTRAINT `tbl_notification_reads_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `tbl_users`(`p_id`)
    ON DELETE CASCADE ON UPDATE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
