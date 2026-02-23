-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: stock_db
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `_prisma_migrations`
--

DROP TABLE IF EXISTS `_prisma_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) NOT NULL,
  `checksum` varchar(64) NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) NOT NULL,
  `logs` text DEFAULT NULL,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `applied_steps_count` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_prisma_migrations`
--

LOCK TABLES `_prisma_migrations` WRITE;
/*!40000 ALTER TABLE `_prisma_migrations` DISABLE KEYS */;
INSERT INTO `_prisma_migrations` VALUES ('df9ff867-48c7-4afd-b2a4-c24a9d1b7c9d','c2f60b01e100e4f641b800667b4a0d860e7d1917e4f666782776b6f54b964cbe','2025-12-25 15:20:42.092','20251225152041_add_vendor_details',NULL,NULL,'2025-12-25 15:20:41.575',1);
/*!40000 ALTER TABLE `_prisma_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `app_settings`
--

DROP TABLE IF EXISTS `app_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `app_settings` (
  `k` varchar(100) NOT NULL,
  `v` longtext NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`k`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `app_settings`
--

LOCK TABLES `app_settings` WRITE;
/*!40000 ALTER TABLE `app_settings` DISABLE KEYS */;
/*!40000 ALTER TABLE `app_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_log`
--

DROP TABLE IF EXISTS `audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audit_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `p_id` varchar(50) NOT NULL,
  `action` varchar(50) NOT NULL,
  `username` varchar(100) NOT NULL,
  `details` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_log`
--

LOCK TABLES `audit_log` WRITE;
/*!40000 ALTER TABLE `audit_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `actor_user_id` int(11) DEFAULT NULL,
  `action_type` varchar(100) NOT NULL,
  `object_type` varchar(50) NOT NULL,
  `object_id` int(11) DEFAULT NULL,
  `data` longtext DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `borrow_items`
--

DROP TABLE IF EXISTS `borrow_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `borrow_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `borrow_request_id` int(11) NOT NULL,
  `p_id` varchar(50) NOT NULL,
  `qty` int(11) NOT NULL,
  `unit` varchar(50) DEFAULT NULL,
  `returned_at` datetime DEFAULT NULL,
  `returned_qty` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `borrow_request_id` (`borrow_request_id`),
  KEY `p_id` (`p_id`),
  CONSTRAINT `borrow_items_ibfk_1` FOREIGN KEY (`borrow_request_id`) REFERENCES `borrow_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `borrow_items`
--

LOCK TABLES `borrow_items` WRITE;
/*!40000 ALTER TABLE `borrow_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `borrow_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `borrow_requests`
--

DROP TABLE IF EXISTS `borrow_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `borrow_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `borrower_name` varchar(191) NOT NULL,
  `borrower_id` varchar(100) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `status` enum('pending','approved','returned','cancelled') NOT NULL DEFAULT 'pending',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp(),
  `returned_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `borrow_requests`
--

LOCK TABLES `borrow_requests` WRITE;
/*!40000 ALTER TABLE `borrow_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `borrow_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `logout_logs`
--

DROP TABLE IF EXISTS `logout_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `logout_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `logout_time` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `logout_logs`
--

LOCK TABLES `logout_logs` WRITE;
/*!40000 ALTER TABLE `logout_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `logout_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_action_log`
--

DROP TABLE IF EXISTS `tbl_action_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_action_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `action` text NOT NULL,
  `p_id` varchar(50) DEFAULT NULL,
  `log_time` datetime DEFAULT current_timestamp(),
  `ip_address` varchar(45) DEFAULT 'unknown',
  `description` text DEFAULT NULL,
  `log_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `borrow_status` tinyint(1) NOT NULL DEFAULT 0,
  `quantity` int(11) NOT NULL,
  `remarks` text DEFAULT NULL,
  `details` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_action_log_products` (`p_id`),
  CONSTRAINT `fk_action_log_products` FOREIGN KEY (`p_id`) REFERENCES `tbl_products` (`p_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_action_log`
--

LOCK TABLES `tbl_action_log` WRITE;
/*!40000 ALTER TABLE `tbl_action_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_action_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_admin`
--

DROP TABLE IF EXISTS `tbl_admin`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_admin` (
  `admin_id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  PRIMARY KEY (`admin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_admin`
--

LOCK TABLES `tbl_admin` WRITE;
/*!40000 ALTER TABLE `tbl_admin` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_admin` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_admin_log`
--

DROP TABLE IF EXISTS `tbl_admin_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_admin_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `admin_username` varchar(50) NOT NULL,
  `action` text NOT NULL,
  `log_time` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_admin_log`
--

LOCK TABLES `tbl_admin_log` WRITE;
/*!40000 ALTER TABLE `tbl_admin_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_admin_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_api_keys`
--

DROP TABLE IF EXISTS `tbl_api_keys`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_api_keys` (
  `key_id` int(11) NOT NULL AUTO_INCREMENT,
  `key_name` varchar(100) NOT NULL,
  `api_key` varchar(64) NOT NULL,
  `description` text DEFAULT NULL,
  `permissions` longtext DEFAULT NULL,
  `active` tinyint(1) DEFAULT 1,
  `usage_count` int(11) DEFAULT 0,
  `last_used` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`key_id`),
  UNIQUE KEY `api_key` (`api_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_api_keys`
--

LOCK TABLES `tbl_api_keys` WRITE;
/*!40000 ALTER TABLE `tbl_api_keys` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_api_keys` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_asset_history`
--

DROP TABLE IF EXISTS `tbl_asset_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_asset_history` (
  `history_id` int(11) NOT NULL AUTO_INCREMENT,
  `asset_id` int(11) NOT NULL,
  `action_type` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `cost` decimal(10,2) DEFAULT 0.00,
  `performed_by` varchar(100) DEFAULT NULL,
  `action_date` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`history_id`),
  KEY `fk_asset_history_asset` (`asset_id`),
  CONSTRAINT `tbl_asset_history_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `tbl_assets` (`asset_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_asset_history`
--

LOCK TABLES `tbl_asset_history` WRITE;
/*!40000 ALTER TABLE `tbl_asset_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_asset_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_assets`
--

DROP TABLE IF EXISTS `tbl_assets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_assets` (
  `asset_id` int(11) NOT NULL AUTO_INCREMENT,
  `asset_code` varchar(50) NOT NULL,
  `asset_name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `category` varchar(100) NOT NULL,
  `purchase_date` date NOT NULL,
  `purchase_price` decimal(10,2) NOT NULL,
  `useful_life_years` int(11) NOT NULL,
  `salvage_value` decimal(10,2) NOT NULL DEFAULT 1.00,
  `location` varchar(100) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'Active',
  `image_url` varchar(255) DEFAULT NULL,
  `vendor` varchar(255) DEFAULT NULL,
  `brand` varchar(100) DEFAULT NULL,
  `model` varchar(100) DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`asset_id`),
  UNIQUE KEY `asset_code` (`asset_code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_assets`
--

LOCK TABLES `tbl_assets` WRITE;
/*!40000 ALTER TABLE `tbl_assets` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_assets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_audit_items`
--

DROP TABLE IF EXISTS `tbl_audit_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_audit_items` (
  `item_id` int(11) NOT NULL AUTO_INCREMENT,
  `audit_id` int(11) NOT NULL,
  `p_id` varchar(50) NOT NULL,
  `system_qty` int(11) NOT NULL DEFAULT 0,
  `counted_qty` int(11) DEFAULT NULL,
  `discrepancy` int(11) DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `counted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`item_id`),
  KEY `audit_id` (`audit_id`),
  KEY `p_id` (`p_id`),
  CONSTRAINT `tbl_audit_items_ibfk_1` FOREIGN KEY (`audit_id`) REFERENCES `tbl_inventory_audits` (`audit_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_audit_items`
--

LOCK TABLES `tbl_audit_items` WRITE;
/*!40000 ALTER TABLE `tbl_audit_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_audit_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_borrow_items`
--

DROP TABLE IF EXISTS `tbl_borrow_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_borrow_items` (
  `item_id` int(11) NOT NULL AUTO_INCREMENT,
  `borrow_id` int(11) NOT NULL,
  `p_id` varchar(50) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `returned_qty` int(11) DEFAULT 0,
  `condition_out` enum('ดี','พอใช้','ชำรุด') DEFAULT 'ดี',
  `condition_in` enum('ดี','พอใช้','ชำรุด','สูญหาย') DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_borrow_items`
--

LOCK TABLES `tbl_borrow_items` WRITE;
/*!40000 ALTER TABLE `tbl_borrow_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_borrow_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_borrow_requests`
--

DROP TABLE IF EXISTS `tbl_borrow_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_borrow_requests` (
  `borrow_id` int(11) NOT NULL AUTO_INCREMENT,
  `borrow_number` varchar(50) NOT NULL,
  `borrower_name` varchar(100) NOT NULL,
  `department` varchar(100) DEFAULT NULL,
  `purpose` text DEFAULT NULL,
  `borrow_date` date NOT NULL,
  `expected_return_date` date DEFAULT NULL,
  `actual_return_date` date DEFAULT NULL,
  `status` enum('pending','approved','borrowed','partial_return','returned','overdue','cancelled') DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `approved_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`borrow_id`),
  UNIQUE KEY `borrow_number` (`borrow_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_borrow_requests`
--

LOCK TABLES `tbl_borrow_requests` WRITE;
/*!40000 ALTER TABLE `tbl_borrow_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_borrow_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_categories`
--

DROP TABLE IF EXISTS `tbl_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_categories` (
  `cat_id` int(11) NOT NULL AUTO_INCREMENT,
  `cat_name` varchar(255) NOT NULL,
  `cat_desc` text DEFAULT NULL,
  PRIMARY KEY (`cat_id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_categories`
--

LOCK TABLES `tbl_categories` WRITE;
/*!40000 ALTER TABLE `tbl_categories` DISABLE KEYS */;
INSERT INTO `tbl_categories` VALUES (1,'Office',NULL),(2,'เครื่องใช้',NULL),(3,'เครื่องปรับอากาศ',NULL),(4,'แม่บ้าน',NULL),(5,'ไฟฟ้า',NULL),(6,'งานช่าง',NULL),(7,'ประปา',NULL),(8,'สวน',NULL),(9,'สิ่งทอ',NULL),(10,'อุปกรณ์',NULL),(11,'แบตเตอรี่',NULL),(12,'ปะปา',NULL),(13,'เครื่องใช้ไฟฟ้า',NULL),(14,'Furniture',NULL);
/*!40000 ALTER TABLE `tbl_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_inventory_audits`
--

DROP TABLE IF EXISTS `tbl_inventory_audits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_inventory_audits` (
  `audit_id` int(11) NOT NULL AUTO_INCREMENT,
  `audit_number` varchar(50) DEFAULT NULL,
  `audit_date` date DEFAULT NULL,
  `warehouse_id` int(11) DEFAULT NULL,
  `status` enum('draft','in_progress','completed','cancelled') DEFAULT 'draft',
  `notes` text DEFAULT NULL,
  `total_items` int(11) DEFAULT 0,
  `total_discrepancy` int(11) DEFAULT 0,
  `created_by` varchar(50) DEFAULT NULL,
  `completed_by` varchar(50) DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`audit_id`),
  UNIQUE KEY `audit_number` (`audit_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_inventory_audits`
--

LOCK TABLES `tbl_inventory_audits` WRITE;
/*!40000 ALTER TABLE `tbl_inventory_audits` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_inventory_audits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_line_users`
--

DROP TABLE IF EXISTS `tbl_line_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_line_users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `line_user_id` varchar(255) NOT NULL,
  `display_name` varchar(255) DEFAULT NULL,
  `picture_url` varchar(500) DEFAULT NULL,
  `is_approver` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `last_interaction` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `tbl_line_users_line_user_id_key` (`line_user_id`),
  KEY `idx_line_user_id` (`line_user_id`),
  KEY `idx_is_approver` (`is_approver`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_line_users`
--

LOCK TABLES `tbl_line_users` WRITE;
/*!40000 ALTER TABLE `tbl_line_users` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_line_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_maintenance_history`
--

DROP TABLE IF EXISTS `tbl_maintenance_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_maintenance_history` (
  `history_id` int(11) NOT NULL AUTO_INCREMENT,
  `request_id` int(11) NOT NULL,
  `action` varchar(100) NOT NULL,
  `old_value` text DEFAULT NULL,
  `new_value` text DEFAULT NULL,
  `changed_by` varchar(100) NOT NULL,
  `changed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`history_id`),
  KEY `tbl_maintenance_history_request_id_idx` (`request_id`),
  CONSTRAINT `tbl_maintenance_history_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `tbl_maintenance_requests` (`request_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_maintenance_history`
--

LOCK TABLES `tbl_maintenance_history` WRITE;
/*!40000 ALTER TABLE `tbl_maintenance_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_maintenance_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_maintenance_parts`
--

DROP TABLE IF EXISTS `tbl_maintenance_parts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_maintenance_parts` (
  `part_id` int(11) NOT NULL AUTO_INCREMENT,
  `request_id` int(11) NOT NULL,
  `p_id` varchar(50) NOT NULL,
  `quantity` int(11) NOT NULL,
  `unit` varchar(50) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'withdrawn',
  `withdrawn_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `used_at` timestamp NULL DEFAULT NULL,
  `returned_at` timestamp NULL DEFAULT NULL,
  `returned_qty` int(11) NOT NULL DEFAULT 0,
  `withdrawn_by` varchar(100) NOT NULL,
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`part_id`),
  KEY `tbl_maintenance_parts_request_id_idx` (`request_id`),
  KEY `tbl_maintenance_parts_p_id_idx` (`p_id`),
  KEY `tbl_maintenance_parts_status_idx` (`status`),
  CONSTRAINT `tbl_maintenance_parts_p_id_fkey` FOREIGN KEY (`p_id`) REFERENCES `tbl_products` (`p_id`) ON UPDATE CASCADE,
  CONSTRAINT `tbl_maintenance_parts_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `tbl_maintenance_requests` (`request_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_maintenance_parts`
--

LOCK TABLES `tbl_maintenance_parts` WRITE;
/*!40000 ALTER TABLE `tbl_maintenance_parts` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_maintenance_parts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_maintenance_requests`
--

DROP TABLE IF EXISTS `tbl_maintenance_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_maintenance_requests` (
  `request_id` int(11) NOT NULL AUTO_INCREMENT,
  `request_number` varchar(50) NOT NULL,
  `room_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `priority` varchar(20) NOT NULL DEFAULT 'normal',
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `reported_by` varchar(100) NOT NULL,
  `assigned_to` varchar(100) DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `actual_cost` decimal(10,2) DEFAULT 0.00,
  `estimated_cost` decimal(10,2) DEFAULT 0.00,
  `image_url` varchar(500) DEFAULT NULL,
  `scheduled_date` date DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `contact_info` varchar(100) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `tags` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`request_id`),
  UNIQUE KEY `tbl_maintenance_requests_request_number_key` (`request_number`),
  KEY `tbl_maintenance_requests_room_id_idx` (`room_id`),
  KEY `tbl_maintenance_requests_status_idx` (`status`),
  CONSTRAINT `tbl_maintenance_requests_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `tbl_rooms` (`room_id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_maintenance_requests`
--

LOCK TABLES `tbl_maintenance_requests` WRITE;
/*!40000 ALTER TABLE `tbl_maintenance_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_maintenance_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_part_requests`
--

DROP TABLE IF EXISTS `tbl_part_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_part_requests` (
  `request_id` int(11) NOT NULL AUTO_INCREMENT,
  `maintenance_id` int(11) DEFAULT NULL,
  `item_name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `requested_by` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `approval_notes` text DEFAULT NULL,
  `date_needed` date DEFAULT NULL,
  `department` varchar(255) DEFAULT NULL,
  `estimated_price` decimal(10,2) DEFAULT NULL,
  `priority` varchar(50) NOT NULL DEFAULT 'normal',
  `quotation_file` varchar(500) DEFAULT NULL,
  `quotation_link` varchar(500) DEFAULT NULL,
  `supplier` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`request_id`),
  KEY `tbl_part_requests_maintenance_id_idx` (`maintenance_id`),
  KEY `tbl_part_requests_status_idx` (`status`),
  KEY `idx_date_needed` (`date_needed`),
  KEY `idx_priority` (`priority`),
  CONSTRAINT `tbl_part_requests_maintenance_id_fkey` FOREIGN KEY (`maintenance_id`) REFERENCES `tbl_maintenance_requests` (`request_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_part_requests`
--

LOCK TABLES `tbl_part_requests` WRITE;
/*!40000 ALTER TABLE `tbl_part_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_part_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_pm_plans`
--

DROP TABLE IF EXISTS `tbl_pm_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_pm_plans` (
  `pm_id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `room_id` int(11) NOT NULL,
  `frequency_type` varchar(20) NOT NULL,
  `interval` int(11) NOT NULL DEFAULT 1,
  `next_run_date` date NOT NULL,
  `assigned_to` varchar(100) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `last_generated` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`pm_id`),
  KEY `tbl_pm_plans_room_id_idx` (`room_id`),
  CONSTRAINT `tbl_pm_plans_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `tbl_rooms` (`room_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_pm_plans`
--

LOCK TABLES `tbl_pm_plans` WRITE;
/*!40000 ALTER TABLE `tbl_pm_plans` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_pm_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_po_items`
--

DROP TABLE IF EXISTS `tbl_po_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_po_items` (
  `item_id` int(11) NOT NULL AUTO_INCREMENT,
  `po_id` int(11) NOT NULL,
  `p_id` varchar(50) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 0,
  `unit_price` decimal(10,2) DEFAULT 0.00,
  `line_total` decimal(12,2) DEFAULT 0.00,
  `received_qty` int(11) DEFAULT 0,
  `notes` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`item_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_po_items`
--

LOCK TABLES `tbl_po_items` WRITE;
/*!40000 ALTER TABLE `tbl_po_items` DISABLE KEYS */;
INSERT INTO `tbl_po_items` VALUES (1,1,'D003',90,50.00,4500.00,0,NULL);
/*!40000 ALTER TABLE `tbl_po_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_product_movements`
--

DROP TABLE IF EXISTS `tbl_product_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_product_movements` (
  `movement_id` int(11) NOT NULL AUTO_INCREMENT,
  `warehouse_id` int(11) DEFAULT NULL,
  `p_id` varchar(50) NOT NULL,
  `username` varchar(100) NOT NULL,
  `movement_type` varchar(50) NOT NULL,
  `quantity` int(11) NOT NULL,
  `remarks` text DEFAULT NULL,
  `movement_time` datetime NOT NULL,
  PRIMARY KEY (`movement_id`),
  KEY `idx_pm_movement_time` (`movement_time`),
  KEY `idx_pm_movement_type` (`movement_type`),
  KEY `idx_pm_p_id` (`p_id`),
  KEY `p_id` (`p_id`),
  CONSTRAINT `fk_product_movements_products` FOREIGN KEY (`p_id`) REFERENCES `tbl_products` (`p_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_product_movements`
--

LOCK TABLES `tbl_product_movements` WRITE;
/*!40000 ALTER TABLE `tbl_product_movements` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_product_movements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_products`
--

DROP TABLE IF EXISTS `tbl_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_products` (
  `p_id` varchar(50) NOT NULL,
  `type_name` varchar(100) DEFAULT NULL,
  `cat_id` int(11) DEFAULT NULL,
  `main_category` varchar(50) DEFAULT NULL,
  `p_name` varchar(255) NOT NULL,
  `p_desc` text DEFAULT NULL,
  `supplier` varchar(255) DEFAULT NULL,
  `p_sku` varchar(50) DEFAULT NULL,
  `p_unit` varchar(20) DEFAULT 'ชิ้น',
  `p_count` int(11) NOT NULL,
  `expiry_date` date DEFAULT NULL,
  `batch_number` varchar(50) DEFAULT NULL,
  `price_unit` decimal(10,2) DEFAULT 0.00,
  `safety_stock` int(11) NOT NULL,
  `p_image` varchar(255) DEFAULT NULL,
  `active` tinyint(1) DEFAULT 1,
  `order_number` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `is_luxury` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`p_id`),
  UNIQUE KEY `p_name` (`p_name`),
  KEY `fk_products_category` (`cat_id`),
  KEY `idx_p_p_id` (`p_id`),
  KEY `idx_p_p_name` (`p_name`),
  CONSTRAINT `fk_products_category` FOREIGN KEY (`cat_id`) REFERENCES `tbl_categories` (`cat_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_products`
--

LOCK TABLES `tbl_products` WRITE;
/*!40000 ALTER TABLE `tbl_products` DISABLE KEYS */;
INSERT INTO `tbl_products` VALUES ('A001',NULL,1,'Office','กระดาษ A4',NULL,NULL,NULL,'กล่อง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('A002',NULL,1,'Office','คัตเตอร์',NULL,NULL,NULL,'อัน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('A003',NULL,1,'Office','ซองถนอมเอกสาร A4',NULL,NULL,NULL,'แพ็ค',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('A004',NULL,1,'Office','ซองใส A4',NULL,NULL,NULL,'แพ็ค',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('A005',NULL,1,'Office','เสื้อ Raya (L)',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('A006',NULL,1,'Office','เสื้อ Raya (M)',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('A007',NULL,1,'Office','เสื้อ Raya (S)',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('A008',NULL,1,'Office','เสื้อ Raya (XL)',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('A009',NULL,1,'Office','หน้ากาก N95',NULL,NULL,NULL,'กล่อง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('A010',NULL,1,'Office','เทปใส 18MM',NULL,NULL,NULL,'ชิ้น',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('A011',NULL,1,'Office','เทปกาว 2 หน้า (บาง)',NULL,NULL,NULL,'ชิ้น',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('A012',NULL,1,'Office','เทปกาว 2 หน้า (หนา)',NULL,NULL,NULL,'ชิ้น',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('B001',NULL,2,'เครื่องใช้','กระดาษทิชชู',NULL,NULL,NULL,'แพ็ค',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('B002',NULL,2,'เครื่องใช้','กระทะ',NULL,NULL,NULL,'อัน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('B003',NULL,2,'เครื่องใช้','กระบวย',NULL,NULL,NULL,'อัน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('B004',NULL,2,'เครื่องใช้','แก้วน้ำ',NULL,NULL,NULL,'ใบ',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('B005',NULL,2,'เครื่องใช้','เขียง (เล็ก)',NULL,NULL,NULL,'อัน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('B006',NULL,2,'เครื่องใช้','เขียง (ใหญ่)',NULL,NULL,NULL,'อัน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('B007',NULL,2,'เครื่องใช้','จาน',NULL,NULL,NULL,'ใบ',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('B008',NULL,2,'เครื่องใช้','จานกลาง',NULL,NULL,NULL,'ใบ',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('B009',NULL,2,'เครื่องใช้','ช้อน',NULL,NULL,NULL,'คัน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('B010',NULL,2,'เครื่องใช้','ช้อนกาแฟ',NULL,NULL,NULL,'ใบ',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('B011',NULL,2,'เครื่องใช้','ชุดถ้วยกาแฟ',NULL,NULL,NULL,'ใบ',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('B012',NULL,2,'เครื่องใช้','ตะหลิว',NULL,NULL,NULL,'อัน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('B013',NULL,2,'เครื่องใช้','ตะหลิว (ร่อง)',NULL,NULL,NULL,'อัน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('B014',NULL,2,'เครื่องใช้','ถ้วย (เล็ก)',NULL,NULL,NULL,'ใบ',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('B015',NULL,2,'เครื่องใช้','ถ้วย (ใหญ่)',NULL,NULL,NULL,'ใบ',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('B016',NULL,2,'เครื่องใช้','ถังขยะ (เล็ก)',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('B017',NULL,2,'เครื่องใช้','ถังขยะ (ใหญ่)',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('B018',NULL,2,'เครื่องใช้','ทัพพี',NULL,NULL,NULL,'อัน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('B019',NULL,2,'เครื่องใช้','มีด (กลาง)',NULL,NULL,NULL,'เล่ม',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('B020',NULL,2,'เครื่องใช้','มีด (เล็ก)',NULL,NULL,NULL,'เล่ม',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('B021',NULL,2,'เครื่องใช้','มีด (ใหญ่)',NULL,NULL,NULL,'เล่ม',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('B022',NULL,2,'เครื่องใช้','มีดสเต็ก',NULL,NULL,NULL,'เล่ม',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('B023',NULL,2,'เครื่องใช้','ส้อม',NULL,NULL,NULL,'คัน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('B024',NULL,2,'เครื่องใช้','หม้อ (เล็ก)',NULL,NULL,NULL,'ใบ',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('B025',NULL,2,'เครื่องใช้','หม้อ (ใหญ่)',NULL,NULL,NULL,'ใบ',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('C001',NULL,3,'เครื่องปรับอากาศ','มอเตอร์บานสวิง แอร์ (รับแขก A, นอนใหญ่ B,C)',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('C002',NULL,3,'เครื่องปรับอากาศ','มอเตอร์บานสวิง แอร์ 4 ทิศทาง',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('C003',NULL,3,'เครื่องปรับอากาศ','มอเตอร์บานสวิง แอร์ A,B,C (นอนเล็ก)',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('C004',NULL,3,'เครื่องปรับอากาศ','Senser อุณหภูมิ แอร์ 4 ทิศทาง Thermistor',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('C005',NULL,3,'เครื่องปรับอากาศ','Sensor อุณหภูมิ แอร์ (รับแขก A, นอนใหญ่ B,C) Thermistor',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('C006',NULL,3,'เครื่องปรับอากาศ','Sensor อุณหภูมิ แอร์ A,B,C (นอนเล็ก) Thermistor',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('C007',NULL,3,'เครื่องปรับอากาศ','Senser น้ำแข็ง แอร์ 4 ทิศทาง Thermistor',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('C008',NULL,3,'เครื่องปรับอากาศ','Sensor  น้ำแข็ง แอร์ (รับแขก A, นอนใหญ่ B,C) Thermistor',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('C009',NULL,3,'เครื่องปรับอากาศ','Sensor  น้ำแข็ง แอร์  A,B,C (นอนเล็ก) Thermistor',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('C010',NULL,3,'เครื่องปรับอากาศ','แผงรับสัญญาณรีโมท  A,B,C (นอนเล็ก)',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('C011',NULL,3,'เครื่องปรับอากาศ','น้ำยาแอร์ R22',NULL,NULL,NULL,'ถัง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('C012',NULL,3,'เครื่องปรับอากาศ','น้ำยาแอร์ R32',NULL,NULL,NULL,'ถัง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('C013',NULL,3,'เครื่องปรับอากาศ','น้ำยาแอร์ R410A',NULL,NULL,NULL,'ถัง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('C014',NULL,3,'เครื่องปรับอากาศ','โฬมล้างแอร์',NULL,NULL,NULL,'กระป๋อง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('C015',NULL,3,'เครื่องปรับอากาศ','เทปพันท่อแอร์',NULL,NULL,NULL,'อัน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('D001',NULL,4,'แม่บ้าน','Baking Soda',NULL,NULL,NULL,'ซอง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('D002',NULL,4,'แม่บ้าน','ซักผ้าขาว',NULL,NULL,NULL,'ถัง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('D003',NULL,4,'แม่บ้าน','ถุงขยะ Size 18*20','','',NULL,'กระสอบ',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('D004',NULL,4,'แม่บ้าน','ถุงขยะ Size 22',NULL,NULL,NULL,'กระสอบ',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('D005',NULL,4,'แม่บ้าน','ถุงขยะ ดำ',NULL,NULL,NULL,'แพ็ค',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('D006',NULL,4,'แม่บ้าน','น้ำยาฆ่าเชื้อแบคทีเรีย',NULL,NULL,NULL,'แกลลอน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('D007',NULL,4,'แม่บ้าน','น้ำยาเช็ดกระจก',NULL,NULL,NULL,'ขวด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('D008',NULL,4,'แม่บ้าน','น้ำยาถูพื้น',NULL,NULL,NULL,'ขวด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('D009',NULL,4,'แม่บ้าน','น้ำยาปรับผ้านุ่ม (ไมลด์ลี่)',NULL,NULL,NULL,'ถัง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('D010',NULL,4,'แม่บ้าน','ผงฟอกขาว (ปลีซซีบี)',NULL,NULL,NULL,'ถัง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('D011',NULL,4,'แม่บ้าน','น้ำยาล้างจาน',NULL,NULL,NULL,'แกลลอน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('D012',NULL,4,'แม่บ้าน','น้ำยาล้างมือ',NULL,NULL,NULL,'ขวด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('D013',NULL,4,'แม่บ้าน','น้ำยาล้างห้องน้ำ',NULL,NULL,NULL,'ขวด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('D014',NULL,4,'แม่บ้าน','น้ำส้มสายชู',NULL,NULL,NULL,'แกลลอน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('D015',NULL,4,'แม่บ้าน','ผงซักฟอก (เซฟ-เอ)',NULL,NULL,NULL,'ถัง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('D016',NULL,4,'แม่บ้าน','ผงซักฟอก (สระว่ายน้ำ)',NULL,NULL,NULL,'ถัง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('D017',NULL,4,'แม่บ้าน','สเตคลีน',NULL,NULL,NULL,'ขวด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('D018',NULL,4,'แม่บ้าน','อาทกระป๋อง กำจัดยุง',NULL,NULL,NULL,'ขวด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E001',NULL,5,'ไฟฟ้า','ฝาสวิต 3 ช่อง Siemens',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E002',NULL,5,'ไฟฟ้า','ฝาสวิต 2 ช่อง Siemens',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E003',NULL,5,'ไฟฟ้า','ฝาสวิต 1 ช่อง Siemens',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E004',NULL,5,'ไฟฟ้า','สวิตไฟตู้เสื้อผ้า',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E005',NULL,5,'ไฟฟ้า','Adepter (2A)',NULL,NULL,NULL,'ตัว',2,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E006',NULL,5,'ไฟฟ้า','หม้อแปลง (220-240V) 60W',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E007',NULL,5,'ไฟฟ้า','หม้อแปลง (12V) 180W',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E008',NULL,5,'ไฟฟ้า','Halogen (220V75W) Par30s (E27)',NULL,NULL,NULL,'หลอด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E009',NULL,5,'ไฟฟ้า','LED E27 (7W) Day',NULL,NULL,NULL,'หลอด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E010',NULL,5,'ไฟฟ้า','LED E27 (7W) Warm',NULL,NULL,NULL,'หลอด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E011',NULL,5,'ไฟฟ้า','LED (220V6W) T8 (Day)',NULL,NULL,NULL,'หลอด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E012',NULL,5,'ไฟฟ้า','LED (220V6W) T8 (Warm)',NULL,NULL,NULL,'หลอด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E013',NULL,5,'ไฟฟ้า','LED (220V18W) Par38 (E27) IP65',NULL,NULL,NULL,'หลอด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E014',NULL,5,'ไฟฟ้า','LED (220V50W) Par20S (E27)',NULL,NULL,NULL,'หลอด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E015',NULL,5,'ไฟฟ้า','LED (220V5W) T5 (Day) 4W',NULL,NULL,NULL,'หลอด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E016',NULL,5,'ไฟฟ้า','LED (220V5W) T5 (Warm) 4W',NULL,NULL,NULL,'หลอด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E017',NULL,5,'ไฟฟ้า','LED (220V5W) T5 (Day) 8W',NULL,NULL,NULL,'หลอด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E018',NULL,5,'ไฟฟ้า','LED (220V5W) T5 (Warm) 8W',NULL,NULL,NULL,'หลอด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E019',NULL,5,'ไฟฟ้า','LED (220V5W) T5 (Day) 16W',NULL,NULL,NULL,'หลอด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E020',NULL,5,'ไฟฟ้า','LED (220V5W) T5 (Warm) 16W',NULL,NULL,NULL,'หลอด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E021',NULL,5,'ไฟฟ้า','LED (Philips) 5W',NULL,NULL,NULL,'หลอด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E022',NULL,5,'ไฟฟ้า','LED 3W (E14)',NULL,NULL,NULL,'หลอด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E023',NULL,5,'ไฟฟ้า','LED Downlight (12V9W) Day',NULL,NULL,NULL,'หลอด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E024',NULL,5,'ไฟฟ้า','LED Downlight (12V9W) Warm',NULL,NULL,NULL,'หลอด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E025',NULL,5,'ไฟฟ้า','LED downlight Lumax (12V7W) day4\" (MR16)',NULL,NULL,NULL,'หลอด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E026',NULL,5,'ไฟฟ้า','LED downlight Lumax (12V7W) warm4\" (MR16)',NULL,NULL,NULL,'หลอด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E027',NULL,5,'ไฟฟ้า','Lumax E27 (15W) Day',NULL,NULL,NULL,'หลอด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E028',NULL,5,'ไฟฟ้า','กล่องพลาสติกกันน้ำ (บล็อกไฟ)',NULL,NULL,NULL,'อัน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E029',NULL,5,'ไฟฟ้า','โคมไฟ Downlight (12V)',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E030',NULL,5,'ไฟฟ้า','เตารับคู่ มีกราวด์และม่านนิรภัย (220V) Siemens',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E031',NULL,5,'ไฟฟ้า','รีโมท TV',NULL,NULL,NULL,'อัน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E032',NULL,5,'ไฟฟ้า','รีโมทแอร์',NULL,NULL,NULL,'อัน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E033',NULL,5,'ไฟฟ้า','รีโมทแอร์ (4 ทิศทาง)',NULL,NULL,NULL,'อัน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E034',NULL,5,'ไฟฟ้า','สวิตไฟเดี่ยว',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E035',NULL,5,'ไฟฟ้า','หลอดไฟตู้เย็น Sharp',NULL,NULL,NULL,'หลอด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('E036',NULL,5,'ไฟฟ้า','ไฟเส้น LED',NULL,NULL,NULL,'เส้น',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F001',NULL,6,'งานช่าง','Wall Putty (1Kg)',NULL,NULL,NULL,'ถัง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F002',NULL,6,'งานช่าง','Wall Putty (5Kg)',NULL,NULL,NULL,'ถัง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F003',NULL,6,'งานช่าง','Wood Filler (Pine Color)',NULL,NULL,NULL,'ถัง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F004',NULL,6,'งานช่าง','Wood Filler (Walnut Color)',NULL,NULL,NULL,'ถัง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F005',NULL,6,'งานช่าง','กันซึมเหลว',NULL,NULL,NULL,'ถุง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F006',NULL,6,'งานช่าง','กาวตะปูหลอด',NULL,NULL,NULL,'ถุง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F007',NULL,6,'งานช่าง','กาวร้อน',NULL,NULL,NULL,'หลอด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F008',NULL,6,'งานช่าง','เกรียงโป๊ว 4\"',NULL,NULL,NULL,'อัน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F009',NULL,6,'งานช่าง','ซิลิโคน (ขาว)',NULL,NULL,NULL,'หลอด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F010',NULL,6,'งานช่าง','ซิลิโคน (ดำ)',NULL,NULL,NULL,'หลอด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F011',NULL,6,'งานช่าง','ซิลิโคน (ใส)',NULL,NULL,NULL,'หลอด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F012',NULL,6,'งานช่าง','ทินเนอร์ 41 (ผสมยูรีเทน)',NULL,NULL,NULL,'แกลลอน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F013',NULL,6,'งานช่าง','ยูรีเทน',NULL,NULL,NULL,'แกลลอน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F014',NULL,6,'งานช่าง','ทินเนอร์ AAA',NULL,NULL,NULL,'แกลลอน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F015',NULL,6,'งานช่าง','น้ำยาล้างแอร์แบบกรด',NULL,NULL,NULL,'ขวด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F016',NULL,6,'งานช่าง','ปูนกาว',NULL,NULL,NULL,'ถุง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F017',NULL,6,'งานช่าง','น้ำยาไล่ความชื้น (Moisture Guard)',NULL,NULL,NULL,'ขวด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F018',NULL,6,'งานช่าง','ยาแนว (สีขาวไข่มุก)',NULL,NULL,NULL,'ถุง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F019',NULL,6,'งานช่าง','ยาแนว (สีเทาปะการัง) 1KG',NULL,NULL,NULL,'ถุง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F020',NULL,6,'งานช่าง','ยาแนว (สีเทาปะการัง) 5 KG',NULL,NULL,NULL,'ถุง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F021',NULL,6,'งานช่าง','สเปรย์ทดสอบตัวตรวจจับควันและความร้อน',NULL,NULL,NULL,'กระป๋อง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F022',NULL,6,'งานช่าง','สเปรย์หล่อลื่น Sonax',NULL,NULL,NULL,'กระป๋อง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F023',NULL,6,'งานช่าง','สเปรย์หล่อลื่น จารบี (Grease spray)',NULL,NULL,NULL,'กระป๋อง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F024',NULL,6,'งานช่าง','สีฝุ่น (สีแดง)',NULL,NULL,NULL,'ถุง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F025',NULL,6,'งานช่าง','Contact cleaner',NULL,NULL,NULL,'กระป๋อง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F026',NULL,6,'งานช่าง','Sticker remover',NULL,NULL,NULL,'กระป๋อง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F027',NULL,6,'งานช่าง','ครีมทำความสะอาดโลหะ',NULL,NULL,NULL,'หลอด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F028',NULL,6,'งานช่าง','กระดาษทราย เบอร์ 0',NULL,NULL,NULL,'แผ่น',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F029',NULL,6,'งานช่าง','กระดาษทราย เบอร์ 1',NULL,NULL,NULL,'แผ่น',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F030',NULL,6,'งานช่าง','กระดาษทราย เบอร์ 2',NULL,NULL,NULL,'แผ่น',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F031',NULL,6,'งานช่าง','กระดาษทราย เบอร์ 3',NULL,NULL,NULL,'แผ่น',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F032',NULL,6,'งานช่าง','กระดาษทราย เบอร์ 150',NULL,NULL,NULL,'แผ่น',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F033',NULL,6,'งานช่าง','กระดาษทราย เบอร์ 180',NULL,NULL,NULL,'แผ่น',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F034',NULL,6,'งานช่าง','กระดาษทรายละเอียด 320',NULL,NULL,NULL,'แผ่น',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F035',NULL,6,'งานช่าง','กระดาษทราย เบอร์ 80 (วงกลม)',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F036',NULL,6,'งานช่าง','กระดาษทราย เบอร์ 100 (วงกลม)',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F037',NULL,6,'งานช่าง','กระดาษทราย เบอร์ 120 (วงกลม)',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F038',NULL,6,'งานช่าง','กระดาษทรายหนามเตย',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F039',NULL,6,'งานช่าง','เทปกาวย่น 1\"',NULL,NULL,NULL,'ม้วน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F040',NULL,6,'งานช่าง','เทปกาวย่น 2\"',NULL,NULL,NULL,'ม้วน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F041',NULL,6,'งานช่าง','เทปพันเกลียว (ปะปา)',NULL,NULL,NULL,'ม้วน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F042',NULL,6,'งานช่าง','เทปพันสายไฟ',NULL,NULL,NULL,'ม้วน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F043',NULL,6,'งานช่าง','เทปอะลูมิเนียม',NULL,NULL,NULL,'ม้วน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F044',NULL,6,'งานช่าง','ใบขัดเพชร เจียรปูน 4\"',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F045',NULL,6,'งานช่าง','ใบตัดกระเบื้อง 4\"',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F046',NULL,6,'งานช่าง','ใบตัดไม้ 4\"',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F047',NULL,6,'งานช่าง','ใบตัดเหล็ก 4\"',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F048',NULL,6,'งานช่าง','แปรงขนกระต่าย 2.5 \"',NULL,NULL,NULL,'อัน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F049',NULL,6,'งานช่าง','แปรงขนกระต่าย 4 \"',NULL,NULL,NULL,'อัน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F050',NULL,6,'งานช่าง','ลูกกลิ่งขนแกะ 4\"',NULL,NULL,NULL,'ชิ้น',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F051',NULL,6,'งานช่าง','ลูกกลิ่งขนแกะ 10 \"',NULL,NULL,NULL,'ชิ้น',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F052',NULL,6,'งานช่าง','สีทาฝ้าเพดาน',NULL,NULL,NULL,'ถัง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F053',NULL,6,'งานช่าง','สีน้ำมัน (ทาเฟอร์นิเจอร์)',NULL,NULL,NULL,'ถัง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F054',NULL,6,'งานช่าง','แปรงทาสี 1\"',NULL,NULL,NULL,'อัน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F055',NULL,6,'งานช่าง','แปรงทาสี 2\"',NULL,NULL,NULL,'อัน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F056',NULL,6,'งานช่าง','แปรงทาสี 3\"',NULL,NULL,NULL,'อัน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F057',NULL,6,'งานช่าง','แปรงทาสี 4\"',NULL,NULL,NULL,'อัน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('F058',NULL,6,'งานช่าง','แปรงทาสี 10 CM',NULL,NULL,NULL,'อัน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('G001',NULL,12,'ปะปา','Rain shower',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('G002',NULL,12,'ปะปา','ก็อกอ่างล้างจาน',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('G003',NULL,12,'ปะปา','ก็อกอ่างล้างหน้า',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('G004',NULL,12,'ปะปา','คอท่อน้ำทิ้งอ่างล้างหน้า',NULL,NULL,NULL,'ชุด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('G005',NULL,12,'ปะปา','ชุดสะดืออ่างล้างจาน',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('G006',NULL,12,'ปะปา','สะดืออ่างอาบน้ำ',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('G007',NULL,12,'ปะปา','สะดืออ่างล้างจาน ขนาด 3.5นิ้วชุด',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('G008',NULL,12,'ปะปา','ชุดฝาท่อน้ำทิ้ง (4\")',NULL,NULL,NULL,'ชุด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('G009',NULL,12,'ปะปา','ปากกรองก็อกน้ำ (เกลียวใน)',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('G010',NULL,12,'ปะปา','วาล์วก็อกน้ำ 4 หุน',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('G011',NULL,12,'ปะปา','สต็อบวาล์ว 1/2',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('G012',NULL,12,'ปะปา','ชุดสายฉีดชำระ',NULL,NULL,NULL,'ชุด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('G013',NULL,12,'ปะปา','สายฉีดชำระ (สาย)',NULL,NULL,NULL,'เส้น',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('G014',NULL,12,'ปะปา','สายฉีดชำระ (หัว)',NULL,NULL,NULL,'เส้น',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('G015',NULL,12,'ปะปา','ชุดฝักบัวอาบน้ำ',NULL,NULL,NULL,'ชุด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('G016',NULL,12,'ปะปา','สายฝักบัวอาบน้ำ (150CM)',NULL,NULL,NULL,'เส้น',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('G017',NULL,12,'ปะปา','ฝักบัวอาบน้ำ (หัว)',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('G018',NULL,12,'ปะปา','ฝักบัวอาบน้ำ (สาย)',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('G019',NULL,12,'ปะปา','ก็อกน้ำสนาม 4 หุน',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('G020',NULL,12,'ปะปา','ก็อกน้ำสนาม 5 หุน',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('G021',NULL,12,'ปะปา','ข้อต่อทองเหลือง (ตัวผู้ / ตัวเมีย)',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('G022',NULL,12,'ปะปา','ปากก็อกต่อเครื่องซักผ้า',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('G023',NULL,12,'ปะปา','สายน้ำดี สแตนเลส 12\"',NULL,NULL,NULL,'เส้น',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('G024',NULL,12,'ปะปา','สายน้ำดี สแตนเลส 16\"',NULL,NULL,NULL,'เส้น',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('G025',NULL,12,'ปะปา','สายน้ำดี สแตนเลส 18\" (4/5\")',NULL,NULL,NULL,'เส้น',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('G026',NULL,12,'ปะปา','สายน้ำดี สแตนเลส 20\"',NULL,NULL,NULL,'เส้น',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('G027',NULL,12,'ปะปา','สายน้ำดี สแตนเลส 24\"',NULL,NULL,NULL,'เส้น',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('G028',NULL,12,'ปะปา','สายน้ำดี สแตนเลส 40\"',NULL,NULL,NULL,'เส้น',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('G029',NULL,12,'ปะปา','สายน้ำดี สแตนเลส 16\" (น้ำเย็น)',NULL,NULL,NULL,'เส้น',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('G030',NULL,12,'ปะปา','สายน้ำดี สแตนเลส 20\" (น้ำเย็น)',NULL,NULL,NULL,'เส้น',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('H001',NULL,8,'สวน','ปุ๋ยเร่งต้น',NULL,NULL,NULL,'ถุง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('H002',NULL,8,'สวน','ปุ๋ยเร่งดอก',NULL,NULL,NULL,'ถุง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('H003',NULL,8,'สวน','กำจัดเพลี้ย',NULL,NULL,NULL,'ถุง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('H004',NULL,8,'สวน','ปุ๋ยเร่งต้น เร่งใบ (25-7-7)',NULL,NULL,NULL,'ถุง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('H005',NULL,8,'สวน','ดินมูลไส้เดือน',NULL,NULL,NULL,'ถุง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:08',0),('H006',NULL,8,'สวน','ดินใบก้ามปู',NULL,NULL,NULL,'ถุง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('H007',NULL,8,'สวน','หัวฉีดสเปรย์เจ็ทยาว พร้อมขา',NULL,NULL,NULL,'ชุด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('H008',NULL,8,'สวน','หัวฉีดสเปรย์ปีกผีเสื้อเล็ก พร้อมขา',NULL,NULL,NULL,'ชุด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('H009',NULL,8,'สวน','มินิสปริงเกลอร์ ใบ D พร้อมขา',NULL,NULL,NULL,'ชุด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('I001',NULL,9,'สิ่งทอ','ถุงซักน้ำ',NULL,NULL,NULL,'ถุง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('I002',NULL,9,'สิ่งทอ','ถุงซักแห้ง',NULL,NULL,NULL,'ถุง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('I003',NULL,9,'สิ่งทอ','ปลอกผ้านวม (3 ฟุต)',NULL,NULL,NULL,'ผืน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('I004',NULL,9,'สิ่งทอ','ปลอกผ้านวม (6 ฟุต)',NULL,NULL,NULL,'ผืน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('I005',NULL,9,'สิ่งทอ','ปลอกหมอน',NULL,NULL,NULL,'ผืน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('I006',NULL,9,'สิ่งทอ','ผ้าเช็ดตัว',NULL,NULL,NULL,'ผืน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('I007',NULL,9,'สิ่งทอ','ผ้าเช็ดเท้า',NULL,NULL,NULL,'ผืน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('I008',NULL,9,'สิ่งทอ','ผ้าเช็ดมือ',NULL,NULL,NULL,'ผืน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('I009',NULL,9,'สิ่งทอ','ผ้าปูที่นอน (3 ฟุต)',NULL,NULL,NULL,'ผืน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('I010',NULL,9,'สิ่งทอ','ผ้าปูที่นอน (6 ฟุต)',NULL,NULL,NULL,'ผืน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('I011',NULL,9,'สิ่งทอ','ผ้ารองกันเปื้อน',NULL,NULL,NULL,'ผืน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('I012',NULL,9,'สิ่งทอ','ผ้าสระว่ายน้ำ',NULL,NULL,NULL,'ผืน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('I013',NULL,9,'สิ่งทอ','พรม',NULL,NULL,NULL,'ผืน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('I014',NULL,9,'สิ่งทอ','ใส้ผ้านวม (3 ฟุต)',NULL,NULL,NULL,'ผืน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('I015',NULL,9,'สิ่งทอ','ใส้ผ้านวม (6 ฟุต)',NULL,NULL,NULL,'ผืน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('I016',NULL,9,'สิ่งทอ','หมอน',NULL,NULL,NULL,'ใบ',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('J001',NULL,10,'อุปกรณ์','Cable Tie',NULL,NULL,NULL,'ถุง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('J002',NULL,10,'อุปกรณ์','Stopper',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('J003',NULL,10,'อุปกรณ์','โซ่คล้องประตู',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('J004',NULL,10,'อุปกรณ์','ท่อน้ำทิ้งเครื่องซักผ้า',NULL,NULL,NULL,'เส้น',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('J005',NULL,10,'อุปกรณ์','ที่แขวนกระดาษทิษชู่',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('J006',NULL,10,'อุปกรณ์','ที่แขวนกระดาษทิษชู่ (ห้องคนขับรถ)',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('J007',NULL,10,'อุปกรณ์','แผงปุ่มกดเครื่องซักผ้า',NULL,NULL,NULL,'แผ่น',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('J008',NULL,10,'อุปกรณ์','มีดขูดหน้าเตาไฟฟ้า',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('J009',NULL,10,'อุปกรณ์','มือจับมุ้งลวด (ระเบียง)',NULL,NULL,NULL,'คู่',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('J010',NULL,10,'อุปกรณ์','มือจับมุ้งลวด (ห้องน้ำ)',NULL,NULL,NULL,'คู่',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('J011',NULL,10,'อุปกรณ์','แม่กุญแจล็อคลิ้นชัก',NULL,NULL,NULL,'ชุด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('J012',NULL,10,'อุปกรณ์','ชุดล็อคประตูบานเลื่อนระเบียง',NULL,NULL,NULL,'ชุด',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('J013',NULL,10,'อุปกรณ์','สักหลาด เฟอร์นิเจอร์',NULL,NULL,NULL,'แผ่น',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('J014',NULL,10,'อุปกรณ์','สักหลาดประตูบานเลื่อน (ม้วน)',NULL,NULL,NULL,'เส้น',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('J015',NULL,10,'อุปกรณ์','หมุดยึดชั้นวาง',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('J016',NULL,10,'อุปกรณ์','คิ้วกันแมลง',NULL,NULL,NULL,'ชิ้น',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('J017',NULL,10,'อุปกรณ์','รางเลื่อนลิ้นชัก',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('J018',NULL,10,'อุปกรณ์','บานพับถ้วย ทับของ (35 มิล)',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('J019',NULL,10,'อุปกรณ์','บานพับถ้วย ทับของ (40 มิล)',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('J020',NULL,10,'อุปกรณ์','บานพับถ้วย กลางของ (35 มิล)',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('J021',NULL,10,'อุปกรณ์','บานพับถ้วย กลางของ (40 มิล)',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('J022',NULL,10,'อุปกรณ์','บานพับประตู',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('J023',NULL,10,'อุปกรณ์','สวิทซ์ปุ่มกด เข้า-ออก',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('J024',NULL,10,'อุปกรณ์','ถ่าน AA (alkaline)',NULL,NULL,NULL,'ก้อน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('J025',NULL,10,'อุปกรณ์','ถ่าน AA (สีดำ)',NULL,NULL,NULL,'ก้อน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('J026',NULL,10,'อุปกรณ์','ถ่าน AAA (alkaline)',NULL,NULL,NULL,'ก้อน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('J027',NULL,10,'อุปกรณ์','ถ่าน AAA (สีดำ)',NULL,NULL,NULL,'ก้อน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('J028',NULL,10,'อุปกรณ์','ถ่าน CR1220 (alkaline)',NULL,NULL,NULL,'ก้อน',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('J029',NULL,10,'อุปกรณ์','อุปกรณ์ตรวจจับควันไฟ',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('J030',NULL,10,'อุปกรณ์','อุปกรณ์ตรวจจับความร้อน',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('K001',NULL,11,'แบตเตอรี่','แบตเตอรี่แห้ง 12V7.2A',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('K002',NULL,11,'แบตเตอรี่','แบตเตอรี่แห้ง 12V2.9A',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('K003',NULL,11,'แบตเตอรี่','แบตเตอรี่แห้ง 12V18A',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('L001',NULL,13,'เครื่องใช้ไฟฟ้า','เครื่องปิ้งขนมปัง',NULL,NULL,NULL,'เครื่อง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('L002',NULL,13,'เครื่องใช้ไฟฟ้า','กาต้มน้ำ',NULL,NULL,NULL,'เครื่อง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('L003',NULL,13,'เครื่องใช้ไฟฟ้า','Modem',NULL,NULL,NULL,'เครื่อง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('L004',NULL,13,'เครื่องใช้ไฟฟ้า','เครื่องซักผ้า',NULL,NULL,NULL,'เครื่อง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('L005',NULL,13,'เครื่องใช้ไฟฟ้า','ตู้เย็น',NULL,NULL,NULL,'เครื่อง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('L006',NULL,13,'เครื่องใช้ไฟฟ้า','ทีวี',NULL,NULL,NULL,'เครื่อง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('L007',NULL,13,'เครื่องใช้ไฟฟ้า','แอร์ 4 ทิศทาง',NULL,NULL,NULL,'เครื่อง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('L008',NULL,13,'เครื่องใช้ไฟฟ้า','แอร์ผนัง ใหญ่',NULL,NULL,NULL,'เครื่อง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('L009',NULL,13,'เครื่องใช้ไฟฟ้า','แอร์ผนัง เล็ก',NULL,NULL,NULL,'เครื่อง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('L010',NULL,13,'เครื่องใช้ไฟฟ้า','เครื่องทำน้ำร้อน',NULL,NULL,NULL,'เครื่อง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('L011',NULL,13,'เครื่องใช้ไฟฟ้า','Microwave',NULL,NULL,NULL,'เครื่อง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('L012',NULL,13,'เครื่องใช้ไฟฟ้า','ตู้เซฟ',NULL,NULL,NULL,'เครื่อง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('L013',NULL,13,'เครื่องใช้ไฟฟ้า','เตาอบ',NULL,NULL,NULL,'เครื่อง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('L014',NULL,13,'เครื่องใช้ไฟฟ้า','เตาไฟฟ้า 4 หัว',NULL,NULL,NULL,'เครื่อง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('L015',NULL,13,'เครื่องใช้ไฟฟ้า','เตาไฟฟ้า 2 หัว',NULL,NULL,NULL,'เครื่อง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('L016',NULL,13,'เครื่องใช้ไฟฟ้า','เครื่องดูดควัน',NULL,NULL,NULL,'เครื่อง',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('M001',NULL,14,'Furniture','ที่นอน 6 ฟุต',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('M002',NULL,14,'Furniture','ที่นอน 5 ฟุต',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('M003',NULL,14,'Furniture','Sofa',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('M004',NULL,14,'Furniture','Cofee table',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('M005',NULL,14,'Furniture','เก้าอี้ทำงาน',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('M006',NULL,14,'Furniture','เก้าอี้โต๊ะเครื่องแป้ง',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('M007',NULL,14,'Furniture','โต๊ะทานข้าว',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0),('M008',NULL,14,'Furniture','เก้าอี้ทานข้าว',NULL,NULL,NULL,'ตัว',0,NULL,NULL,0.00,0,'',1,NULL,'2026-01-10 06:10:09',0);
/*!40000 ALTER TABLE `tbl_products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_purchase_orders`
--

DROP TABLE IF EXISTS `tbl_purchase_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_purchase_orders` (
  `po_id` int(11) NOT NULL AUTO_INCREMENT,
  `po_number` varchar(50) NOT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `status` enum('draft','pending','approved','ordered','partial','received','cancelled') DEFAULT 'draft',
  `order_date` date DEFAULT NULL,
  `expected_date` date DEFAULT NULL,
  `received_date` date DEFAULT NULL,
  `subtotal` decimal(12,2) DEFAULT 0.00,
  `tax_amount` decimal(12,2) DEFAULT 0.00,
  `total_amount` decimal(12,2) DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `approved_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`po_id`),
  UNIQUE KEY `po_number` (`po_number`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_purchase_orders`
--

LOCK TABLES `tbl_purchase_orders` WRITE;
/*!40000 ALTER TABLE `tbl_purchase_orders` DISABLE KEYS */;
INSERT INTO `tbl_purchase_orders` VALUES (1,'PO-202602847',2,'draft','2026-02-13',NULL,NULL,0.00,0.00,4500.00,'','admin',NULL,'2026-02-12 23:30:26','2026-02-12 23:30:26');
/*!40000 ALTER TABLE `tbl_purchase_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_roles`
--

DROP TABLE IF EXISTS `tbl_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_roles` (
  `role_id` int(11) NOT NULL AUTO_INCREMENT,
  `role_name` varchar(50) NOT NULL,
  `role_description` varchar(255) DEFAULT NULL,
  `permissions` longtext DEFAULT NULL,
  `is_system` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `role_name` (`role_name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_roles`
--

LOCK TABLES `tbl_roles` WRITE;
/*!40000 ALTER TABLE `tbl_roles` DISABLE KEYS */;
INSERT INTO `tbl_roles` VALUES (1,'admin','Administrator - Full Access','{\"dashboard\":true,\"products\":true,\"movements\":true,\"stock_adjust\":true,\"borrow\":true,\"assets\":true,\"maintenance\":true,\"maintenance_dashboard\":true,\"maintenance_technicians\":true,\"maintenance_parts\":true,\"maintenance_requests\":true,\"maintenance_reports\":true,\"admin_roles\":true,\"admin_po\":true,\"admin_suppliers\":true,\"admin_warehouses\":true,\"admin_categories\":true,\"admin_reports\":true,\"admin_audit\":true,\"admin_settings\":true,\"admin_security\":true}',1,'2026-02-08 09:55:51'),(2,'manager','Manager - Manage Operations','{\"dashboard\":true,\"products\":true,\"movements\":true,\"stock_adjust\":true,\"borrow\":true,\"assets\":true,\"maintenance\":true,\"maintenance_dashboard\":true,\"maintenance_technicians\":true,\"maintenance_parts\":true,\"maintenance_requests\":true,\"maintenance_reports\":true,\"admin_roles\":true,\"admin_po\":true,\"admin_suppliers\":true,\"admin_warehouses\":true,\"admin_categories\":true,\"admin_reports\":true,\"admin_audit\":true,\"admin_settings\":true,\"admin_security\":true,\"admin_rooms\":true,\"admin_logs\":true}',1,'2026-02-08 09:55:51'),(3,'technician','Technician - Maintenance Tasks','{\"dashboard\":true,\"maintenance\":true,\"maintenance_dashboard\":true,\"maintenance_parts\":true,\"maintenance_requests\":true,\"admin_rooms\":false}',1,'2026-02-08 09:55:51'),(4,'operation','Operation - Warehouse Tasks','{\"dashboard\":true,\"products\":true,\"movements\":true,\"stock_adjust\":true,\"borrow\":true,\"assets\":true,\"maintenance\":true,\"admin_rooms\":false}',1,'2026-02-08 09:55:51'),(5,'employee','Employee - Basic Access','{\"dashboard\":true,\"borrow\":true,\"maintenance\":true,\"admin_rooms\":false}',1,'2026-02-08 09:55:51');
/*!40000 ALTER TABLE `tbl_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_rooms`
--

DROP TABLE IF EXISTS `tbl_rooms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_rooms` (
  `room_id` int(11) NOT NULL AUTO_INCREMENT,
  `room_code` varchar(20) NOT NULL,
  `room_name` varchar(100) NOT NULL,
  `building` varchar(100) DEFAULT NULL,
  `floor` varchar(20) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`room_id`),
  UNIQUE KEY `tbl_rooms_room_code_key` (`room_code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_rooms`
--

LOCK TABLES `tbl_rooms` WRITE;
/*!40000 ALTER TABLE `tbl_rooms` DISABLE KEYS */;
INSERT INTO `tbl_rooms` VALUES (1,'a101','a101','a','1',1,'2026-02-05 01:11:00'),(3,'a102','a102','A','1',1,'2026-02-08 10:33:24'),(4,'501','ห้องนั่งเล่น ','a','5',1,'2026-02-12 23:41:42');
/*!40000 ALTER TABLE `tbl_rooms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_stock_movements`
--

DROP TABLE IF EXISTS `tbl_stock_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_stock_movements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `p_id` varchar(50) NOT NULL,
  `username` varchar(100) NOT NULL,
  `movement_type` varchar(50) NOT NULL,
  `quantity` int(11) NOT NULL,
  `remarks` text DEFAULT NULL,
  `movement_time` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `p_id` (`p_id`),
  CONSTRAINT `tbl_stock_movements_ibfk_1` FOREIGN KEY (`p_id`) REFERENCES `tbl_products` (`p_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_stock_movements`
--

LOCK TABLES `tbl_stock_movements` WRITE;
/*!40000 ALTER TABLE `tbl_stock_movements` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_stock_movements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_stock_transfers`
--

DROP TABLE IF EXISTS `tbl_stock_transfers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_stock_transfers` (
  `transfer_id` int(11) NOT NULL AUTO_INCREMENT,
  `transfer_number` varchar(50) DEFAULT NULL,
  `from_warehouse_id` int(11) NOT NULL,
  `to_warehouse_id` int(11) NOT NULL,
  `status` enum('pending','in_transit','received','cancelled') DEFAULT 'pending',
  `transfer_date` date DEFAULT NULL,
  `received_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `received_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`transfer_id`),
  UNIQUE KEY `transfer_number` (`transfer_number`),
  KEY `from_warehouse_id` (`from_warehouse_id`),
  KEY `to_warehouse_id` (`to_warehouse_id`),
  CONSTRAINT `tbl_stock_transfers_ibfk_1` FOREIGN KEY (`from_warehouse_id`) REFERENCES `tbl_warehouses` (`warehouse_id`),
  CONSTRAINT `tbl_stock_transfers_ibfk_2` FOREIGN KEY (`to_warehouse_id`) REFERENCES `tbl_warehouses` (`warehouse_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_stock_transfers`
--

LOCK TABLES `tbl_stock_transfers` WRITE;
/*!40000 ALTER TABLE `tbl_stock_transfers` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_stock_transfers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_suppliers`
--

DROP TABLE IF EXISTS `tbl_suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_suppliers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `contact_name` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `tax_id` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_suppliers`
--

LOCK TABLES `tbl_suppliers` WRITE;
/*!40000 ALTER TABLE `tbl_suppliers` DISABLE KEYS */;
INSERT INTO `tbl_suppliers` VALUES (1,'บริษัท มายเพลส จำกัด','test','0880031343',NULL,'9/143 หมู่ที่ 5 ตำบลคลองหนึ่ง อำเภอคลองหลวง จ.ปทุมธานี','2025-12-31 23:36:34',NULL),(2,'บริษัท ตถากรณ์ จำกัด ','ตถากรณ์','021483459',NULL,'หมู่บ้าน ไลฟ์ บางกอก บูเลอวาร์ด ราชพฤษษ์ -รัตนธิเบศร์ ต.บางพลับอ.ปากเกร็ด จ.นนทบุรี 11120','2026-02-12 23:27:50',NULL);
/*!40000 ALTER TABLE `tbl_suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_system_logs`
--

DROP TABLE IF EXISTS `tbl_system_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_system_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `action` varchar(50) NOT NULL,
  `entity` varchar(50) DEFAULT NULL,
  `entity_id` varchar(50) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `username` varchar(100) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `tbl_system_logs_action_idx` (`action`),
  KEY `tbl_system_logs_entity_idx` (`entity`),
  KEY `tbl_system_logs_username_idx` (`username`),
  KEY `tbl_system_logs_user_id_idx` (`user_id`),
  CONSTRAINT `tbl_system_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`p_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_system_logs`
--

LOCK TABLES `tbl_system_logs` WRITE;
/*!40000 ALTER TABLE `tbl_system_logs` DISABLE KEYS */;
INSERT INTO `tbl_system_logs` VALUES (1,'LOGIN','User','1','User admin logged in',1,'admin','127.0.0.1','2026-02-08 01:25:20'),(2,'LOGIN','User','1','User admin logged in',1,'admin','::1','2026-02-08 08:36:04'),(3,'LOGIN','User','1','User admin logged in',1,'admin','::1','2026-02-08 09:34:57'),(4,'LOGIN','User','1','User admin logged in',1,'admin','127.0.0.1','2026-02-08 17:39:30'),(5,'UPDATE','Room','1','Deactivated room: a101',1,'admin','unknown','2026-02-08 19:23:27'),(6,'UPDATE','Room','1','Activated room: a101',1,'admin','unknown','2026-02-08 19:23:32'),(7,'UPDATE','Room','1','Deactivated room: a101',1,'admin','unknown','2026-02-08 20:06:09'),(8,'UPDATE','Room','3','Deactivated room: a102',1,'admin','unknown','2026-02-08 20:06:10'),(9,'UPDATE','Room','1','Activated room: a101',1,'admin','unknown','2026-02-08 20:06:13'),(10,'UPDATE','Room','3','Activated room: a102',1,'admin','unknown','2026-02-08 20:06:14'),(11,'LOGIN','User','1','User admin logged in',1,'admin','127.0.0.1','2026-02-08 21:02:00'),(12,'LOGIN','User','1','User admin logged in',1,'admin','127.0.0.1','2026-02-09 00:52:32'),(13,'LOGIN','User','1','User admin logged in',1,'admin','127.0.0.1','2026-02-09 01:02:13'),(14,'LOGIN','User','1','User admin logged in',1,'admin','192.168.1.2','2026-02-09 22:48:49'),(15,'LOGIN','User','1','User admin logged in',1,'admin','192.168.1.2','2026-02-10 20:53:48'),(16,'LOGIN','User','1','User admin logged in',1,'admin','192.168.1.2','2026-02-11 23:26:07'),(17,'LOGIN','User','1','User admin logged in',1,'admin','192.168.1.2','2026-02-12 21:40:43'),(18,'LOGIN','User','1','User admin logged in',1,'admin','192.168.1.2','2026-02-12 23:19:46'),(19,'UPDATE','Product','D003','Updated product: ถุงขยะ Size 18*20',1,'admin','unknown','2026-02-12 23:29:09'),(20,'LOGIN','User','1','User admin logged in',1,'admin','192.168.1.239','2026-02-12 23:40:22'),(21,'CREATE','Room','4','Created room: 501 - ห้องนั่งเล่น ',1,'admin','unknown','2026-02-12 23:41:42'),(22,'LOGIN','User','1','User admin logged in',1,'admin','::1','2026-02-13 02:55:49'),(23,'UPDATE','Role','1','Updated permissions for role: admin',1,'admin','unknown','2026-02-13 02:58:21'),(24,'UPDATE','Role','2','Updated permissions for role: manager',1,'admin','unknown','2026-02-13 02:58:21'),(25,'UPDATE','Role','3','Updated permissions for role: technician',1,'admin','unknown','2026-02-13 02:58:21'),(26,'UPDATE','Role','4','Updated permissions for role: operation',1,'admin','unknown','2026-02-13 02:58:21'),(27,'UPDATE','Role','5','Updated permissions for role: employee',1,'admin','unknown','2026-02-13 02:58:21'),(28,'LOGIN','User','1','User admin logged in',1,'admin','::1','2026-02-14 03:35:11');
/*!40000 ALTER TABLE `tbl_system_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_system_settings`
--

DROP TABLE IF EXISTS `tbl_system_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_system_settings` (
  `setting_key` varchar(100) NOT NULL,
  `setting_value` longtext NOT NULL,
  `description` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_system_settings`
--

LOCK TABLES `tbl_system_settings` WRITE;
/*!40000 ALTER TABLE `tbl_system_settings` DISABLE KEYS */;
INSERT INTO `tbl_system_settings` VALUES ('allowedIPs','[]','Security Setting: allowedIPs','2026-02-08 10:30:53'),('csrfEnabled','true','Security Setting: csrfEnabled','2026-02-08 10:30:53'),('debug_test_key','debug_value_1770571197720','Debug Test','2026-02-08 10:19:57'),('ipWhitelistEnabled','false','Security Setting: ipWhitelistEnabled','2026-02-08 10:30:53'),('loginProtectionEnabled','true','Security Setting: loginProtectionEnabled','2026-02-08 10:21:51'),('maxRequests','100','Security Setting: maxRequests','2026-02-08 10:30:53'),('overdue_alerts_enabled','true',NULL,'2026-02-08 10:00:15'),('rateLimitEnabled','true','Security Setting: rateLimitEnabled','2026-02-08 10:30:53'),('security_lockout_duration','5','Security Setting: security_lockout_duration','2026-02-08 10:21:51'),('security_log_retention_days','50','Security Setting: security_log_retention_days','2026-02-08 10:21:51'),('security_max_attempts','5','Security Setting: security_max_attempts','2026-02-08 10:21:51'),('windowWindow','60000','Security Setting: windowWindow','2026-02-08 10:30:53');
/*!40000 ALTER TABLE `tbl_system_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_technicians`
--

DROP TABLE IF EXISTS `tbl_technicians`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_technicians` (
  `tech_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `specialty` varchar(100) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `line_user_id` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`tech_id`),
  KEY `tbl_technicians_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_technicians`
--

LOCK TABLES `tbl_technicians` WRITE;
/*!40000 ALTER TABLE `tbl_technicians` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_technicians` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_transfer_items`
--

DROP TABLE IF EXISTS `tbl_transfer_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_transfer_items` (
  `item_id` int(11) NOT NULL AUTO_INCREMENT,
  `transfer_id` int(11) NOT NULL,
  `p_id` varchar(50) NOT NULL,
  `quantity` int(11) NOT NULL,
  `received_qty` int(11) DEFAULT 0,
  PRIMARY KEY (`item_id`),
  KEY `p_id` (`p_id`),
  KEY `transfer_id` (`transfer_id`),
  CONSTRAINT `tbl_transfer_items_ibfk_1` FOREIGN KEY (`transfer_id`) REFERENCES `tbl_stock_transfers` (`transfer_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_transfer_items`
--

LOCK TABLES `tbl_transfer_items` WRITE;
/*!40000 ALTER TABLE `tbl_transfer_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_transfer_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_users`
--

DROP TABLE IF EXISTS `tbl_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_users` (
  `p_id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `role_id` int(11) DEFAULT 3,
  `password` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'employee',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `line_user_id` varchar(100) DEFAULT NULL,
  `failed_attempts` int(11) NOT NULL DEFAULT 0,
  `locked_until` datetime DEFAULT NULL,
  PRIMARY KEY (`p_id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_users`
--

LOCK TABLES `tbl_users` WRITE;
/*!40000 ALTER TABLE `tbl_users` DISABLE KEYS */;
INSERT INTO `tbl_users` VALUES (1,'admin',3,'$2b$10$tLqplexKwj7A2SlfX1N6UOzTA1awsYGm/yd10y8vzIztXecAFSeqm','admin','2025-12-26 13:28:54',NULL,0,NULL),(3,'nong',1,'$2b$10$/LBw0SriudhGK7niD7UMIu9Dn4ph1s2rBzOnerm22sVoC1RQedTYm','admin','2025-12-30 14:24:24',NULL,0,NULL);
/*!40000 ALTER TABLE `tbl_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_warehouse_stock`
--

DROP TABLE IF EXISTS `tbl_warehouse_stock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_warehouse_stock` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `warehouse_id` int(11) NOT NULL,
  `p_id` varchar(50) NOT NULL,
  `quantity` int(11) DEFAULT 0,
  `min_stock` int(11) DEFAULT 0,
  `last_updated` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_warehouse_product` (`warehouse_id`,`p_id`),
  KEY `p_id` (`p_id`),
  CONSTRAINT `tbl_warehouse_stock_ibfk_1` FOREIGN KEY (`warehouse_id`) REFERENCES `tbl_warehouses` (`warehouse_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_warehouse_stock`
--

LOCK TABLES `tbl_warehouse_stock` WRITE;
/*!40000 ALTER TABLE `tbl_warehouse_stock` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_warehouse_stock` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_warehouses`
--

DROP TABLE IF EXISTS `tbl_warehouses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tbl_warehouses` (
  `warehouse_id` int(11) NOT NULL AUTO_INCREMENT,
  `warehouse_code` varchar(20) DEFAULT NULL,
  `warehouse_name` varchar(100) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `manager` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `is_default` tinyint(1) DEFAULT 0,
  `active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`warehouse_id`),
  UNIQUE KEY `warehouse_code` (`warehouse_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_warehouses`
--

LOCK TABLES `tbl_warehouses` WRITE;
/*!40000 ALTER TABLE `tbl_warehouses` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_warehouses` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-14 17:35:13
