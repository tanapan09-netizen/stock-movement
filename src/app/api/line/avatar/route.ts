import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side image proxy for LINE CDN URLs.
 * This fetches the image from LINE's CDN on the server side (no browser referrer)
 * and streams it back to the client.
 *
 * Usage: /api/line/avatar?url=<encoded_picture_url>
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
        return new NextResponse('Missing url parameter', { status: 400 });
    }

    // Only allow LINE CDN URLs for security
    const isLineUrl = imageUrl.startsWith('https://profile.line-scdn.net/') ||
        imageUrl.startsWith('https://sprofile.line-scdn.net/') ||
        imageUrl.startsWith('https://obs.line-scdn.net/');

    if (!isLineUrl) {
        return new NextResponse('Only LINE CDN URLs are allowed', { status: 403 });
    }

    try {
        const response = await fetch(imageUrl, {
            headers: {
                // No Referer header – the server fetches with no referrer
                'User-Agent': 'Mozilla/5.0 (compatible; StockMovement/1.0)',
            },
            // Cache for 1 hour
            next: { revalidate: 3600 },
        });

        if (!response.ok) {
            return new NextResponse(null, { status: response.status });
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const buffer = await response.arrayBuffer();

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
            },
        });
    } catch (error) {
        console.error('[LINE Avatar Proxy] Error fetching image:', error);
        return new NextResponse(null, { status: 502 });
    }
}

export const dynamic = 'force-dynamic';
