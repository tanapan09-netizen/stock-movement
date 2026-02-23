
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const warehouses = await prisma.tbl_warehouses.findMany();
    console.log('Warehouses:', warehouses);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
