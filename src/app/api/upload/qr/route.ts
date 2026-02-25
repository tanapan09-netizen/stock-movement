import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "No file received." }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Define directory to save file
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');

        // Ensure the directory exists
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (e) {
            // Ignore if directory already exists
        }

        // Always save as line-qr.png to overwrite nicely
        const filePath = path.join(uploadDir, 'line-qr.png');
        await writeFile(filePath, buffer);

        return NextResponse.json({
            success: true,
            message: "File uploaded successfully",
            path: '/uploads/line-qr.png'
        });
    } catch (error) {
        console.error("Error uploading file:", error);
        return NextResponse.json({ error: "Failed to upload file." }, { status: 500 });
    }
}
