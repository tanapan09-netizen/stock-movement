
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    console.log('Debug V2: Starting simulation');
    try {
        const body: any = {
            csrfEnabled: true,
            rateLimitEnabled: true,
            ipWhitelistEnabled: false,
            allowedIPs: [],
            maxRequests: 100,
            windowWindow: 60000,
            loginProtectionEnabled: true,
            security_max_attempts: "5",
            security_lockout_duration: "5",
            security_log_retention_days: "90"
        };

        const keysToSave = [
            'loginProtectionEnabled',
            'security_max_attempts',
            'security_lockout_duration',
            'security_log_retention_days'
        ];

        const promises = keysToSave.map(async key => {
            let value = body[key];

            if (value === undefined || value === null) value = '';
            if (typeof value !== 'string') value = JSON.stringify(value);

            return prisma.tbl_system_settings.upsert({
                where: { setting_key: key },
                update: { setting_value: value, description: 'Debug V2' },
                create: { setting_key: key, setting_value: value, description: 'Debug V2' },
            });
        });

        await Promise.all(promises);

        return NextResponse.json({ success: true, timestamp: Date.now() });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
