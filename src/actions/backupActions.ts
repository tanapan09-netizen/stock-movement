'use server';

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

const BACKUP_DIR = path.join(process.cwd(), 'public', 'uploads');
const RETENTION_DAYS = 14;

// Ensure backup directory exists
function ensureBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
}

// Generate backup filename with timestamp
function generateBackupFilename(database: string): string {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `backup_${database}_${timestamp}.sql`;
}

function isBackupFile(filename: string): boolean {
    return filename.startsWith('backup_') && filename.endsWith('.sql');
}

// Clean up old backups (older than RETENTION_DAYS)
function cleanupOldBackups() {
    try {
        const files = fs.readdirSync(BACKUP_DIR);
        const now = Date.now();
        const maxAge = RETENTION_DAYS * 24 * 60 * 60 * 1000;

        for (const file of files) {
            if (!isBackupFile(file)) continue;

            const filePath = path.join(BACKUP_DIR, file);
            const stats = fs.statSync(filePath);
            const age = now - stats.mtime.getTime();

            if (age > maxAge) {
                fs.unlinkSync(filePath);
                // console.log(`Deleted old backup: ${file}`);
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
            .filter(isBackupFile)
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

        // MySQL connection details from DATABASE_URL
        const dbUrl = process.env.DATABASE_URL || '';
        const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)/);

        if (!match) {
            return { success: false, message: 'Invalid DATABASE_URL format' };
        }

        const [, user, password, host, port, dbWithParams] = match;
        const database = dbWithParams.split('?')[0]; // Remove query params
        const isWindows = process.platform === 'win32';

        ensureBackupDir();

        const filename = generateBackupFilename(database);
        const backupPath = path.join(BACKUP_DIR, filename);

        // Build mysqldump command
        let cmd = '';
        if (isWindows) {
            const mysqldumpPath = 'C:\\xampp\\mysql\\bin\\mysqldump.exe';
            cmd = `"${mysqldumpPath}" -u ${user}`;
            if (password) cmd += ` -p${password}`;
            cmd += ` -h ${host} -P ${port} ${database} > "${backupPath}"`;
        } else {
            // Linux/Docker: Use mysqldump from PATH
            // Add --skip-ssl to avoid "self-signed certificate" errors
            // Add --default-auth=mysql_native_password to fix "caching_sha2_password" error from MariaDB clients connecting to MySQL 8
            cmd = `mysqldump --skip-ssl --default-auth=mysql_native_password -u ${user}`;
            if (password) cmd += ` -p${password}`;
            cmd += ` -h ${host} -P ${port} ${database} > "${backupPath}"`;
        }

        // Execute command
        if (isWindows) {
            await execAsync(cmd, { shell: 'cmd.exe' });
        } else {
            await execAsync(cmd); // Unix uses /bin/sh by default
        }

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

export async function getBackupsList() {
    try {
        ensureBackupDir();
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(isBackupFile)
            .map(f => {
                const stats = fs.statSync(path.join(BACKUP_DIR, f));
                return {
                    name: f,
                    size: formatBytes(stats.size),
                    date: stats.mtime
                };
            })
            .sort((a, b) => b.date.getTime() - a.date.getTime());

        return { success: true, data: files };
    } catch (error) {
        console.error('Error listing backups:', error);
        return { success: false, error: 'Failed to list backups' };
    }
}

import { prisma } from '@/lib/prisma';

async function ensureNativePasswordAuth(user: string, password?: string) {
    // Only needed for Linux/Docker environment where mariadb-client is used
    if (process.platform === 'win32') return;

    try {
        // This is a workaround for mariadb-client (Alpine) not supporting caching_sha2_password (MySQL 8 default)
        // We temporarily switch the user to mysql_native_password to allow the restore client to connect
        if (password) {
            // Use raw SQL to alter user. Prisma runs as root/admin so this should work.
            // Note: We use the % host to cover Docker network connections
            await prisma.$executeRawUnsafe(`ALTER USER '${user}'@'%' IDENTIFIED WITH mysql_native_password BY '${password}';`);
            // console.log(`Updated auth plugin for ${user} to mysql_native_password`);
        }
    } catch (error) {
        console.warn('Failed to update auth plugin:', error);
        // Continue anyway, maybe it's already compatible or permissions denied
    }
}

export async function restoreDatabase(filename: string): Promise<{ success: boolean; message: string }> {
    try {
        if (!isBackupFile(filename) || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return { success: false, message: 'Invalid backup filename' };
        }

        const backupPath = path.join(BACKUP_DIR, filename);

        if (!fs.existsSync(backupPath)) {
            return { success: false, message: 'Backup file not found' };
        }

        // MySQL connection details from DATABASE_URL
        const dbUrl = process.env.DATABASE_URL || '';
        const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)/);

        if (!match) {
            return { success: false, message: 'Invalid DATABASE_URL format' };
        }

        const [, user, password, host, port, dbWithParams] = match;
        const database = dbWithParams.split('?')[0];
        const isWindows = process.platform === 'win32';

        // Fix authentication compatibility for Docker/Linux
        await ensureNativePasswordAuth(user, password);

        // Build mysql restore command
        let cmd = '';
        if (isWindows) {
            const mysqlPath = 'C:\\xampp\\mysql\\bin\\mysql.exe';
            cmd = `"${mysqlPath}" -u ${user}`;
            if (password) cmd += ` -p${password}`;
            cmd += ` -h ${host} -P ${port} ${database} < "${backupPath}"`;
        } else {
            // Linux/Docker: Use mysql from PATH
            // Add --skip-ssl to avoid "self-signed certificate" errors
            cmd = `mysql --skip-ssl -u ${user}`;
            if (password) cmd += ` -p${password}`;
            cmd += ` -h ${host} -P ${port} ${database} < "${backupPath}"`;
        }

        // Execute command
        if (isWindows) {
            await execAsync(cmd, { shell: 'cmd.exe' });
        } else {
            await execAsync(cmd);
        }

        return { success: true, message: `Database restored successfully from ${filename}` };
    } catch (error) {
        console.error('Restore error:', error);
        return {
            success: false,
            message: `Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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
            .filter(isBackupFile)
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
