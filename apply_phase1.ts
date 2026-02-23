
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const SQL_FILE_PATH = String.raw`C:\Users\admin\.gemini\antigravity\brain\aa57bd6c-e40b-4566-9969-58fa26ff8415\phase1_warehouses.sql`;

async function main() {
    console.log('Applying Phase 1 Warehouse Changes...');

    if (!fs.existsSync(SQL_FILE_PATH)) {
        console.error(`SQL file not found at: ${SQL_FILE_PATH}`);
        process.exit(1);
    }

    const sqlContent = fs.readFileSync(SQL_FILE_PATH, 'utf-8');
    const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    console.log(`Found ${statements.length} statements to execute.`);

    for (const statement of statements) {
        try {
            // Add semicolon back if needed, but executeRawUnsafe usually takes the statement without
            await prisma.$executeRawUnsafe(statement);
            console.log('Executed statement successfully.');
        } catch (error) {
            console.error('Error executing statement:', statement);
            console.error(error);
            // Don't exit, might be duplicate error which we want to ignore if INSERT IGNORE didn't catch it
        }
    }

    console.log('Phase 1 Warehouse Application Complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
