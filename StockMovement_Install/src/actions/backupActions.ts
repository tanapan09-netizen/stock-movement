'use server';

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const RETENTION_DAYS = 14;

// Ensure backup directory exists
function ensureBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
}

// Generate backup filename with timestamp
function generateBackupFilename(): string {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `backup_${timestamp}.sql`;
}

// Clean up old backups (older than RETENTION_DAYS)
function cleanupOldBackups() {
    try {
        const files = fs.readdirSync(BACKUP_DIR);
        const now = Date.now();
        const maxAge = RETENTION_DAYS * 24 * 60 * 60 * 1000;

        for (const file of files) {
            if (!file.endsWith('.sql')) continue;

            const filePath = path.join(BACKUP_DIR, file);
            const stats = fs.statSync(filePath);
            const age = now - stats.mtime.getTime();

            if (age > maxAge) {
                fs.unlinkSync(filePath);
                console.log(`Deleted old backup: ${file}`);
            }
        }
    } catch (error) {
        console.error('Error cleaning up old backups:', error);
    }
}

// Get last backup time
function getLastBackupTime(): Date | null {
    try {
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.endsWith('.sql'))
            .map(f => ({
                name: f,
                time: fs.statSync(path.join(BACKUP_DIR, f)).mtime
            }))
            .sort((a, b) => b.time.getTime() - a.time.getTime());

        return files.length > 0 ? files[0].time : null;
    } catch {
        return null;
    }
}

// Check if backup was done today
function wasBackedUpToday(): boolean {
    const lastBackup = getLastBackupTime();
    if (!lastBackup) return false;

    const today = new Date();
    return (
        lastBackup.getFullYear() === today.getFullYear() &&
        lastBackup.getMonth() === today.getMonth() &&
        lastBackup.getDate() === today.getDate()
    );
}

export async function performBackup(): Promise<{ success: boolean; message: string; filename?: string }> {
    try {
        // Check if already backed up today
        if (wasBackedUpToday()) {
            return {
                success: true,
                message: 'Backup already exists for today'
            };
        }

        ensureBackupDir();

        const filename = generateBackupFilename();
        const backupPath = path.join(BACKUP_DIR, filename);

        // MySQL connection details from DATABASE_URL
        const dbUrl = process.env.DATABASE_URL || '';
        const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)/);

        if (!match) {
            return { success: false, message: 'Invalid DATABASE_URL format' };
        }

        const [, user, password, host, port, database] = match;

        // Build mysqldump command
        const mysqldumpPath = 'C:\\xampp\\mysql\\bin\\mysqldump.exe';
        let cmd = `"${mysqldumpPath}" -u ${user}`;
        if (password) {
            cmd += ` -p${password}`;
        }
        cmd += ` -h ${host} -P ${port} ${database} > "${backupPath}"`;

        await execAsync(cmd, { shell: 'cmd.exe' });

        // Clean up old backups
        cleanupOldBackups();

        // Verify backup was created
        if (fs.existsSync(backupPath)) {
            const stats = fs.statSync(backupPath);
            if (stats.size > 0) {
                return {
                    success: true,
                    message: `Backup created successfully: ${filename}`,
                    filename
                };
            }
        }

        return { success: false, message: 'Backup file was not created or is empty' };

    } catch (error) {
        console.error('Backup error:', error);
        return {
            success: false,
            message: `Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}

export async function getBackupStatus(): Promise<{
    lastBackup: string | null;
    backupCount: number;
    totalSize: string;
}> {
    try {
        ensureBackupDir();

        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.endsWith('.sql'))
            .map(f => ({
                name: f,
                stats: fs.statSync(path.join(BACKUP_DIR, f))
            }));

        const totalBytes = files.reduce((sum, f) => sum + f.stats.size, 0);
        const lastBackup = getLastBackupTime();

        return {
            lastBackup: lastBackup ? lastBackup.toISOString() : null,
            backupCount: files.length,
            totalSize: formatBytes(totalBytes)
        };
    } catch {
        return {
            lastBackup: null,
            backupCount: 0,
            totalSize: '0 B'
        };
    }
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
