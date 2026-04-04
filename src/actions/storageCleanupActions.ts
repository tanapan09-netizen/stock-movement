'use server';

import { auth } from '@/auth';
import { logSystemAction } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { canAccessDashboardPage } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';
import fs from 'fs/promises';
import path from 'path';

const IMAGE_EXTENSIONS = new Set([
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.gif',
    '.bmp',
    '.svg',
    '.heic',
    '.heif',
    '.avif',
]);

const DEFAULT_KEEP_FILES = new Set([
    'uploads/line-qr.png',
]);

const MAX_PREVIEW_FILES = 200;

type CleanupMode = 'dry-run' | 'execute';

type CleanupFile = {
    absolutePath: string;
    relativePath: string;
    size: number;
};

type CleanupStats = {
    referencedPaths: number;
    imageFiles: number;
    orphanFiles: number;
    orphanBytes: number;
    deletedFiles: number;
    deletedBytes: number;
};

export type StorageCleanupResult = {
    success: boolean;
    mode?: CleanupMode;
    stats?: CleanupStats;
    preview?: Array<{ path: string; size: number }>;
    message?: string;
    error?: string;
};

function normalizeSlashes(value: string) {
    return value.replace(/\\/g, '/');
}

function normalizeUploadsPath(value: string) {
    const normalized = normalizeSlashes(value).replace(/^\/+/, '');
    if (!normalized) return null;
    if (!normalized.startsWith('uploads/')) return null;
    if (normalized.includes('..')) return null;
    return normalized;
}

function parseProxyPath(value: string) {
    if (!value.startsWith('/api/maintenance/image-proxy')) return null;
    try {
        const fakeOrigin = 'http://localhost';
        const url = new URL(value, fakeOrigin);
        return url.searchParams.get('path');
    } catch {
        return null;
    }
}

function tryDecodeURIComponent(value: string) {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

function collectRefsFromString(raw: string, options: { allowBareFilename?: boolean; defaultFolder?: string }) {
    const refs = new Set<string>();
    const trimmed = String(raw || '').trim();
    if (!trimmed) return refs;

    const decoded = tryDecodeURIComponent(trimmed);
    const proxyPath = parseProxyPath(decoded);
    if (proxyPath) {
        return collectRefsFromString(proxyPath, options);
    }

    const withoutQuery = decoded.split('?')[0].split('#')[0];
    const normalized = normalizeSlashes(withoutQuery).trim();

    if (!normalized || normalized.startsWith('data:')) return refs;

    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(normalized)) {
        try {
            const asUrl = new URL(normalized);
            const pathName = normalizeSlashes(asUrl.pathname || '');
            const uploadsIndex = pathName.indexOf('/uploads/');
            if (uploadsIndex >= 0) {
                const candidate = normalizeUploadsPath(pathName.slice(uploadsIndex + 1));
                if (candidate) refs.add(candidate);
            }
        } catch {
            return refs;
        }
        return refs;
    }

    if (normalized.startsWith('/uploads/')) {
        const candidate = normalizeUploadsPath(normalized);
        if (candidate) refs.add(candidate);
        return refs;
    }

    if (normalized.startsWith('uploads/')) {
        const candidate = normalizeUploadsPath(normalized);
        if (candidate) refs.add(candidate);
        return refs;
    }

    if (normalized.startsWith('public/uploads/')) {
        const candidate = normalizeUploadsPath(normalized.slice('public/'.length));
        if (candidate) refs.add(candidate);
        return refs;
    }

    const embeddedUploadsIndex = normalized.indexOf('/uploads/');
    if (embeddedUploadsIndex >= 0) {
        const candidate = normalizeUploadsPath(normalized.slice(embeddedUploadsIndex + 1));
        if (candidate) refs.add(candidate);
        return refs;
    }

    const stripped = normalized.replace(/^\/+/, '');
    if (!options.allowBareFilename || !stripped) {
        return refs;
    }

    if (stripped.includes('/')) {
        refs.add(`uploads/${stripped}`);
        return refs;
    }

    if (options.defaultFolder) {
        refs.add(`uploads/${options.defaultFolder}/${stripped}`);
    }
    refs.add(`uploads/${stripped}`);
    return refs;
}

function collectRefsFromField(value: unknown, options: { allowBareFilename?: boolean; defaultFolder?: string } = {}) {
    const refs = new Set<string>();
    if (value === null || value === undefined || typeof value !== 'string') return refs;

    const trimmed = value.trim();
    if (!trimmed) return refs;

    if (trimmed.startsWith('[') || trimmed.startsWith('"')) {
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                for (const item of parsed) {
                    if (typeof item !== 'string') continue;
                    for (const ref of collectRefsFromString(item, options)) refs.add(ref);
                }
                return refs;
            }

            if (typeof parsed === 'string') {
                for (const ref of collectRefsFromString(parsed, options)) refs.add(ref);
                return refs;
            }
        } catch {
            // Fall through to plain string mode.
        }
    }

    for (const ref of collectRefsFromString(trimmed, options)) refs.add(ref);
    return refs;
}

async function walkFilesRecursive(rootDir: string): Promise<string[]> {
    const entries = await fs.readdir(rootDir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
        const fullPath = path.join(rootDir, entry.name);
        if (entry.isDirectory()) {
            const nested = await walkFilesRecursive(fullPath);
            files.push(...nested);
        } else if (entry.isFile()) {
            files.push(fullPath);
        }
    }

    return files;
}

async function collectImageFiles(publicDir: string): Promise<CleanupFile[]> {
    const uploadsRoot = path.join(publicDir, 'uploads');
    let allFiles: string[] = [];

    try {
        allFiles = await walkFilesRecursive(uploadsRoot);
    } catch (error: unknown) {
        const nodeError = error as NodeJS.ErrnoException;
        if (nodeError?.code === 'ENOENT') {
            return [];
        }
        throw error;
    }

    const imageFiles: CleanupFile[] = [];
    for (const filePath of allFiles) {
        const extension = path.extname(filePath).toLowerCase();
        if (!IMAGE_EXTENSIONS.has(extension)) continue;

        const relPath = normalizeSlashes(path.relative(publicDir, filePath));
        const normalizedRel = normalizeUploadsPath(relPath);
        if (!normalizedRel) continue;

        const stats = await fs.stat(filePath);
        imageFiles.push({
            absolutePath: filePath,
            relativePath: normalizedRel,
            size: stats.size,
        });
    }

    return imageFiles;
}

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB', 'TB'];
    let value = bytes / 1024;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }
    return `${value.toFixed(2)} ${units[unitIndex]}`;
}

async function collectReferencedUploadsPaths() {
    const [products, assets, maintenanceRequests, partRequests] = await Promise.all([
        prisma.tbl_products.findMany({
            select: { p_image: true },
        }),
        prisma.tbl_assets.findMany({
            select: { image_url: true },
        }),
        prisma.tbl_maintenance_requests.findMany({
            select: { image_url: true, completion_image_url: true },
        }),
        prisma.tbl_part_requests.findMany({
            select: { quotation_file: true },
        }),
    ]);

    const referenced = new Set(DEFAULT_KEEP_FILES);

    for (const row of products) {
        const refs = collectRefsFromField(row.p_image, { allowBareFilename: true, defaultFolder: 'products' });
        refs.forEach((item) => referenced.add(item));
    }

    for (const row of assets) {
        const refs = collectRefsFromField(row.image_url, { allowBareFilename: true });
        refs.forEach((item) => referenced.add(item));
    }

    for (const row of maintenanceRequests) {
        const imageRefs = collectRefsFromField(row.image_url, { allowBareFilename: true, defaultFolder: 'maintenance' });
        const completionRefs = collectRefsFromField(row.completion_image_url, { allowBareFilename: true, defaultFolder: 'maintenance' });
        imageRefs.forEach((item) => referenced.add(item));
        completionRefs.forEach((item) => referenced.add(item));
    }

    for (const row of partRequests) {
        const refs = collectRefsFromField(row.quotation_file, { allowBareFilename: true, defaultFolder: 'quotations' });
        refs.forEach((item) => referenced.add(item));
    }

    return referenced;
}

async function ensureAccess(level: 'read' | 'edit') {
    const session = await auth();
    const permissionContext = await getUserPermissionContext(session?.user as PermissionSessionUser | undefined);
    const allowed = canAccessDashboardPage(
        permissionContext.role,
        permissionContext.permissions,
        '/settings/storage-cleanup',
        { level },
    );

    return { session, allowed };
}

export async function runStorageCleanup(execute = false): Promise<StorageCleanupResult> {
    const access = await ensureAccess(execute ? 'edit' : 'read');
    if (!access.session || !access.allowed) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const publicDir = path.join(process.cwd(), 'public');
        const [referenced, imageFiles] = await Promise.all([
            collectReferencedUploadsPaths(),
            collectImageFiles(publicDir),
        ]);

        const orphanFiles = imageFiles
            .filter((item) => !referenced.has(item.relativePath))
            .sort((a, b) => b.size - a.size);
        const orphanBytes = orphanFiles.reduce((sum, file) => sum + file.size, 0);

        let deletedFiles = 0;
        let deletedBytes = 0;

        if (execute) {
            for (const file of orphanFiles) {
                try {
                    await fs.unlink(file.absolutePath);
                    deletedFiles += 1;
                    deletedBytes += file.size;
                } catch (error) {
                    console.error(`Failed to delete orphan file: ${file.relativePath}`, error);
                }
            }

            await logSystemAction(
                'UPLOADS_CLEANUP',
                'Storage',
                'uploads',
                {
                    mode: 'execute',
                    orphanFiles: orphanFiles.length,
                    deletedFiles,
                    orphanBytes,
                    deletedBytes,
                },
                Number.parseInt(access.session.user?.id || '', 10) || null,
                access.session.user?.name || null,
                'unknown',
            );
        }

        const stats: CleanupStats = {
            referencedPaths: referenced.size,
            imageFiles: imageFiles.length,
            orphanFiles: orphanFiles.length,
            orphanBytes,
            deletedFiles,
            deletedBytes,
        };

        return {
            success: true,
            mode: execute ? 'execute' : 'dry-run',
            stats,
            preview: orphanFiles.slice(0, MAX_PREVIEW_FILES).map((item) => ({ path: item.relativePath, size: item.size })),
            message: execute
                ? `Deleted ${deletedFiles.toLocaleString()} file(s), freed ${formatBytes(deletedBytes)}.`
                : `Found ${orphanFiles.length.toLocaleString()} orphan file(s), reclaimable ${formatBytes(orphanBytes)}.`,
        };
    } catch (error: unknown) {
        const maybeError = error as { name?: string; message?: string };
        const message = maybeError?.name === 'PrismaClientInitializationError'
            ? 'Cannot connect to database in this environment.'
            : maybeError?.message || 'Failed to cleanup uploads.';

        return { success: false, error: message };
    }
}
