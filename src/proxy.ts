/**
 * Next.js Proxy
 * Applies security checks: CSRF, Rate Limiting, IP Whitelisting
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { securityConfig } from '@/config/security.config';

// In-memory rate limit store (for middleware - simpler version)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
        return realIP;
    }
    return '127.0.0.1';
}

function checkRateLimit(ip: string, pathname: string): { allowed: boolean; remaining: number; resetIn: number } {
    if (!securityConfig.rateLimit.enabled) {
        return { allowed: true, remaining: 999, resetIn: 0 };
    }

    // Find matching endpoint config
    let config = { max: securityConfig.rateLimit.max, windowMs: securityConfig.rateLimit.windowMs };
    for (const [pattern, endpointConfig] of Object.entries(securityConfig.rateLimit.endpoints)) {
        try {
            if (new RegExp(pattern).test(pathname)) {
                config = endpointConfig;
                break;
            }
        } catch {
            // Invalid regex pattern, skip
        }
    }

    const key = `${ip}:${pathname.split('/').slice(0, 3).join('/')}`;
    const now = Date.now();
    const record = rateLimitMap.get(key);

    if (!record || now > record.resetTime) {
        rateLimitMap.set(key, { count: 1, resetTime: now + config.windowMs });
        return { allowed: true, remaining: config.max - 1, resetIn: config.windowMs };
    }

    if (record.count >= config.max) {
        return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
    }

    record.count++;
    rateLimitMap.set(key, record);
    return { allowed: true, remaining: config.max - record.count, resetIn: record.resetTime - now };
}

function checkIPWhitelist(ip: string, pathname: string): boolean {
    if (!securityConfig.ipWhitelist.enabled) return true;

    // Check excluded paths
    const isExcluded = securityConfig.ipWhitelist.excludePaths.some(path =>
        pathname.startsWith(path)
    );
    if (isExcluded) return true;

    // Normalize and check IP
    const normalizedIP = ip.replace('::ffff:', '');
    return securityConfig.ipWhitelist.allowedIPs.some(allowed => {
        const normalizedAllowed = allowed.replace('::ffff:', '');
        return normalizedIP === normalizedAllowed;
    });
}

function checkCSRF(request: NextRequest): boolean {
    if (!securityConfig.csrf.enabled) return true;

    // Only check state-changing methods
    const method = request.method.toUpperCase();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        return true;
    }

    const pathname = request.nextUrl.pathname;

    // Check excluded paths
    const isExcluded = securityConfig.csrf.excludePaths.some(path =>
        pathname.startsWith(path)
    );
    if (isExcluded) return true;

    // Get tokens
    const headerToken = request.headers.get(securityConfig.csrf.headerName);
    const cookieToken = request.cookies.get(securityConfig.csrf.cookieName)?.value;

    // Validate
    if (!headerToken || !cookieToken) {
        return false;
    }

    return headerToken === cookieToken;
}

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const clientIP = getClientIP(request);
    const forwardedHeaders = new Headers(request.headers);
    forwardedHeaders.set('x-pathname', pathname);

    // Skip static files and Next.js internals
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/static') ||
        pathname.includes('.') // Files with extensions
    ) {
        return NextResponse.next();
    }

    // 1. IP Whitelist Check
    if (!checkIPWhitelist(clientIP, pathname)) {
        return NextResponse.json(
            { error: securityConfig.ipWhitelist.message },
            { status: securityConfig.ipWhitelist.statusCode }
        );
    }

    // 2. Rate Limiting Check (only for API routes)
    if (pathname.startsWith('/api')) {
        const rateLimitResult = checkRateLimit(clientIP, pathname);

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: securityConfig.rateLimit.message },
                {
                    status: securityConfig.rateLimit.statusCode,
                    headers: {
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetIn / 1000).toString(),
                        'Retry-After': Math.ceil(rateLimitResult.resetIn / 1000).toString(),
                    },
                }
            );
        }

        // 3. CSRF Check for API routes
        if (!checkCSRF(request)) {
            return NextResponse.json(
                { error: 'Invalid or missing CSRF token' },
                { status: 403 }
            );
        }

        // Add rate limit headers to response
        const response = NextResponse.next({
            request: {
                headers: forwardedHeaders,
            },
        });
        response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
        response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetIn / 1000).toString());

        // Add security headers
        response.headers.set('X-Content-Type-Options', securityConfig.headers.xContentTypeOptions);
        response.headers.set('X-Frame-Options', securityConfig.headers.xFrameOptions);
        response.headers.set('X-XSS-Protection', securityConfig.headers.xXssProtection);
        response.headers.set('Referrer-Policy', securityConfig.headers.referrerPolicy);

        return response;
    }

    // Add security headers to all responses
    const response = NextResponse.next({
        request: {
            headers: forwardedHeaders,
        },
    });
    response.headers.set('X-Content-Type-Options', securityConfig.headers.xContentTypeOptions);
    response.headers.set('X-Frame-Options', securityConfig.headers.xFrameOptions);
    response.headers.set('X-XSS-Protection', securityConfig.headers.xXssProtection);
    response.headers.set('Referrer-Policy', securityConfig.headers.referrerPolicy);

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
