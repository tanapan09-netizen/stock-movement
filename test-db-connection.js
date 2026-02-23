// Test script to verify database connection
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')); // Hide password

    try {
        // Try to query a simple table
        const users = await prisma.tbl_users.findMany({
            take: 1
        });

        console.log('✅ Database connection successful!');
        console.log('Found', users.length, 'users');

        if (users.length > 0) {
            console.log('Sample user:', { id: users[0].p_id, username: users[0].username });
        }
    } catch (error) {
        console.error('❌ Database connection failed:');
        console.error(error);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
