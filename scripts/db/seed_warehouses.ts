
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Warehouses...');

    const warehouses = [
        { code: 'WH-02', name: 'Reserved/Pending Verify', location: 'Main' },
        { code: 'WH-08', name: 'Defective/Disposal', location: 'Main' }
    ];

    for (const wh of warehouses) {
        // Check if exists by code, if not create. Upsert requires unique where input.
        // warehouse_code is unique.

        // Note: warehouse_code is nullable in schema, but we are treating it as key here.
        // To be safe and avoid TS errors with nullable unique constraints in some prisma versions,
        // we can use findFirst then update or create.

        const existing = await prisma.tbl_warehouses.findFirst({
            where: { warehouse_code: wh.code }
        });

        if (existing) {
            console.log(`Warehouse ${wh.code} already exists.`);
        } else {
            const created = await prisma.tbl_warehouses.create({
                data: {
                    warehouse_code: wh.code,
                    warehouse_name: wh.name,
                    location: wh.location,
                    active: true
                }
            });
            console.log(`Created warehouse: ${created.warehouse_code} - ${created.warehouse_name}`);
        }
    }

    console.log('Done.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
