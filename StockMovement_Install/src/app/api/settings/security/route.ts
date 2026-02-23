/**
 * Security Settings API
 * GET - ดึงค่า Security Settings จาก DB (Individual Rows)
 * POST - บันทึกค่าลง DB (Individual Rows)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Default Fallback Values
const DEFAULTS = {
    csrfEnabled: 'true',
    rateLimitEnabled: 'true',
    ipWhitelistEnabled: 'false',
    allowedIPs: '[]',
    maxRequests: '100',
    windowWindow: '60000',
    loginProtectionEnabled: 'true',
    security_max_attempts: '5',
    security_lockout_duration: '5',
    security_log_retention_days: '90'
};

export async function GET() {
    try {
        const settings = await prisma.tbl_system_settings.findMany();

        // Convert to object
        const settingsMap: Record<string, string> = {};
        settings.forEach(s => {
            settingsMap[s.setting_key] = s.setting_value;
        });

        // Merge with defaults
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: any = { ...DEFAULTS, ...settingsMap };

        // Parse Booleans and Arrays
        const booleanKeys = ['csrfEnabled', 'rateLimitEnabled', 'ipWhitelistEnabled', 'loginProtectionEnabled'];
        booleanKeys.forEach(key => {
            if (result[key] === 'true') result[key] = true;
            if (result[key] === 'false') result[key] = false;
        });

        // Handle specific types if needed (e.g. allowedIPs is stored as JSON string)
        try {
            if (typeof result.allowedIPs === 'string') {
                result.allowedIPs = JSON.parse(result.allowedIPs);
            }
        } catch (e) {
            result.allowedIPs = [];
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Fetch settings error:', error);
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Save each key individually
        const keysToSave = [
            'csrfEnabled',
            'rateLimitEnabled',
            'ipWhitelistEnabled',
            'allowedIPs',
            'maxRequests',
            'windowWindow',
            'loginProtectionEnabled',
            'security_max_attempts',
            'security_lockout_duration',
            'security_log_retention_days'
        ];

        console.log('Security Settings Post Body:', body);

        const promises = keysToSave.map(async key => {
            try {
                let value = body[key];

                // Check for undefined values which might violate NOT NULL constraint
                if (value === undefined || value === null) {
                    value = '';
                }

                // Convert everything to string for storage
                if (typeof value !== 'string') {
                    value = JSON.stringify(value);
                }

                await prisma.tbl_system_settings.upsert({
                    where: { setting_key: key },
                    update: {
                        setting_value: value,
                        description: `Security Setting: ${key}`
                    },
                    create: {
                        setting_key: key,
                        setting_value: value,
                        description: `Security Setting: ${key}`
                    },
                });
                return { status: 'fulfilled', key };
            } catch (error: any) {
                console.error(`Error saving key ${key}:`, error);
                return { status: 'rejected', key, reason: error.message };
            }
        });

        const results = await Promise.all(promises);
        const rejected = results.filter(r => r.status === 'rejected');

        if (rejected.length > 0) {
            return NextResponse.json({
                error: 'Partial save failure',
                failedKeys: rejected,
                receivedBody: body
            }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Save settings error detailed:', error);
        return NextResponse.json({
            error: 'Failed to process request',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
