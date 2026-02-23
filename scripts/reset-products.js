// Reset all products: price_unit, p_count, safety_stock to 0
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetProducts() {
    console.log('Resetting all product values...');

    const result = await prisma.tbl_products.updateMany({
        data: {
            price_unit: 0,
            p_count: 0,
            safety_stock: 0
        }
    });

    console.log(`Updated ${result.count} products.`);
    console.log('- price_unit → 0');
    console.log('- p_count → 0');
    console.log('- safety_stock → 0');

    await prisma.$disconnect();
}

resetProducts().catch(e => {
    console.error('Error:', e);
    prisma.$disconnect();
});
