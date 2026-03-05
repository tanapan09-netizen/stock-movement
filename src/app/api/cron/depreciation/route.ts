import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAssetFinancialSummary } from '@/actions/assetActions';

// This route should be called on the last day of every month by a cron job (e.g., Vercel Cron or Google Cloud Scheduler)
// You should add an authorization header or a secret token in production to prevent unauthorized runs.
export async function POST(request: Request) {
    try {
        // Optional: Check for a secret token in the request headers to secure the cron endpoint
        // const authHeader = request.headers.get('authorization');
        // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        //     return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        // }

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // 1-12
        const monthYearString = `${now.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' })}`;

        // We run a snapshot of the current accumulated depreciation to log the monthly expense.
        // Instead of calculating exactly what happened this exact month, a standard way is to log the calculated value 
        // Or we just calculate the simple monthly rate and log it.
        const assets = await prisma.tbl_assets.findMany({
            where: { status: 'Active' }
        });

        let successCount = 0;

        for (const asset of assets) {
            const cost = Number(asset.purchase_price);
            const salvage = Number(asset.salvage_value);
            const life = asset.useful_life_years;

            if (life > 0 && cost > salvage) {
                const totalDepreciable = cost - salvage;
                // Straight line yearly
                const annualDepreciation = totalDepreciable / life;
                // Roughly monthly (annual / 12) for the log
                const monthlyDepreciation = annualDepreciation / 12;

                const endOfLifeDate = new Date(asset.purchase_date);
                endOfLifeDate.setFullYear(asset.purchase_date.getFullYear() + life);

                // Check if the asset is fully depreciated
                // If the current date is past the end of life date by more than a month, it's definitively over
                // Note: a more precise way is checking if we've already booked totalDepreciable.

                if (now.getTime() <= endOfLifeDate.getTime()) {
                    await prisma.tbl_asset_history.create({
                        data: {
                            asset_id: asset.asset_id,
                            action_type: 'Depreciation',
                            description: `รันค่าเสื่อมราคารายเดือนอัตโนมัติประจำเดือน ${monthYearString}`,
                            cost: monthlyDepreciation,
                            performed_by: 'System Cron'
                        }
                    });
                    successCount++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Successfully ran monthly depreciation for ${successCount} assets.`,
            timestamp: now.toISOString()
        });

    } catch (error: any) {
        console.error('Error running depreciation cron', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to run depreciation cron',
            error: error.message
        }, { status: 500 });
    }
}
