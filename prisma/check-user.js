const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.tbl_users.findUnique({
        where: { username: 'admin' }
    });
    console.log('User Record:', user);

    // Check time
    console.log('Current Server Time:', new Date());
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
