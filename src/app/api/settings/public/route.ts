import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const PUBLIC_SETTING_KEYS = [
    'customer_register_enabled',
    'customer_repair_request_enabled',
] as const;

export async function GET() {
    try {
        const rows = await prisma.tbl_system_settings.findMany({
            where: {
                setting_key: {
                    in: [...PUBLIC_SETTING_KEYS],
                },
            },
            select: {
                setting_key: true,
                setting_value: true,
            },
        });

        const settingMap = new Map(rows.map((row) => [row.setting_key, row.setting_value]));

        return NextResponse.json({
            customerRegisterEnabled: settingMap.get('customer_register_enabled') === 'true',
            customerRepairRequestEnabled: settingMap.get('customer_repair_request_enabled') === 'true',
        });
    } catch (error) {
        console.error('Failed to load public settings:', error);
        return NextResponse.json(
            {
                customerRegisterEnabled: false,
                customerRepairRequestEnabled: false,
            },
            { status: 200 },
        );
    }
}
