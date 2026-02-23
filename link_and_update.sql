-- Link Products to Categories and Add Data
USE stock_db;
SET NAMES utf8mb4;

-- Step 1: Update cat_id based on main_category matching cat_name
UPDATE tbl_products p
JOIN tbl_categories c ON p.main_category = c.cat_name
SET p.cat_id = c.cat_id;

-- Step 2: Add sample prices (random 10-500)
UPDATE tbl_products 
SET price_unit = FLOOR(RAND() * 490) + 10
WHERE price_unit = 0 OR price_unit IS NULL;

-- Step 3: Add sample stock quantities (random 5-50)
UPDATE tbl_products 
SET p_count = FLOOR(RAND() * 45) + 5
WHERE p_count = 0 OR p_count IS NULL;

-- Verify the update
SELECT 'Update Complete' AS Status,
  (SELECT COUNT(*) FROM tbl_products WHERE cat_id IS NOT NULL) AS ProductsLinked,
  (SELECT COUNT(*) FROM tbl_products WHERE price_unit > 0) AS ProductsWithPrice,
  (SELECT COUNT(*) FROM tbl_products WHERE p_count > 0) AS ProductsWithStock;

-- Show sample data  
SELECT p_id, p_name, cat_id, main_category, price_unit, p_count 
FROM tbl_products LIMIT 5;
