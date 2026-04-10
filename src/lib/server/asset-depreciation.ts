import { prisma } from '@/lib/prisma';

type RunMonthlyDepreciationOptions = {
    performedBy?: string;
    runDate?: Date;
};

type RunMonthlyDepreciationResult = {
    successCount: number;
    monthYearLabel: string;
    runDate: Date;
};

export async function runMonthlyDepreciationSnapshot(
    options: RunMonthlyDepreciationOptions = {},
): Promise<RunMonthlyDepreciationResult> {
    const runDate = options.runDate ?? new Date();
    const performedBy = options.performedBy || 'System Cron';
    const monthYearLabel = runDate.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' });

    const assets = await prisma.tbl_assets.findMany({
        where: { status: 'Active' },
        select: {
            asset_id: true,
            purchase_price: true,
            salvage_value: true,
            useful_life_years: true,
            purchase_date: true,
        },
    });

    let successCount = 0;

    for (const asset of assets) {
        const cost = Number(asset.purchase_price || 0);
        const salvage = Number(asset.salvage_value || 0);
        const life = Number(asset.useful_life_years || 0);

        if (life <= 0 || cost <= salvage) {
            continue;
        }

        const endOfLifeDate = new Date(asset.purchase_date);
        endOfLifeDate.setFullYear(asset.purchase_date.getFullYear() + life);
        if (runDate.getTime() > endOfLifeDate.getTime()) {
            continue;
        }

        const totalDepreciable = cost - salvage;
        const annualDepreciation = totalDepreciable / life;
        const monthlyDepreciation = annualDepreciation / 12;

        await prisma.tbl_asset_history.create({
            data: {
                asset_id: asset.asset_id,
                action_type: 'Depreciation',
                description: `รันค่าเสื่อมราคารายเดือนอัตโนมัติประจำเดือน ${monthYearLabel}`,
                cost: monthlyDepreciation,
                performed_by: performedBy,
            },
        });
        successCount++;
    }

    return {
        successCount,
        monthYearLabel,
        runDate,
    };
}
