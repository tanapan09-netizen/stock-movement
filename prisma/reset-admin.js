const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- STARTING ADMIN RESET ---');

    // Hash for 'admin123' (Generated via bcryptjs)
    const hashedPassword = '$2b$10$9N7k.litQiWn2S3RPy4fXOF106NXB6Hm79ZSZ11GC7G90My3GWFpu';

    try {
        const user = await prisma.tbl_users.upsert({
            where: { username: 'admin' },
            update: {
                password: hashedPassword,
                failed_attempts: 0,
                locked_until: null,
                role: 'admin',
                role_id: 1
            },
            create: {
                username: 'admin',
                password: hashedPassword,
                role: 'admin',
                role_id: 1,
                failed_attempts: 0
            }
        });

        console.log('✅ Admin user successfully reset/created.');
        console.log('User Details:', {
            id: user.p_id,
            username: user.username,
            password_hash_prefix: user.password.substring(0, 10) + '...',
            failed_attempts: user.failed_attempts,
            locked_until: user.locked_until
        });

    } catch (error) {
        console.error('❌ Error updating user:', error);
    }

    console.log('Server Time:', new Date().toString());
    console.log('--- DONE ---');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
