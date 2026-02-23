import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week';

    const days = period === 'month' ? 30 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
        // Get movement trends
        const movements = await prisma.tbl_product_movements.findMany({
            where: {
                movement_time: {
                    gte: startDate
                }
            },
            select: {
                movement_time: true,
                movement_type: true,
                quantity: true
            },
            orderBy: {
                movement_time: 'asc'
            }
        });

        // Group by date
        const trendMap = new Map<string, { in: number; out: number }>();

        // Initialize dates
        for (let i = 0; i < days; i++) {
            const d = new Date();
            d.setDate(d.getDate() - (days - 1 - i));
            const key = d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' });
            trendMap.set(key, { in: 0, out: 0 });
        }

        // Aggregate data
        movements.forEach(m => {
            const key = new Date(m.movement_time).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' });
            const existing = trendMap.get(key) || { in: 0, out: 0 };
            if (m.movement_type === 'in') {
                existing.in += m.quantity;
            } else {
                existing.out += m.quantity;
            }
            trendMap.set(key, existing);
        });

        const trends = Array.from(trendMap.entries()).map(([date, data]) => ({
            date,
            in: data.in,
            out: data.out
        }));

        // Get category breakdown
        const products = await prisma.tbl_products.findMany({
            where: { active: true },
            select: {
                main_category: true,
                p_count: true,
                price_unit: true
            }
        });

        const categoryMap = new Map<string, { count: number; value: number }>();
        products.forEach(p => {
            const cat = p.main_category || 'อื่นๆ';
            const existing = categoryMap.get(cat) || { count: 0, value: 0 };
            existing.count++;
            existing.value += (p.p_count || 0) * (p.price_unit?.toNumber() || 0);
            categoryMap.set(cat, existing);
        });

        const colors = [
            '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
            '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
        ];

        const categories = Array.from(categoryMap.entries())
            .map(([name, data], index) => ({
                name,
                value: data.value,
                count: data.count,
                color: colors[index % colors.length]
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return NextResponse.json({ trends, categories });
    } catch (error) {
        console.error('Dashboard charts error:', error);
        return NextResponse.json({ trends: [], categories: [] });
    }
}
