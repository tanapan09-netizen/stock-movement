import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause
    const where: any = {};

    if (search) {
        where.OR = [
            { p_id: { contains: search } },
            { username: { contains: search } },
            { remarks: { contains: search } },
        ];
    }

    if (startDate || endDate) {
        where.movement_time = {};
        if (startDate) {
            where.movement_time.gte = new Date(startDate);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            where.movement_time.lte = end;
        }
    }

    try {
        const movements = await prisma.tbl_product_movements.findMany({
            where,
            orderBy: { movement_time: 'desc' },
        });

        // Get product details
        const pIds = Array.from(new Set(movements.map(m => m.p_id)));
        const products = await prisma.tbl_products.findMany({
            where: { p_id: { in: pIds } },
            select: { p_id: true, p_name: true }
        });

        const productMap = new Map(products.map(p => [p.p_id, p]));

        // Enrich data
        const enrichedMovements = movements.map(m => {
            const product = productMap.get(m.p_id);
            return {
                movement_id: m.movement_id,
                p_id: m.p_id,
                p_name: product?.p_name || m.p_id,
                movement_type: m.movement_type,
                quantity: m.quantity,
                remarks: m.remarks,
                username: m.username,
                movement_time: m.movement_time,
            };
        });

        return NextResponse.json({ movements: enrichedMovements });
    } catch (error) {
        console.error('Export failed:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}
