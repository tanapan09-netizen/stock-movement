-- Insert Categories for Stock Movement Pro
USE stock_db;
SET NAMES utf8mb4;

-- Insert all categories used in products
INSERT INTO tbl_categories (cat_name) VALUES 
('Office'),
('เครื่องใช้'),
('เครื่องปรับอากาศ'),
('แม่บ้าน'),
('ไฟฟ้า'),
('งานช่าง'),
('ประปา'),
('สวน'),
('สิ่งทอ'),
('อุปกรณ์'),
('แบตเตอรี่')
ON DUPLICATE KEY UPDATE cat_name = VALUES(cat_name);

SELECT 'Categories imported!' AS Status, COUNT(*) AS Total FROM tbl_categories;
