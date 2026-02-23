const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetPassword() {
    const hashed = await bcrypt.hash('admin', 10);
    console.log('New hash:', hashed);

    await prisma.tbl_users.update({
        where: { username: 'admin' },
        data: { password: hashed }
    });

    console.log('Password reset success!');

    // Verify
    const user = await prisma.tbl_users.findUnique({ where: { username: 'admin' } });
    console.log('User:', user?.username, 'Password prefix:', user?.password.substring(0, 20));

    const valid = await bcrypt.compare('admin', user.password);
    console.log('Password validation:', valid);
}

resetPassword().catch(console.error).finally(() => prisma.$disconnect());
