import { prisma } from '@/lib/prisma';
import AssetForm from '@/components/AssetForm';
import { notFound } from 'next/navigation';

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const asset = await prisma.tbl_assets.findUnique({
        where: { asset_id: parseInt(id) },
    });

    if (!asset) {
        return notFound();
    }

    // Convert Decimal to number for form
    const formattedAsset = {
        ...asset,
        purchase_price: Number(asset.purchase_price),
        salvage_value: Number(asset.salvage_value),
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">แก้ไขข้อมูลทรัพย์สิน</h1>
            <AssetForm asset={formattedAsset} />
        </div>
    );
}
