import { Storage } from '@google-cloud/storage';
import path from 'path';
import { writeFile, mkdir, unlink } from 'fs/promises';

// Initialize GCS Storage
// We only initialize if credentials allow, otherwise we might be in local mode
const storage = new Storage({
    projectId: process.env.GCP_PROJECT_ID,
    credentials: {
        client_email: process.env.GCP_CLIENT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Fix newlines in env var
    },
});

const bucketName = process.env.GCP_BUCKET_NAME;

/**
 * Uploads a file to Google Cloud Storage or Local Disk (fallback)
 * @param file The File object to upload
 * @param folder The folder path (e.g., 'products', 'assets')
 * @returns The public URL of the uploaded file
 */
export async function uploadFile(file: File, folder: string): Promise<string> {
    const shouldUseGCS = !!(process.env.GCP_PROJECT_ID && process.env.GCP_CLIENT_EMAIL && process.env.GCP_PRIVATE_KEY && process.env.GCP_BUCKET_NAME);

    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate unique filename
    // Sanitize filename: remove spaces, special chars
    const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now(); // Use timestamp
    const random = Math.round(Math.random() * 1000);
    const filename = `${folder}-${timestamp}-${random}-${sanitizedOriginalName}`;
    const destination = `${folder}/${filename}`;

    if (shouldUseGCS && bucketName) {
        try {
            const bucket = storage.bucket(bucketName);
            const fileObj = bucket.file(destination);

            await fileObj.save(buffer, {
                metadata: {
                    contentType: file.type,
                },
                resumable: false // Useful for smaller files
            });

            // Make the file public (optional, depending on bucket settings)
            // Or usually we assume bucket is public or we use signed URLs. 
            // For this app, let's assume valid public access or Uniform Bucket Level Access made public.
            // But 'makePublic()' requires special permissions.
            // Let's just return the public URL.

            // NOTE: You must ensure your GCS bucket allows public read if you want direct access
            // OR use signed URLs (more complex for simple apps).
            // We will assume public bucket for now.

            return `https://storage.googleapis.com/${bucketName}/${destination}`;

        } catch (error) {
            console.error('GCS Upload Error:', error);
            throw new Error('Failed to upload to Google Cloud Storage');
        }
    } else {
        // Fallback to Local Storage
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
        await mkdir(uploadDir, { recursive: true });

        const filePath = path.join(uploadDir, filename);
        await writeFile(filePath, buffer);

        return `/uploads/${folder}/${filename}`;
    }
}

/**
 * Deletes a file from GCS or Local Disk
 * @param fileUrl The full URL or relative path of the file
 */
export async function deleteFile(fileUrl: string): Promise<void> {
    if (!fileUrl) return;

    const shouldUseGCS = fileUrl.startsWith('https://storage.googleapis.com');

    if (shouldUseGCS) {
        try {
            // Extract file path from URL
            // URL: https://storage.googleapis.com/BUCKET_NAME/folder/filename
            const urlObj = new URL(fileUrl);
            const pathParts = urlObj.pathname.split('/').slice(2); // Remove empty and bucket name
            // Wait, pathname for storage.googleapis.com is /bucket/path/to/file

            const bucketFromUrl = urlObj.pathname.split('/')[1];
            const filePath = urlObj.pathname.split('/').slice(2).join('/');

            if (bucketName && bucketFromUrl === bucketName) {
                await storage.bucket(bucketName).file(filePath).delete();
            }
        } catch (error) {
            console.error('GCS Delete Error:', error);
            // Don't throw, just log. Deletion failure shouldn't block main flow.
        }
    } else {
        // Local file: /uploads/folder/filename
        try {
            const localPath = path.join(process.cwd(), 'public', fileUrl);
            // Check if exists before deleting? unlink throws if not found
            await unlink(localPath);
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                console.error('Local Delete Error:', error);
            }
        }
    }
}
