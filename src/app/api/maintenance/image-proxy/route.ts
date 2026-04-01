import path from 'path';
import { access, readFile, stat } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
    '.heic': 'image/heic',
    '.heif': 'image/heif',
};

function sanitizeUploadPath(rawPath: string): string | null {
    const normalized = rawPath.replace(/\\/g, '/').trim();
    if (!normalized) return null;

    const withoutLeadingSlash = normalized.startsWith('/') ? normalized.slice(1) : normalized;
    if (!withoutLeadingSlash.startsWith('uploads/')) return null;
    if (withoutLeadingSlash.includes('..')) return null;

    return withoutLeadingSlash;
}

function getSearchRoots(): string[] {
    const cwd = process.cwd();
    const normalizedCwd = cwd.replace(/\\/g, '/');
    const roots: string[] = [];

    if (normalizedCwd.includes('/.next/standalone')) {
        roots.push(path.resolve(cwd, '..', '..', 'public'));
    }

    roots.push(path.join(cwd, 'public'));
    roots.push(path.join(cwd, '.next', 'standalone', 'public'));
    roots.push(path.resolve(cwd, '..', 'public'));
    roots.push('/app/public');

    return Array.from(new Set(roots));
}

async function resolveExistingFilePath(relativeUploadPath: string): Promise<string | null> {
    const roots = getSearchRoots();
    const fallbackBasename = path.basename(relativeUploadPath);

    for (const root of roots) {
        const primaryPath = path.resolve(root, relativeUploadPath);
        const rootResolved = path.resolve(root);
        if (!primaryPath.startsWith(rootResolved)) continue;

        try {
            await access(primaryPath);
            const st = await stat(primaryPath);
            if (st.isFile()) return primaryPath;
        } catch {
            // Try fallback path in /uploads root for deployments with flat storage.
        }

        try {
            const fallbackPath = path.resolve(root, 'uploads', fallbackBasename);
            if (!fallbackPath.startsWith(rootResolved)) continue;
            await access(fallbackPath);
            const st = await stat(fallbackPath);
            if (st.isFile()) return fallbackPath;
        } catch {
            // Continue searching remaining roots.
        }
    }

    return null;
}

export async function GET(request: NextRequest) {
    try {
        const rawPath = request.nextUrl.searchParams.get('path') || '';
        const relativeUploadPath = sanitizeUploadPath(rawPath);
        if (!relativeUploadPath) {
            return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
        }

        const absolutePath = await resolveExistingFilePath(relativeUploadPath);
        if (!absolutePath) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const fileBuffer = await readFile(absolutePath);
        const ext = path.extname(absolutePath).toLowerCase();
        const contentType = CONTENT_TYPE_BY_EXT[ext] || 'application/octet-stream';

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
            },
        });
    } catch (error) {
        console.error('maintenance image proxy error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

