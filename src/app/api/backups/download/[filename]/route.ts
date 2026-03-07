import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ filename: string }> }
) {
    try {
        const { filename } = await params;

        // Safety check: only allow .sql files and prevent directory traversal
        if (!filename.endsWith('.sql') || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
        }

        const backupDir = path.join(process.cwd(), 'backups');
        const filepath = path.join(backupDir, filename);

        if (!fs.existsSync(filepath)) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const fileBuffer = fs.readFileSync(filepath);

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': 'application/sql',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error: any) {
        console.error('Download failed:', error);
        return NextResponse.json({ error: 'Download failed' }, { status: 500 });
    }
}
