const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Creating tbl_assets...');
        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS tbl_assets (
        asset_id INTEGER NOT NULL AUTO_INCREMENT,
        asset_code VARCHAR(50) NOT NULL,
        asset_name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) NOT NULL,
        purchase_date DATE NOT NULL,
        purchase_price DECIMAL(10, 2) NOT NULL,
        useful_life_years INTEGER NOT NULL,
        salvage_value DECIMAL(10, 2) NOT NULL DEFAULT 1,
        location VARCHAR(100),
        status VARCHAR(50) NOT NULL DEFAULT 'Active',
        image_url VARCHAR(255),
        created_at TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
        updated_at TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
        PRIMARY KEY (asset_id),
        UNIQUE INDEX asset_code(asset_code)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

        console.log('Creating tbl_asset_history...');
        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS tbl_asset_history (
        history_id INTEGER NOT NULL AUTO_INCREMENT,
        asset_id INTEGER NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        description TEXT,
        cost DECIMAL(10, 2) DEFAULT 0,
        performed_by VARCHAR(100),
        action_date TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
        PRIMARY KEY (history_id),
        INDEX fk_asset_history_asset(asset_id),
        FOREIGN KEY (asset_id) REFERENCES tbl_assets(asset_id) ON DELETE CASCADE ON UPDATE CASCADE
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

        // Fix enum if missing
        // await prisma.$executeRawUnsafe(`ALTER TABLE tbl_purchase_orders MODIFY COLUMN status ENUM('draft', 'pending', 'approved', 'ordered', 'partial', 'received', 'cancelled') DEFAULT 'draft';`).catch(e => console.log('Enum might already exist'));

        console.log('Tables created successfully!');
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
