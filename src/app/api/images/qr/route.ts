import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
    try {
        const filePath = path.join(process.cwd(), 'public', 'uploads', 'line-qr.png');

        if (!existsSync(filePath)) {
            return new NextResponse('Image not found', { status: 404 });
        }

        const buffer = await readFile(filePath);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=0, must-revalidate',
            },
        });
    } catch (error) {
        console.error("Error serving QR code:", error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
