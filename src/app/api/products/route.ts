import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const active = searchParams.get('active');
        const search = searchParams.get('search');
        const category = searchParams.get('category');
        const limit = searchParams.get('limit');

        // Build where clause
        const where: Record<string, unknown> = {};

        if (active === 'true') {
            where.active = true;
        } else if (active === 'false') {
            where.active = false;
        }

        if (search) {
            where.OR = [
                { p_name: { contains: search } },
                { p_id: { contains: search } }
            ];
        }

        if (category) {
            where.cat_id = parseInt(category);
        }

        // Fetch products
        const products = await prisma.tbl_products.findMany({
            where,
            take: limit ? parseInt(limit) : undefined,
            orderBy: { p_id: 'asc' }
        });

        // Transform response
        const result = products.map(p => ({
            p_id: p.p_id,
            p_name: p.p_name,
            p_count: p.p_count,
            p_unit: p.p_unit,
            price_unit: p.price_unit,
            safety_stock: p.safety_stock,
            active: p.active,
            category_id: p.cat_id,
            created_at: p.created_at
        }));

        return NextResponse.json(result);
    } catch (error) {
        console.error('Products API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch products' },
            { status: 500 }
        );
    }
}
