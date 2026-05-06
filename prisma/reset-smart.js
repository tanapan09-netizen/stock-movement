const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');

// Function to find bcryptjs
function getBcrypt() {
    const paths = [
        'bcryptjs',
        '/app/.next/standalone/node_modules/bcryptjs',
        path.join(process.cwd(), '.next/standalone/node_modules/bcryptjs')
    ];

    for (const p of paths) {
        try {
            console.log(`Trying to load bcryptjs from: ${p}`);
            return require(p);
             
        } catch (e) {
            // continue
        }
    }
    throw new Error('Could not find bcryptjs in any expected location');
}

async function main() {
    console.log('--- SMART ADMIN RESET ---');

    try {
        const bcrypt = getBcrypt();
        console.log('✅ bcryptjs loaded successfully');

        const password = 'admin123';
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(password, salt);

        console.log(`Generated new hash for '${password}'`);

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

        console.log('✅ Admin user successfully reset.');
        console.log('User Details:', {
            id: user.p_id,
            username: user.username,
            failed_attempts: user.failed_attempts,
            locked_until: user.locked_until
        });

    } catch (error) {
        console.error('❌ Error executing reset:', error);
    }

    console.log('--- DONE ---');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
