import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

export async function GET(request: Request) {
    // Verify secret
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET;

    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const dbUrl = process.env.DATABASE_URL || '';

        // Parse DATABASE_URL to extract connection info
        const url = new URL(dbUrl);
        const host = url.hostname;
        const port = url.port || '3306';
        const user = url.username;
        const password = url.password;
        const database = url.pathname.replace('/', '');

        // Create backups directory
        const backupDir = path.join(process.cwd(), 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `backup_${database}_${timestamp}.sql`;
        const filepath = path.join(backupDir, filename);

        // Run mysqldump
        const command = `mysqldump -h ${host} -P ${port} -u ${user} -p"${password}" ${database} --single-transaction --routines --triggers > "${filepath}"`;

        await execAsync(command);

        // Verify file was created
        if (fs.existsSync(filepath)) {
            const stats = fs.statSync(filepath);

            // Clean up old backups (keep last 7)
            const files = fs.readdirSync(backupDir)
                .filter(f => f.startsWith('backup_') && f.endsWith('.sql'))
                .sort()
                .reverse();

            if (files.length > 7) {
                for (const oldFile of files.slice(7)) {
                    fs.unlinkSync(path.join(backupDir, oldFile));
                }
            }

            return NextResponse.json({
                success: true,
                filename,
                size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
                timestamp,
                message: 'Backup completed successfully'
            });
        }

        return NextResponse.json({ success: false, error: 'Backup file not created' }, { status: 500 });
    } catch (error: any) {
        console.error('Backup failed:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Backup failed'
        }, { status: 500 });
    }
}
