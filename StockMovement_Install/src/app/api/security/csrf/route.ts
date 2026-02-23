/**
 * CSRF Token API
 * GET - Generate and return CSRF token
 */

import { NextResponse } from 'next/server';
import { csrf } from '@/lib/security';

export async function GET() {
    try {
        // Generate new CSRF token
        const token = csrf.generateToken();

        // Store token in cookie
        await csrf.setToken(token);

        // Return token in response (for client to use in headers)
        return NextResponse.json({
            token,
            message: 'CSRF token generated successfully',
            usage: 'Include this token in the x-csrf-token header for POST/PUT/DELETE requests',
        });
    } catch (error) {
        console.error('CSRF token generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate CSRF token' },
            { status: 500 }
        );
    }
}
