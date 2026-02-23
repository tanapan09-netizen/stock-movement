-- MariaDB dump 10.19  Distrib 10.4.27-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: stock_db
-- ------------------------------------------------------
-- Server version	10.4.27-MariaDB

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
  PRIMARY KEY (`id`),
  KEY `borrow_request_id` (`borrow_request_id`),
  KEY `p_id` (`p_id`),
  CONSTRAINT `borrow_items_ibfk_1` FOREIGN KEY (`borrow_request_id`) REFERENCES `borrow_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `p_id` varchar(50) NOT NULL,
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
  KEY `fk_action_log_products` (`p_id`)
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
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_categories`
--

LOCK TABLES `tbl_categories` WRITE;
/*!40000 ALTER TABLE `tbl_categories` DISABLE KEYS */;
INSERT INTO `tbl_categories` VALUES (1,'Office',NULL),(2,'เครื่องใช้',NULL),(3,'เครื่องปรับอากาศ',NULL),(4,'แม่บ้าน',NULL),(5,'ไฟฟ้า',NULL),(6,'งานช่าง',NULL),(7,'ประปา',NULL),(8,'สวน',NULL),(9,'สิ่งทอ',NULL),(10,'อุปกรณ์',NULL),(11,'แบตเตอรี่',NULL);
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_po_items`
--

LOCK TABLES `tbl_po_items` WRITE;
/*!40000 ALTER TABLE `tbl_po_items` DISABLE KEYS */;
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
  KEY `p_id` (`p_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
INSERT INTO `tbl_products` VALUES ('A001',NULL,1,'Office','กระดาษ A4','',NULL,NULL,'กล่อง',47,NULL,NULL,215.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('A002',NULL,1,'Office','คัตเตอร์','',NULL,NULL,'อัน',48,NULL,NULL,301.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('A003',NULL,1,'Office','ซองถนอมเอกสาร A4','',NULL,NULL,'แพ็ค',5,NULL,NULL,361.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('A004',NULL,1,'Office','ซองใส A4','',NULL,NULL,'แพ็ค',10,NULL,NULL,404.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('A005',NULL,1,'Office','เสื้อ Raya (L)','',NULL,NULL,'ตัว',32,NULL,NULL,434.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('A006',NULL,1,'Office','เสื้อ Raya (M)','',NULL,NULL,'ตัว',35,NULL,NULL,461.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('A007',NULL,1,'Office','เสื้อ Raya (S)','',NULL,NULL,'ตัว',31,NULL,NULL,12.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('A008',NULL,1,'Office','เสื้อ Raya (XL)','',NULL,NULL,'ตัว',43,NULL,NULL,139.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('A009',NULL,1,'Office','หน้ากาก N95','',NULL,NULL,'กล่อง',28,NULL,NULL,161.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('A010',NULL,1,'Office','เทปใส 18MM','',NULL,NULL,'ชิ้น',6,NULL,NULL,375.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('A011',NULL,1,'Office','เทปกาว 2 หน้า บาง','',NULL,NULL,'ชิ้น',34,NULL,NULL,405.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('A012',NULL,1,'Office','เทปกาว 2 หน้า หนา','',NULL,NULL,'ชิ้น',10,NULL,NULL,399.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('B001',NULL,2,'เครื่องใช้','กระดาษทิชชู','',NULL,NULL,'แพ็ค',34,NULL,NULL,283.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('B002',NULL,2,'เครื่องใช้','กระทะ','',NULL,NULL,'อัน',45,NULL,NULL,206.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('B003',NULL,2,'เครื่องใช้','กระบวย','',NULL,NULL,'อัน',29,NULL,NULL,171.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('B004',NULL,2,'เครื่องใช้','แก้วน้ำ','',NULL,NULL,'ใบ',7,NULL,NULL,228.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('B005',NULL,2,'เครื่องใช้','เขียง เล็ก','',NULL,NULL,'อัน',34,NULL,NULL,128.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('B006',NULL,2,'เครื่องใช้','เขียง ใหญ่','',NULL,NULL,'อัน',10,NULL,NULL,435.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('B007',NULL,2,'เครื่องใช้','จาน','',NULL,NULL,'ใบ',32,NULL,NULL,311.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('B008',NULL,2,'เครื่องใช้','จานกลาง','',NULL,NULL,'ใบ',35,NULL,NULL,244.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('B009',NULL,2,'เครื่องใช้','ช้อน','',NULL,NULL,'คัน',31,NULL,NULL,274.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('B010',NULL,2,'เครื่องใช้','ช้อนกาแฟ','',NULL,NULL,'ใบ',45,NULL,NULL,140.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('B011',NULL,2,'เครื่องใช้','ชุดถ้วยกาแฟ','',NULL,NULL,'ใบ',35,NULL,NULL,357.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('B012',NULL,2,'เครื่องใช้','ตะหลิว','',NULL,NULL,'อัน',39,NULL,NULL,378.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('B013',NULL,2,'เครื่องใช้','ตะหลิว ร่อง','',NULL,NULL,'อัน',40,NULL,NULL,317.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('B014',NULL,2,'เครื่องใช้','ถ้วย เล็ก','',NULL,NULL,'ใบ',35,NULL,NULL,441.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('B015',NULL,2,'เครื่องใช้','ถ้วย ใหญ่','',NULL,NULL,'ใบ',48,NULL,NULL,268.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('B016',NULL,2,'เครื่องใช้','ถังขยะ เล็ก','',NULL,NULL,'ตัว',43,NULL,NULL,494.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('B017',NULL,2,'เครื่องใช้','ถังขยะ ใหญ่','',NULL,NULL,'ตัว',20,NULL,NULL,188.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('B018',NULL,2,'เครื่องใช้','ทัพพี','',NULL,NULL,'อัน',10,NULL,NULL,427.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('B019',NULL,2,'เครื่องใช้','มีด กลาง','',NULL,NULL,'เล่ม',30,NULL,NULL,91.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('B020',NULL,2,'เครื่องใช้','มีด เล็ก','',NULL,NULL,'เล่ม',27,NULL,NULL,147.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('B021',NULL,2,'เครื่องใช้','มีด ใหญ่','',NULL,NULL,'เล่ม',40,NULL,NULL,453.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('B022',NULL,2,'เครื่องใช้','มีดสเต็ก','',NULL,NULL,'เล่ม',27,NULL,NULL,345.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('B023',NULL,2,'เครื่องใช้','ส้อม','',NULL,NULL,'คัน',8,NULL,NULL,357.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('B024',NULL,2,'เครื่องใช้','หม้อ เล็ก','',NULL,NULL,'ใบ',45,NULL,NULL,248.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('B025',NULL,2,'เครื่องใช้','หม้อ ใหญ่','',NULL,NULL,'ใบ',16,NULL,NULL,159.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('C001',NULL,3,'เครื่องปรับอากาศ','มอเตอร์บานสวิง แอร์ รับแขก','',NULL,NULL,'ตัว',30,NULL,NULL,41.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('C002',NULL,3,'เครื่องปรับอากาศ','มอเตอร์บานสวิง แอร์ 4 ทิศทาง','',NULL,NULL,'ตัว',9,NULL,NULL,208.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('C003',NULL,3,'เครื่องปรับอากาศ','มอเตอร์บานสวิง แอร์ นอนเล็ก','',NULL,NULL,'ตัว',40,NULL,NULL,420.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('C004',NULL,3,'เครื่องปรับอากาศ','Sensor อุณหภูมิ แอร์ 4 ทิศทาง','',NULL,NULL,'ตัว',34,NULL,NULL,485.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('C005',NULL,3,'เครื่องปรับอากาศ','Sensor อุณหภูมิ แอร์ รับแขก','',NULL,NULL,'ตัว',44,NULL,NULL,174.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('C006',NULL,3,'เครื่องปรับอากาศ','Sensor อุณหภูมิ แอร์ นอนเล็ก','',NULL,NULL,'ตัว',24,NULL,NULL,386.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('C011',NULL,3,'เครื่องปรับอากาศ','น้ำยาแอร์ R22','ส่วนกลาง',NULL,NULL,'ถัง',30,NULL,NULL,419.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('C012',NULL,3,'เครื่องปรับอากาศ','น้ำยาแอร์ R32','Office',NULL,NULL,'ถัง',28,NULL,NULL,436.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('C013',NULL,3,'เครื่องปรับอากาศ','น้ำยาแอร์ R410A','Type ABC',NULL,NULL,'ถัง',47,NULL,NULL,426.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('C014',NULL,3,'เครื่องปรับอากาศ','โฟมล้างแอร์','',NULL,NULL,'กระป๋อง',9,NULL,NULL,321.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('C015',NULL,3,'เครื่องปรับอากาศ','เทปพันท่อแอร์','',NULL,NULL,'อัน',34,NULL,NULL,317.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('D001',NULL,4,'แม่บ้าน','Baking Soda','',NULL,NULL,'ซอง',49,NULL,NULL,121.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('D002',NULL,4,'แม่บ้าน','ซักผ้าขาว','',NULL,NULL,'ถัง',47,NULL,NULL,136.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('D003',NULL,4,'แม่บ้าน','ถุงขยะ Size 18','',NULL,NULL,'กระสอบ',39,NULL,NULL,307.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('D004',NULL,4,'แม่บ้าน','ถุงขยะ Size 22','สวน',NULL,NULL,'กระสอบ',6,NULL,NULL,136.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('D005',NULL,4,'แม่บ้าน','ถุงขยะ ดำ','',NULL,NULL,'แพ็ค',41,NULL,NULL,241.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('D006',NULL,4,'แม่บ้าน','น้ำยาฆ่าเชื้อแบคทีเรีย','',NULL,NULL,'แกลลอน',49,NULL,NULL,298.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('D007',NULL,4,'แม่บ้าน','น้ำยาเช็ดกระจก','',NULL,NULL,'ขวด',28,NULL,NULL,266.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('D008',NULL,4,'แม่บ้าน','น้ำยาถูพื้น','',NULL,NULL,'ขวด',35,NULL,NULL,427.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('D009',NULL,4,'แม่บ้าน','น้ำยาปรับผ้านุ่ม','',NULL,NULL,'ถัง',39,NULL,NULL,347.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('D010',NULL,4,'แม่บ้าน','น้ำยาฟอกขาว','',NULL,NULL,'ถัง',41,NULL,NULL,444.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('D011',NULL,4,'แม่บ้าน','น้ำยารีดผ้า','',NULL,NULL,'ขวด',41,NULL,NULL,189.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('D012',NULL,4,'แม่บ้าน','น้ำยาล้างจาน','',NULL,NULL,'ขวด',30,NULL,NULL,95.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('D013',NULL,4,'แม่บ้าน','น้ำยาล้างมือ','',NULL,NULL,'ขวด',24,NULL,NULL,387.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('D014',NULL,4,'แม่บ้าน','น้ำยาล้างห้องน้ำ','',NULL,NULL,'ขวด',26,NULL,NULL,172.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('D015',NULL,4,'แม่บ้าน','น้ำส้มสายชู','',NULL,NULL,'แกลลอน',7,NULL,NULL,178.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('D016',NULL,4,'แม่บ้าน','ผงซักฟอก เซฟเอ','',NULL,NULL,'ถัง',43,NULL,NULL,366.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('D017',NULL,4,'แม่บ้าน','ผงซักฟอก สระว่ายน้ำ','',NULL,NULL,'ถัง',8,NULL,NULL,308.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('D018',NULL,4,'แม่บ้าน','สเตคลีน','',NULL,NULL,'ขวด',42,NULL,NULL,431.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('D019',NULL,4,'แม่บ้าน','อาทกระป๋อง กำจัดยุง','',NULL,NULL,'ขวด',45,NULL,NULL,242.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('E001',NULL,5,'ไฟฟ้า','LED E27 7W Day','ไฟ office',NULL,NULL,'หลอด',8,NULL,NULL,395.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('E002',NULL,5,'ไฟฟ้า','LED E27 7W Warm','ไฟ office',NULL,NULL,'หลอด',33,NULL,NULL,262.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('E003',NULL,5,'ไฟฟ้า','ฝาสวิต 3 ช่อง Siemens','',NULL,NULL,'ตัว',46,NULL,NULL,115.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('E004',NULL,5,'ไฟฟ้า','ฝาสวิต 2 ช่อง Siemens','',NULL,NULL,'ตัว',37,NULL,NULL,270.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('E005',NULL,5,'ไฟฟ้า','ฝาสวิต 1 ช่อง Siemens','',NULL,NULL,'ตัว',42,NULL,NULL,13.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('E006',NULL,5,'ไฟฟ้า','สวิตไฟตู้เสื้อผ้า','',NULL,NULL,'ตัว',6,NULL,NULL,228.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('E007',NULL,5,'ไฟฟ้า','Adapter 2A','',NULL,NULL,'ตัว',34,NULL,NULL,110.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('E008',NULL,5,'ไฟฟ้า','หม้อแปลง 220-240V 60W','สำหรับไฟห้องพัก',NULL,NULL,'ตัว',11,NULL,NULL,348.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('E009',NULL,5,'ไฟฟ้า','Halogen 220V75W Par30s E27','',NULL,NULL,'หลอด',39,NULL,NULL,421.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('E010',NULL,5,'ไฟฟ้า','LED 220V6W T8 Day','ไฟกระจกห้องน้ำ',NULL,NULL,'หลอด',22,NULL,NULL,72.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('E011',NULL,5,'ไฟฟ้า','LED 220V6W T8 Warm','ไฟกระจกห้องน้ำ',NULL,NULL,'หลอด',34,NULL,NULL,68.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('E020',NULL,5,'ไฟฟ้า','LED Philips 5W','',NULL,NULL,'หลอด',10,NULL,NULL,115.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('E021',NULL,5,'ไฟฟ้า','LED 3W E14','เครื่องดูดควัน',NULL,NULL,'หลอด',35,NULL,NULL,361.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('E027',NULL,5,'ไฟฟ้า','Lumax E27 15W Day','',NULL,NULL,'หลอด',49,NULL,NULL,469.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('E028',NULL,5,'ไฟฟ้า','Modem','',NULL,NULL,'ตัว',46,NULL,NULL,272.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('E029',NULL,5,'ไฟฟ้า','Hot Pot','',NULL,NULL,'ตัว',32,NULL,NULL,434.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('E031',NULL,5,'ไฟฟ้า','เครื่องปิ้งขนมปัง','',NULL,NULL,'ตัว',17,NULL,NULL,363.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('E032',NULL,5,'ไฟฟ้า','โคมไฟ Downlight 12V','',NULL,NULL,'ตัว',29,NULL,NULL,16.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('E034',NULL,5,'ไฟฟ้า','รีโมท TV','',NULL,NULL,'อัน',46,NULL,NULL,451.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('E035',NULL,5,'ไฟฟ้า','รีโมทแอร์','',NULL,NULL,'อัน',48,NULL,NULL,237.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('E036',NULL,5,'ไฟฟ้า','รีโมทแอร์ 4 ทิศทาง','',NULL,NULL,'อัน',8,NULL,NULL,311.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('E037',NULL,5,'ไฟฟ้า','สวิตไฟเดี่ยว','',NULL,NULL,'ตัว',24,NULL,NULL,344.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('E038',NULL,5,'ไฟฟ้า','หลอดไฟตู้เย็น Sharp','',NULL,NULL,'หลอด',5,NULL,NULL,290.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('E039',NULL,5,'ไฟฟ้า','ไฟเส้น LED','ไฟหลืบเพดาน',NULL,NULL,'เส้น',37,NULL,NULL,409.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('F001',NULL,6,'งานช่าง','Wall Putty Pine Color','Furniture',NULL,NULL,'ถัง',33,NULL,NULL,186.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('F002',NULL,6,'งานช่าง','Wall Putty Walnut Color','พื้นไม้',NULL,NULL,'ถัง',46,NULL,NULL,182.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('F003',NULL,6,'งานช่าง','กันซึมเหลว','ห้องน้ำ',NULL,NULL,'ถุง',39,NULL,NULL,344.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('F004',NULL,6,'งานช่าง','กาวตะปูหลอด','',NULL,NULL,'ถุง',5,NULL,NULL,184.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('F005',NULL,6,'งานช่าง','กาวร้อน','',NULL,NULL,'หลอด',40,NULL,NULL,367.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('F006',NULL,6,'งานช่าง','เกรียงโป๊ว 4 นิ้ว','',NULL,NULL,'อัน',47,NULL,NULL,294.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('F007',NULL,6,'งานช่าง','ซิลิโคน ขาว','',NULL,NULL,'หลอด',19,NULL,NULL,358.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('F008',NULL,6,'งานช่าง','ซิลิโคน ดำ','',NULL,NULL,'หลอด',39,NULL,NULL,409.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('F009',NULL,6,'งานช่าง','ซิลิโคน ใส','',NULL,NULL,'หลอด',44,NULL,NULL,470.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('F010',NULL,6,'งานช่าง','ทินเนอร์ 41','ผสมยูรีเทน',NULL,NULL,'แกลลอน',7,NULL,NULL,136.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('F011',NULL,6,'งานช่าง','ทินเนอร์ AAA','ล้างสี',NULL,NULL,'แกลลอน',36,NULL,NULL,239.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('F012',NULL,6,'งานช่าง','น้ำยาล้างคอยล์แอร์','',NULL,NULL,'ขวด',18,NULL,NULL,289.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('F013',NULL,6,'งานช่าง','ปูนกาว','พื้นกระเบื้อง',NULL,NULL,'ถุง',23,NULL,NULL,229.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('F014',NULL,6,'งานช่าง','น้ำยาไล่ความชื้น','',NULL,NULL,'ขวด',13,NULL,NULL,266.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('F015',NULL,6,'งานช่าง','ยาแนว สีขาวไข่มุก','',NULL,NULL,'ถุง',36,NULL,NULL,147.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('F016',NULL,6,'งานช่าง','ยาแนว สีเทาปะการัง 1KG','',NULL,NULL,'ถุง',47,NULL,NULL,414.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('F017',NULL,6,'งานช่าง','ยาแนว สีเทาปะการัง 5KG','',NULL,NULL,'ถุง',32,NULL,NULL,152.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('F018',NULL,6,'งานช่าง','ยูรีเทน','ทาพื้นให้เงา',NULL,NULL,'แกลลอน',14,NULL,NULL,490.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('F019',NULL,6,'งานช่าง','สเปรย์ทดสอบควันและความร้อน','',NULL,NULL,'กระป๋อง',16,NULL,NULL,21.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('F020',NULL,6,'งานช่าง','สเปรย์ล้างแอร์ แบบกรด','',NULL,NULL,'กระป๋อง',33,NULL,NULL,97.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('F021',NULL,6,'งานช่าง','สเปรย์หล่อลื่น Sonax','',NULL,NULL,'กระป๋อง',23,NULL,NULL,411.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('F022',NULL,6,'งานช่าง','จารบี Grease spray','',NULL,NULL,'กระป๋อง',13,NULL,NULL,284.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('F023',NULL,6,'งานช่าง','สีฝุ่น สีแดง','สำหรับไม้ปาเก้',NULL,NULL,'ถุง',34,NULL,NULL,178.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('F024',NULL,6,'งานช่าง','Contact cleaner','',NULL,NULL,'กระป๋อง',38,NULL,NULL,28.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('F025',NULL,6,'งานช่าง','Sticker remover','',NULL,NULL,'กระป๋อง',40,NULL,NULL,89.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('F026',NULL,6,'งานช่าง','ครีมทำความสะอาดโลหะ','',NULL,NULL,'หลอด',33,NULL,NULL,348.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('F027',NULL,6,'งานช่าง','กระดาษทราย เบอร์ 0','',NULL,NULL,'แผ่น',42,NULL,NULL,486.00,20,NULL,1,NULL,'2025-12-30 09:49:58'),('F028',NULL,6,'งานช่าง','กระดาษทราย เบอร์ 2','',NULL,NULL,'แผ่น',18,NULL,NULL,396.00,20,NULL,1,NULL,'2025-12-30 09:49:58'),('F029',NULL,6,'งานช่าง','กระดาษทราย เบอร์ 3','',NULL,NULL,'แผ่น',47,NULL,NULL,21.00,20,NULL,1,NULL,'2025-12-30 09:49:58'),('F030',NULL,6,'งานช่าง','กระดาษทรายละเอียด 320','',NULL,NULL,'แผ่น',44,NULL,NULL,377.00,20,NULL,1,NULL,'2025-12-30 09:49:58'),('F035',NULL,6,'งานช่าง','เทปกาวย่น 1 นิ้ว','',NULL,NULL,'ม้วน',30,NULL,NULL,345.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('F036',NULL,6,'งานช่าง','เทปกาวย่น 2 นิ้ว','',NULL,NULL,'ม้วน',12,NULL,NULL,94.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('F037',NULL,6,'งานช่าง','เทปพันเกลียว ปะปา','',NULL,NULL,'ม้วน',9,NULL,NULL,405.00,20,NULL,1,NULL,'2025-12-30 09:49:58'),('F038',NULL,6,'งานช่าง','เทปพันสายไฟ','',NULL,NULL,'ม้วน',7,NULL,NULL,266.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('F039',NULL,6,'งานช่าง','เทปอะลูมิเนียม','',NULL,NULL,'ม้วน',46,NULL,NULL,102.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('F047',NULL,6,'งานช่าง','สีทาฝ้าเพดาน','',NULL,NULL,'ถัง',24,NULL,NULL,193.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('F048',NULL,6,'งานช่าง','สีน้ำมัน ทาเฟอร์นิเจอร์','',NULL,NULL,'ถัง',24,NULL,NULL,158.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('F049',NULL,6,'งานช่าง','Battery 12V2.9AH','',NULL,NULL,'ตัว',42,NULL,NULL,204.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('F050',NULL,6,'งานช่าง','กระดาษทราย เบอร์ 1','',NULL,NULL,'แผ่น',45,NULL,NULL,47.00,20,NULL,1,NULL,'2025-12-30 09:49:58'),('F051',NULL,6,'งานช่าง','กระดาษทราย เบอร์ 150','',NULL,NULL,'แผ่น',5,NULL,NULL,105.00,20,NULL,1,NULL,'2025-12-30 09:49:58'),('F052',NULL,6,'งานช่าง','กระดาษทราย เบอร์ 180','',NULL,NULL,'แผ่น',21,NULL,NULL,371.00,20,NULL,1,NULL,'2025-12-30 09:49:58'),('G001',NULL,7,'ประปา','Rain shower','',NULL,NULL,'ตัว',40,NULL,NULL,62.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('G002',NULL,7,'ประปา','ก๊อกอ่างล้างจาน','',NULL,NULL,'ตัว',44,NULL,NULL,166.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('G003',NULL,7,'ประปา','ก๊อกอ่างล้างหน้า','',NULL,NULL,'ตัว',5,NULL,NULL,144.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('G004',NULL,7,'ประปา','คอท่อน้ำทิ้งอ่างล้างหน้า','',NULL,NULL,'ชุด',24,NULL,NULL,216.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('G005',NULL,7,'ประปา','ชุดฝักบัวอาบน้ำ','',NULL,NULL,'ชุด',12,NULL,NULL,145.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('G006',NULL,7,'ประปา','ชุดฝาท่อน้ำทิ้ง 4 นิ้ว','ระเบียง',NULL,NULL,'ชุด',25,NULL,NULL,69.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('G007',NULL,7,'ประปา','ชุดสายฉีดชำระ','',NULL,NULL,'ชุด',41,NULL,NULL,389.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('G008',NULL,7,'ประปา','ปากกรองก๊อกน้ำ เกลียวใน','',NULL,NULL,'ตัว',36,NULL,NULL,260.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('G009',NULL,7,'ประปา','วาล์วก๊อกน้ำ 4 หุน','',NULL,NULL,'ตัว',9,NULL,NULL,122.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('G010',NULL,7,'ประปา','สต็อบวาล์ว 1/2','',NULL,NULL,'ตัว',22,NULL,NULL,311.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('G011',NULL,7,'ประปา','สายฉีดชำระ สาย','',NULL,NULL,'เส้น',33,NULL,NULL,198.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('G012',NULL,7,'ประปา','สายฉีดชำระ หัว','',NULL,NULL,'เส้น',49,NULL,NULL,50.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('G013',NULL,7,'ประปา','สายฝักบัวอาบน้ำ 150CM','',NULL,NULL,'เส้น',8,NULL,NULL,135.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('G014',NULL,7,'ประปา','หัวฝักบัวอาบน้ำ','',NULL,NULL,'ตัว',22,NULL,NULL,25.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('G015',NULL,7,'ประปา','ก๊อกน้ำสนาม 4 หุน','',NULL,NULL,'ตัว',37,NULL,NULL,203.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('G016',NULL,7,'ประปา','ก๊อกน้ำสนาม 5 หุน','',NULL,NULL,'ตัว',23,NULL,NULL,439.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('G017',NULL,7,'ประปา','ข้อต่อทองเหลือง','',NULL,NULL,'ตัว',44,NULL,NULL,109.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('G018',NULL,7,'ประปา','สะดืออ่างล้างจาน 3.5 นิ้ว','',NULL,NULL,'ตัว',13,NULL,NULL,195.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('G025',NULL,7,'ประปา','สะดืออ่างอาบน้ำ','',NULL,NULL,'ตัว',20,NULL,NULL,150.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('G026',NULL,7,'ประปา','สะดืออ่างล้างหน้า','',NULL,NULL,'ตัว',10,NULL,NULL,156.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('H001',NULL,8,'สวน','ปุ๋ยเร่งต้น','',NULL,NULL,'ถุง',30,NULL,NULL,321.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('H002',NULL,8,'สวน','ปุ๋ยเร่งดอก','',NULL,NULL,'ถุง',25,NULL,NULL,146.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('H003',NULL,8,'สวน','กำจัดเพลี้ย','',NULL,NULL,'ถุง',33,NULL,NULL,249.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('H004',NULL,8,'สวน','ปุ๋ยเร่งต้น เร่งใบ','',NULL,NULL,'ถุง',39,NULL,NULL,309.00,2,NULL,1,NULL,'2025-12-30 09:49:58'),('H005',NULL,8,'สวน','ดินมูลไส้เดือน','',NULL,NULL,'ถุง',45,NULL,NULL,296.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('H006',NULL,8,'สวน','ดินใบก้ามปู','',NULL,NULL,'ถุง',15,NULL,NULL,54.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('H007',NULL,8,'สวน','หัวฉีดสเปรย์เจ็ทยาว','ฝั่งสะพาน',NULL,NULL,'ชุด',26,NULL,NULL,351.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('H008',NULL,8,'สวน','หัวฉีดสเปรย์ปีกผีเสื้อเล็ก','หน้าตึก',NULL,NULL,'ชุด',36,NULL,NULL,114.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('H009',NULL,8,'สวน','มินิสปริงเกลอร์ ใบ D','หน้าป้าย',NULL,NULL,'ชุด',7,NULL,NULL,487.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('I001',NULL,9,'สิ่งทอ','ถุงซักน้ำ','',NULL,NULL,'ถุง',12,NULL,NULL,126.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('I002',NULL,9,'สิ่งทอ','ถุงซักแห้ง','',NULL,NULL,'ถุง',36,NULL,NULL,138.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('I003',NULL,9,'สิ่งทอ','ปลอกผ้านวม 3 ฟุต','',NULL,NULL,'ผืน',47,NULL,NULL,302.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('I004',NULL,9,'สิ่งทอ','ปลอกผ้านวม 6 ฟุต','',NULL,NULL,'ผืน',34,NULL,NULL,107.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('I005',NULL,9,'สิ่งทอ','ปลอกหมอน','',NULL,NULL,'ผืน',23,NULL,NULL,108.00,20,NULL,1,NULL,'2025-12-30 09:49:58'),('I006',NULL,9,'สิ่งทอ','ผ้าเช็ดตัว','',NULL,NULL,'ผืน',9,NULL,NULL,209.00,20,NULL,1,NULL,'2025-12-30 09:49:58'),('I007',NULL,9,'สิ่งทอ','ผ้าเช็ดเท้า','',NULL,NULL,'ผืน',18,NULL,NULL,222.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('I008',NULL,9,'สิ่งทอ','ผ้าเช็ดมือ','',NULL,NULL,'ผืน',12,NULL,NULL,473.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('I009',NULL,9,'สิ่งทอ','ผ้าปูที่นอน 3 ฟุต','',NULL,NULL,'ผืน',46,NULL,NULL,220.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('I010',NULL,9,'สิ่งทอ','ผ้าปูที่นอน 6 ฟุต','',NULL,NULL,'ผืน',12,NULL,NULL,162.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('I011',NULL,9,'สิ่งทอ','ผ้ารองกันเปื้อน','',NULL,NULL,'ผืน',6,NULL,NULL,141.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('I012',NULL,9,'สิ่งทอ','ผ้าสระว่ายน้ำ','',NULL,NULL,'ผืน',33,NULL,NULL,209.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('I013',NULL,9,'สิ่งทอ','พรม','',NULL,NULL,'ผืน',8,NULL,NULL,124.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('I014',NULL,9,'สิ่งทอ','ไส้ผ้านวม 3 ฟุต','',NULL,NULL,'ผืน',28,NULL,NULL,470.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('I015',NULL,9,'สิ่งทอ','ไส้ผ้านวม 6 ฟุต','',NULL,NULL,'ผืน',21,NULL,NULL,12.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('I016',NULL,9,'สิ่งทอ','หมอน','',NULL,NULL,'ใบ',17,NULL,NULL,108.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('J001',NULL,10,'อุปกรณ์','Cable Tie','',NULL,NULL,'ถุง',19,NULL,NULL,495.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('J002',NULL,10,'อุปกรณ์','Stopper','',NULL,NULL,'ตัว',38,NULL,NULL,182.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('J003',NULL,10,'อุปกรณ์','โซ่คล้องประตู','',NULL,NULL,'ตัว',37,NULL,NULL,397.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('J004',NULL,10,'อุปกรณ์','ท่อน้ำทิ้งเครื่องซักผ้า','',NULL,NULL,'เส้น',21,NULL,NULL,450.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('J005',NULL,10,'อุปกรณ์','ที่แขวนกระดาษทิชชู่','',NULL,NULL,'ตัว',35,NULL,NULL,67.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('J011',NULL,10,'อุปกรณ์','แม่กุญแจล็อคลิ้นชัก','',NULL,NULL,'ชุด',20,NULL,NULL,444.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('J012',NULL,10,'อุปกรณ์','สักหลาด เฟอร์นิเจอร์','',NULL,NULL,'แผ่น',33,NULL,NULL,53.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('J016',NULL,10,'อุปกรณ์','รางเลื่อนลิ้นชัก','',NULL,NULL,'ตัว',12,NULL,NULL,392.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('J021',NULL,10,'อุปกรณ์','บานพับประตู','ประตูห้อง',NULL,NULL,'ตัว',48,NULL,NULL,321.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('J022',NULL,10,'อุปกรณ์','สวิทซ์ปุ่มกด เข้าออก','',NULL,NULL,'ตัว',17,NULL,NULL,419.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('J023',NULL,10,'อุปกรณ์','ถ่าน AA alkaline','',NULL,NULL,'ก้อน',27,NULL,NULL,141.00,20,NULL,1,NULL,'2025-12-30 09:49:58'),('J024',NULL,10,'อุปกรณ์','ถ่าน AA สีดำ','',NULL,NULL,'ก้อน',34,NULL,NULL,421.00,20,NULL,1,NULL,'2025-12-30 09:49:58'),('J025',NULL,10,'อุปกรณ์','ถ่าน AAA alkaline','',NULL,NULL,'ก้อน',39,NULL,NULL,200.00,20,NULL,1,NULL,'2025-12-30 09:49:58'),('J026',NULL,10,'อุปกรณ์','ถ่าน AAA สีดำ','',NULL,NULL,'ก้อน',46,NULL,NULL,220.00,20,NULL,1,NULL,'2025-12-30 09:49:58'),('J027',NULL,10,'อุปกรณ์','ถ่าน CR1220','',NULL,NULL,'ก้อน',18,NULL,NULL,491.00,10,NULL,1,NULL,'2025-12-30 09:49:58'),('J028',NULL,10,'อุปกรณ์','อุปกรณ์ตรวจจับควันไฟ','',NULL,NULL,'ตัว',37,NULL,NULL,316.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('J029',NULL,10,'อุปกรณ์','อุปกรณ์ตรวจจับความร้อน','',NULL,NULL,'ตัว',38,NULL,NULL,95.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('K001',NULL,11,'แบตเตอรี่','แบตเตอรี่แห้ง 12V7.2A','ประตู Core door',NULL,NULL,'ตัว',26,NULL,NULL,496.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('K002',NULL,11,'แบตเตอรี่','แบตเตอรี่แห้ง 12V2.9A','บันไดหนีไฟ',NULL,NULL,'ตัว',15,NULL,NULL,229.00,5,NULL,1,NULL,'2025-12-30 09:49:58'),('K003',NULL,11,'แบตเตอรี่','แบตเตอรี่แห้ง 12V18A','ในห้องพัก',NULL,NULL,'ตัว',34,NULL,NULL,136.00,5,NULL,1,NULL,'2025-12-30 09:49:58');
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_purchase_orders`
--

LOCK TABLES `tbl_purchase_orders` WRITE;
/*!40000 ALTER TABLE `tbl_purchase_orders` DISABLE KEYS */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_roles`
--

LOCK TABLES `tbl_roles` WRITE;
/*!40000 ALTER TABLE `tbl_roles` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_roles` ENABLE KEYS */;
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
  KEY `p_id` (`p_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_suppliers`
--

LOCK TABLES `tbl_suppliers` WRITE;
/*!40000 ALTER TABLE `tbl_suppliers` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_suppliers` ENABLE KEYS */;
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
  PRIMARY KEY (`p_id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_users`
--

LOCK TABLES `tbl_users` WRITE;
/*!40000 ALTER TABLE `tbl_users` DISABLE KEYS */;
INSERT INTO `tbl_users` VALUES (1,'admin',3,'$2b$10$tLqplexKwj7A2SlfX1N6UOzTA1awsYGm/yd10y8vzIztXecAFSeqm','admin','2025-12-26 13:28:54'),(3,'nong',2,'$2b$10$0OX93JSZFGOuiAsgMiob/OGWIC5ec2N.1Bwcum//cHeRvbVTCcl/G','manager','2025-12-30 14:24:24');
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

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','staff','user') NOT NULL DEFAULT 'user',
  `display_name` varchar(191) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-12-30 22:06:08
