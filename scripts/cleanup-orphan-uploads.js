/* eslint-disable no-console */
const fs = require('fs/promises');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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

function normalizeSlashes(value) {
    return value.replace(/\\/g, '/');
}

function normalizeUploadsPath(value) {
    const normalized = normalizeSlashes(value).replace(/^\/+/, '');
    if (!normalized) return null;
    if (!normalized.startsWith('uploads/')) return null;
    if (normalized.includes('..')) return null;
    return normalized;
}

function parseProxyPath(value) {
    if (!value.startsWith('/api/maintenance/image-proxy')) return null;
    try {
        const fakeOrigin = 'http://localhost';
        const url = new URL(value, fakeOrigin);
        const pathParam = url.searchParams.get('path');
        return pathParam || null;
    } catch {
        return null;
    }
}

function tryDecodeURIComponent(value) {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

function collectRefsFromString(raw, options) {
    const refs = new Set();
    const trimmed = String(raw || '').trim();
    if (!trimmed) return refs;

    const decoded = tryDecodeURIComponent(trimmed);
    const proxyPath = parseProxyPath(decoded);
    if (proxyPath) {
        return collectRefsFromString(proxyPath, options);
    }

    const withoutQuery = decoded.split('?')[0].split('#')[0];
    const normalized = normalizeSlashes(withoutQuery).trim();

    if (!normalized) return refs;
    if (normalized.startsWith('data:')) return refs;

    // Absolute URL: keep only local /uploads path if present.
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
            // Ignore malformed URLs
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

    // Legacy support for DB values that store only filename/path without uploads prefix.
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

function collectRefsFromField(value, options = {}) {
    const refs = new Set();
    if (value === null || value === undefined) return refs;

    if (typeof value === 'string') {
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

    return refs;
}

async function walkFilesRecursive(rootDir) {
    const results = [];
    const entries = await fs.readdir(rootDir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(rootDir, entry.name);
        if (entry.isDirectory()) {
            const nested = await walkFilesRecursive(fullPath);
            results.push(...nested);
        } else if (entry.isFile()) {
            results.push(fullPath);
        }
    }
    return results;
}

function formatBytes(bytes) {
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

function hasFlag(flag) {
    return process.argv.includes(flag);
}

async function main() {
    const execute = hasFlag('--execute');
    const verbose = hasFlag('--verbose');

    const uploadsRoot = path.join(process.cwd(), 'public', 'uploads');

    console.log('Scanning uploads folder:', uploadsRoot);
    console.log(`Mode: ${execute ? 'EXECUTE (delete)' : 'DRY-RUN (no delete)'}`);

    const [products, assets, maintenanceRequests, partRequests] = await Promise.all([
        prisma.tbl_products.findMany({
            select: { p_id: true, p_image: true },
        }),
        prisma.tbl_assets.findMany({
            select: { asset_id: true, image_url: true },
        }),
        prisma.tbl_maintenance_requests.findMany({
            select: { request_id: true, image_url: true, completion_image_url: true },
        }),
        prisma.tbl_part_requests.findMany({
            select: { request_id: true, quotation_file: true },
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

    let allFiles = [];
    try {
        allFiles = await walkFilesRecursive(uploadsRoot);
    } catch (error) {
        if (error && error.code === 'ENOENT') {
            console.log('No uploads folder found. Nothing to do.');
            return;
        }
        throw error;
    }

    const imageFiles = [];
    for (const filePath of allFiles) {
        const extension = path.extname(filePath).toLowerCase();
        if (!IMAGE_EXTENSIONS.has(extension)) continue;

        const relPath = normalizeSlashes(path.relative(path.join(process.cwd(), 'public'), filePath));
        const normalizedRel = normalizeUploadsPath(relPath);
        if (!normalizedRel) continue;

        const stats = await fs.stat(filePath);
        imageFiles.push({
            absolutePath: filePath,
            relativePath: normalizedRel,
            size: stats.size,
        });
    }

    const orphanImages = imageFiles.filter((item) => !referenced.has(item.relativePath));
    const orphanSize = orphanImages.reduce((sum, item) => sum + item.size, 0);

    console.log('------------------------------------------------------------');
    console.log(`Referenced paths in DB: ${referenced.size.toLocaleString()}`);
    console.log(`Image files in uploads: ${imageFiles.length.toLocaleString()}`);
    console.log(`Orphan image files: ${orphanImages.length.toLocaleString()}`);
    console.log(`Potential space to reclaim: ${formatBytes(orphanSize)}`);
    console.log('------------------------------------------------------------');

    if (verbose && orphanImages.length > 0) {
        orphanImages.forEach((item) => {
            console.log(`${item.relativePath} (${formatBytes(item.size)})`);
        });
        console.log('------------------------------------------------------------');
    }

    if (!execute) {
        console.log('Dry-run completed. No files were deleted.');
        console.log('Run with --execute to delete orphan image files.');
        return;
    }

    let deletedCount = 0;
    let deletedBytes = 0;
    for (const file of orphanImages) {
        try {
            await fs.unlink(file.absolutePath);
            deletedCount += 1;
            deletedBytes += file.size;
        } catch (error) {
            console.error(`Failed to delete: ${file.relativePath}`, error);
        }
    }

    console.log(`Deleted files: ${deletedCount.toLocaleString()}`);
    console.log(`Freed space: ${formatBytes(deletedBytes)}`);
}

main()
    .catch((error) => {
        if (error && error.name === 'PrismaClientInitializationError') {
            console.error('cleanup-orphan-uploads failed: cannot connect to database.');
            console.error('Run this script on your server environment where DATABASE_URL is reachable.');
        } else {
            console.error('cleanup-orphan-uploads failed:', error);
        }
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
