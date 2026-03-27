import { prisma } from '@/lib/prisma';
import POForm from '@/components/POForm';
import { ArrowLeft, ClipboardList, FileCheck2 } from 'lucide-react';
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
            {initialRequestContext && (
                <div className="mb-6 rounded-2xl border border-cyan-200 bg-cyan-50 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white px-3 py-1 text-xs font-semibold text-cyan-700">
                                <FileCheck2 className="h-3.5 w-3.5" />
                                Workflow จัดซื้อ ขั้นออก PO
                            </div>
                            <p className="mt-3 text-sm text-slate-600">
                                หน้านี้ใช้สำหรับขั้นจัดซื้อออก PO หลังบันทึกเอกสารแล้วให้กลับไปที่ queue หลักเพื่อส่งต่อ Store รับเข้า
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Link
                                href="/purchase-request/manage"
                                className="inline-flex items-center gap-2 rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm font-medium text-cyan-700 hover:bg-cyan-50"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                กลับคิวจัดซื้อ
                            </Link>
                            {initialRequestContext.requestId ? (
                                <Link
                                    href={`/print/purchase-request/${initialRequestContext.requestId}`}
                                    target="_blank"
                                    className="inline-flex items-center gap-2 rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm font-medium text-cyan-700 hover:bg-cyan-50"
                                >
                                    <ClipboardList className="h-4 w-4" />
                                    เปิด PR
                                </Link>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

            <Link href={initialRequestContext ? "/purchase-request/manage" : "/purchase-orders"} className="flex items-center text-sm text-gray-500 mb-4 hover:text-gray-700">
                <ArrowLeft className="w-4 h-4 mr-1" /> กลับ
            </Link>
            <h1 className="text-2xl font-bold text-gray-800 mb-6">สร้างใบสั่งซื้อ (PO)</h1>
            <POForm products={productsSerialized} suppliers={suppliers} initialRequestContext={initialRequestContext} />
        </div>
    );
}
