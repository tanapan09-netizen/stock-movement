/**
 * Audit Log API (Persistent)
 * POST - บันทึก audit log ลง Database
 * GET - ดึง audit logs จาก Database
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
    try {
        // Only allow internal server actions (no session - called by server actions)
        // Minimal validation: require an internal API key header or just block external POST
        const internalKey = request.headers.get('x-internal-key');
        if (internalKey !== process.env.INTERNAL_API_KEY && process.env.INTERNAL_API_KEY) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { action, entity, entityId, details, ipAddress, username } = body;

        // บันทึกลง database
        const log = await prisma.tbl_system_logs.create({
            data: {
                action: action || 'unknown',
                entity: entity || null,
                entity_id: entityId?.toString() || null,
                details: details ? JSON.stringify(details) : null,
                user_id: null,
                username: username || 'anonymous',
                ip_address: ipAddress || request.headers.get('x-forwarded-for') || '127.0.0.1',
            },
        });

        return NextResponse.json({ success: true, id: log.id });
    } catch (error) {
        console.error('Audit log error:', error);
        return NextResponse.json({ error: 'Failed to create audit log' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
        const offset = parseInt(searchParams.get('offset') || '0');
        const action = searchParams.get('action');
        const entity = searchParams.get('entity');

        const where: any = {};
        if (action) where.action = action;
        if (entity) where.entity = entity;

        // ดึงข้อมูลจาก DB พร้อม Pagination
        const [logs, total] = await Promise.all([
            prisma.tbl_system_logs.findMany({
                where,
                orderBy: { created_at: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.tbl_system_logs.count({ where }),
        ]);

        return NextResponse.json({
            logs: logs.map(log => ({
                ...log,
                details: log.details ? JSON.parse(log.details) : null
            })),
            total,
            limit,
            offset,
        });
    } catch (error) {
        console.error('Audit log fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
    }
}
