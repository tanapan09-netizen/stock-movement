/**
 * Security Utilities
 * Utility functions สำหรับ CSRF, Rate Limiting, และ IP Whitelisting
 */

import { securityConfig } from '@/config/security.config';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// In-memory stores (for production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const csrfTokenStore = new Map<string, { token: string; createdAt: number }>();

/**
 * CSRF Protection
 */
export const csrf = {
    /**
     * Generate a new CSRF token
     */
    generateToken: (): string => {
        const token = crypto.randomBytes(securityConfig.csrf.tokenLength).toString('hex');
        return token;
    },

    /**
     * Store CSRF token in cookie and memory
     */
    async setToken(token: string): Promise<void> {
        const cookieStore = await cookies();
        cookieStore.set(securityConfig.csrf.cookieName, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' && process.env.CSRF_COOKIE_SECURE !== 'false',
            sameSite: 'lax', // Relaxed for better compatibility across http/https switch
            maxAge: 60 * 60, // 1 hour
            path: '/',
        });

        csrfTokenStore.set(token, { token, createdAt: Date.now() });

        // Clean up old tokens (older than 2 hours)
        const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
        for (const [key, value] of csrfTokenStore.entries()) {
            if (value.createdAt < twoHoursAgo) {
                csrfTokenStore.delete(key);
            }
        }
    },

    /**
     * Validate CSRF token from request
     */
    async validateToken(request: Request): Promise<boolean> {
        if (!securityConfig.csrf.enabled) return true;

        // Check if path is excluded
        const url = new URL(request.url);
        const isExcluded = securityConfig.csrf.excludePaths.some(path =>
            url.pathname.startsWith(path)
        );
        if (isExcluded) return true;

        // Only check for state-changing methods
        const method = request.method.toUpperCase();
        if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            return true;
        }

        // Get token from header
        const headerToken = request.headers.get(securityConfig.csrf.headerName);

        // Get token from cookie
        const cookieStore = await cookies();
        const cookieToken = cookieStore.get(securityConfig.csrf.cookieName)?.value;

        // Validate tokens match
        if (!headerToken || !cookieToken) {
            return false;
        }

        return headerToken === cookieToken;
    },
};

/**
 * Rate Limiting
 */
export const rateLimit = {
    /**
     * Check if request is rate limited
     */
    check: (ip: string, path: string): { allowed: boolean; remaining: number; resetIn: number } => {
        if (!securityConfig.rateLimit.enabled) {
            return { allowed: true, remaining: Infinity, resetIn: 0 };
        }

        // Find matching endpoint config
        let config = { max: securityConfig.rateLimit.max, windowMs: securityConfig.rateLimit.windowMs };
        for (const [pattern, endpointConfig] of Object.entries(securityConfig.rateLimit.endpoints)) {
            if (new RegExp(pattern).test(path)) {
                config = endpointConfig;
                break;
            }
        }

        const key = `${ip}:${path.split('/').slice(0, 3).join('/')}`;
        const now = Date.now();
        const record = rateLimitStore.get(key);

        if (!record || now > record.resetTime) {
            // Start new window
            rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
            return { allowed: true, remaining: config.max - 1, resetIn: config.windowMs };
        }

        if (record.count >= config.max) {
            // Rate limited
            return {
                allowed: false,
                remaining: 0,
                resetIn: record.resetTime - now,
            };
        }

        // Increment counter
        record.count++;
        rateLimitStore.set(key, record);

        return {
            allowed: true,
            remaining: config.max - record.count,
            resetIn: record.resetTime - now,
        };
    },

    /**
     * Get rate limit headers
     */
    getHeaders: (result: { remaining: number; resetIn: number }): Record<string, string> => {
        return {
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(result.resetIn / 1000).toString(),
        };
    },
};

/**
 * IP Whitelisting
 */
export const ipWhitelist = {
    /**
     * Check if IP is allowed
     */
    isAllowed: (ip: string, path: string): boolean => {
        if (!securityConfig.ipWhitelist.enabled) return true;

        // Check if path is excluded
        const isExcluded = securityConfig.ipWhitelist.excludePaths.some(excludePath =>
            path.startsWith(excludePath)
        );
        if (isExcluded) return true;

        // Normalize IP address
        const normalizedIP = ip.replace('::ffff:', '');

        // Check if IP is in whitelist
        return securityConfig.ipWhitelist.allowedIPs.some(allowedIP => {
            const normalizedAllowed = allowedIP.replace('::ffff:', '');
            return normalizedIP === normalizedAllowed || normalizedIP === 'localhost';
        });
    },
};

/**
 * Get client IP from request
 */
export function getClientIP(request: Request): string {
    // Check various headers for real IP (behind proxy)
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
        return realIP;
    }

    // Fallback - in development may be undefined
    return '127.0.0.1';
}

/**
 * Security Headers
 */
export function getSecurityHeaders(): Record<string, string> {
    return {
        'Content-Security-Policy': securityConfig.headers.csp,
        'X-Content-Type-Options': securityConfig.headers.xContentTypeOptions,
        'X-Frame-Options': securityConfig.headers.xFrameOptions,
        'X-XSS-Protection': securityConfig.headers.xXssProtection,
        'Referrer-Policy': securityConfig.headers.referrerPolicy,
    };
}
