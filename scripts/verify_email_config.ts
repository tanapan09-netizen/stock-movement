
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyEmailConfig() {
    console.log('--- Email Configuration Verification ---');
    console.log('Checking environment variables (redacted):');
    console.log(`EMAIL_ENABLED: ${process.env.EMAIL_ENABLED}`);
    console.log(`SMTP_HOST: ${process.env.SMTP_HOST ? 'Configured' : 'Missing'}`);
    console.log(`SMTP_PORT: ${process.env.SMTP_PORT}`);
    console.log(`SMTP_USER: ${process.env.SMTP_USER ? 'Configured' : 'Missing'}`);
    console.log(`APPROVER_EMAILS: ${process.env.APPROVER_EMAILS}`);

    console.log('\n--- Checking Technician Data ---');
    try {
        const technicians = await prisma.tbl_technicians.findMany({
            where: { status: 'active' },
            select: { name: true, email: true, line_user_id: true }
        });

        if (technicians.length === 0) {
            console.log('⚠️ No active technicians found.');
        } else {
            console.log(`Found ${technicians.length} active technicians:`);
            let hasEmail = false;
            technicians.forEach(tech => {
                console.log(`- ${tech.name}: Email=${tech.email || 'N/A'}, LINE=${tech.line_user_id ? 'Linked' : 'N/A'}`);
                if (tech.email) hasEmail = true;
            });

            if (!hasEmail) {
                console.log('\n⚠️ WARNING: No technicians have email addresses configured.');
                console.log('Job Assignment emails will NOT be sent until emails are added to tbl_technicians.');
            } else {
                console.log('\n✅ At least one technician has an email address.');
            }
        }

    } catch (error) {
        console.error('Error querying database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyEmailConfig();
