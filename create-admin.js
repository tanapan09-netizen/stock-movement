
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    try {
        const existingAdmin = await prisma.tbl_users.findUnique({
            where: { username: 'admin' },
        });

        const hashedPassword = bcrypt.hashSync('admin', 10);

        if (existingAdmin) {
            await prisma.tbl_users.update({
                where: { username: 'admin' },
                data: { password: hashedPassword }
            });
            console.log('Admin user updated with new password.');
            return;
        }

        // Find Admin Role if exists
        const adminRole = await prisma.tbl_roles.findFirst({
            where: { role_name: { contains: 'Admin' } }
        });

        const newAdmin = await prisma.tbl_users.create({
            data: {
                username: 'admin',
                password: hashedPassword,
                role: 'admin',
                role_id: adminRole ? adminRole.role_id : 1, // Default to 1 if not found
                email: 'admin@example.com',
                is_approver: true
            }
        });

        console.log('Successfully created admin user:', newAdmin.username);
    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
