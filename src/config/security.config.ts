/**
 * Security Configuration
 * ตั้งค่าความปลอดภัยของระบบ
 */

export const securityConfig = {
    /**
     * CSRF Protection
     */
    csrf: {
        enabled: true,
        headerName: 'x-csrf-token',
        cookieName: 'csrf-token',
        tokenLength: 32,
        // Paths to exclude from CSRF check
        excludePaths: [
            '/api/auth',           // NextAuth handles its own CSRF
            '/api/health',         // Health check endpoint
            '/api/security/csrf',  // CSRF token endpoint itself
            '/api/borrow/return',  // Borrow return endpoint
            '/api/line/webhook',   // LINE Webhook endpoint
        ],
    },

    /**
     * Rate Limiting
     */
    rateLimit: {
        enabled: true,
        windowMs: 60 * 1000,  // 1 minute window
        max: 100,             // Default: 100 requests per minute

        // Custom limits per endpoint pattern
        // Custom limits per endpoint pattern
        endpoints: {
            // High limits for session and csrf checks (frequently called by client)
            '/api/auth/session': { max: 1000, windowMs: 60 * 1000 },
            '/api/auth/csrf': { max: 1000, windowMs: 60 * 1000 },

            // Relaxed limits for login (was 10)
            '/api/auth/signin': { max: 60, windowMs: 60 * 1000 },
            '/api/auth/callback/.*': { max: 60, windowMs: 60 * 1000 },

            // General fallbacks
            '/api/auth/.*': { max: 200, windowMs: 60 * 1000 },
            '/api/security/.*': { max: 60, windowMs: 60 * 1000 },
            '/api/.*': { max: 200, windowMs: 60 * 1000 },
        },

        // Response when rate limited
        message: 'Too many requests, please try again later.',
        statusCode: 429,
    },

    /**
     * IP Whitelisting
     */
    ipWhitelist: {
        enabled: false,  // Set to true to enable IP whitelisting

        // Default allowed IPs (localhost)
        allowedIPs: [
            '127.0.0.1',
            '::1',
            '::ffff:127.0.0.1',
            'localhost',
        ],

        // Paths to exclude from IP whitelist check
        excludePaths: [
            '/api/health',  // Health check should always be accessible
            '/login',       // Login page
        ],

        // Response when IP is not whitelisted
        message: 'Access denied. Your IP is not whitelisted.',
        statusCode: 403,
    },

    /**
     * Security Headers
     */
    headers: {
        // Content Security Policy
        csp: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",

        // Other security headers
        xContentTypeOptions: 'nosniff',
        xFrameOptions: 'SAMEORIGIN',
        xXssProtection: '1; mode=block',
        referrerPolicy: 'strict-origin-when-cross-origin',
    },
};

export type SecurityConfig = typeof securityConfig;
