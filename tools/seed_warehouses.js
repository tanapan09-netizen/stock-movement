const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const warehouses = [
        { warehouse_code: 'WH-01', warehouse_name: 'คลังหลัก (Main Stock)', location: 'อาคารหลัก', active: true },
        { warehouse_code: 'WH-02', warehouse_name: 'คลังรอจำหน่าย (Ready to Ship)', location: 'อาคารหลัก', active: true },
        { warehouse_code: 'WH-03', warehouse_name: 'คลังอะไหล่ซ่อม (Reserved for Maintenance)', location: 'ฝ่ายซ่อมบำรุง', active: true },
        { warehouse_code: 'WH-08', warehouse_name: 'คลังคัดออก (Disposed)', location: 'คลังกลาง', active: true },
    ];

    for (const wh of warehouses) {
        const existing = await prisma.tbl_warehouses.findFirst({ where: { warehouse_code: wh.warehouse_code } });
        if (!existing) {
            await prisma.tbl_warehouses.create({ data: wh });
            console.log('Created:', wh.warehouse_code, '-', wh.warehouse_name);
        } else {
            console.log('Already exists:', wh.warehouse_code, '-', existing.warehouse_name);
        }
    }

    // Show all warehouses
    const all = await prisma.tbl_warehouses.findMany({ orderBy: { warehouse_code: 'asc' } });
    console.log('\nAll warehouses in DB:');
    all.forEach(w => console.log(' -', w.warehouse_code, '|', w.warehouse_name));

    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
