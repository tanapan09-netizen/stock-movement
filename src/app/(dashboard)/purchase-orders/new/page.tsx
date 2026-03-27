import { prisma } from '@/lib/prisma';
import POForm from '@/components/POForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function NewPOPage(props: {
    searchParams?: Promise<{
        request_id?: string;
        request_number?: string;
        reference_job?: string;
        amount?: string;
        reason?: string;
    }>;
}) {
    const searchParams = await props.searchParams;
    const [products, suppliers] = await Promise.all([
        prisma.tbl_products.findMany({ select: { p_id: true, p_name: true, price_unit: true }, where: { active: true } }),
        prisma.tbl_suppliers.findMany({ select: { id: true, name: true } })
    ]);

    // Convert Decimal to number for client component
    const productsSerialized = products.map(p => ({
        ...p,
        price_unit: p.price_unit ? Number(p.price_unit) : 0
    }));
    const requestAmount = searchParams?.amount ? Number(searchParams.amount) : null;
    const initialRequestContext = searchParams?.request_number ? {
        requestId: searchParams.request_id ? Number(searchParams.request_id) : null,
        requestNumber: searchParams.request_number,
        referenceJob: searchParams.reference_job || null,
        amount: Number.isFinite(requestAmount) ? requestAmount : null,
        reason: searchParams.reason || null,
    } : undefined;

    return (
        <div className="max-w-6xl mx-auto py-6">
            <Link href="/purchase-orders" className="flex items-center text-sm text-gray-500 mb-4 hover:text-gray-700">
                <ArrowLeft className="w-4 h-4 mr-1" /> กลับ
            </Link>
            <h1 className="text-2xl font-bold text-gray-800 mb-6">สร้างใบสั่งซื้อ (PO)</h1>
            <POForm products={productsSerialized} suppliers={suppliers} initialRequestContext={initialRequestContext} />
        </div>
    );
}
