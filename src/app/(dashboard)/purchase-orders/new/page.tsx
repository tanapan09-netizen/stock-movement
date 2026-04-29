import { prisma } from '@/lib/prisma';
import POForm from '@/components/POForm';
import { ArrowLeft, ClipboardList, FileCheck2, Lock } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/auth';
import { canEditPurchaseOrders } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';
import type { PurchaseOrderItemKind } from '@/lib/purchase-order-item';

type PrefillPOItem = {
    p_id: string;
    p_name: string;
    quantity: number;
    unit_price: number;
    item_type: PurchaseOrderItemKind;
};

function parseNumeric(value: string) {
    const normalized = value.replace(/[^0-9.]/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
}

function parsePurchaseRequestItems(reason: string | null | undefined, products: Array<{ p_id: string; p_name: string; price_unit: number }>): PrefillPOItem[] {
    if (!reason) return [];

    const lines = reason.split('\n');
    const parsedItems: PrefillPOItem[] = [];
    let nonStockIndex = 1;

    for (const rawLine of lines) {
        const line = rawLine.trim();
        const match = line.match(/^\d+\.\s*(.+?)\s*-\s*([\d,]+(?:\.\d+)?)\s+.+?\s*@\s*฿?\s*([\d,]+(?:\.\d+)?)/i);
        if (!match) continue;

        const rawDescription = match[1].trim();
        const explicitNonStock = /^\[(?:NON[-_\s]?STOCK)\]\s*/i.test(rawDescription);
        const description = rawDescription
            .replace(/^\[(?:NON[-_\s]?STOCK)\]\s*/i, '')
            .replace(/^\[(?:STOCK)\]\s*/i, '')
            .trim();
        const quantity = Math.max(1, Math.trunc(parseNumeric(match[2])));
        const unitPrice = parseNumeric(match[3]);
        const normalizedDescription = description.toLowerCase();
        const matchedProduct = products.find((product) => (
            product.p_id.toLowerCase() === normalizedDescription
            || product.p_name.trim().toLowerCase() === normalizedDescription
        ));

        if (matchedProduct && !explicitNonStock) {
            parsedItems.push({
                p_id: matchedProduct.p_id,
                p_name: matchedProduct.p_name,
                quantity,
                unit_price: unitPrice || Number(matchedProduct.price_unit || 0),
                item_type: 'stock',
            });
            continue;
        }

        parsedItems.push({
            p_id: `NON-STOCK-PR-${nonStockIndex.toString().padStart(3, '0')}`,
            p_name: description,
            quantity,
            unit_price: unitPrice,
            item_type: 'non_stock',
        });
        nonStockIndex += 1;
    }

    return parsedItems;
}

function buildDefaultPoNumber(requestId?: number | null) {
    const now = new Date();
    const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = requestId ? String(requestId).padStart(3, '0') : '000';
    return `PO-${yyyymmdd}-${suffix}`;
}

export default async function NewPOPage(props: {
    searchParams?: Promise<{
        request_id?: string;
        request_number?: string;
        reference_job?: string;
        amount?: string;
        reason?: string;
    }>;
}) {
    const session = await auth();
    const { permissions: rolePermissions } = await getUserPermissionContext(session?.user as PermissionSessionUser | undefined);

    if (!canEditPurchaseOrders(rolePermissions)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
                <Lock className="w-12 h-12 mb-4 text-gray-400" />
                <h3 className="text-lg font-medium">Access Denied</h3>
                <p>คุณไม่มีสิทธิ์เข้าถึงหน้าสร้างใบสั่งซื้อ</p>
            </div>
        );
    }

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
    const requestId = searchParams?.request_id ? Number(searchParams.request_id) : null;
    const linkedPurchaseRequest = requestId
        ? await prisma.tbl_approval_requests.findFirst({
            where: {
                request_id: requestId,
                request_type: 'purchase',
            },
            select: {
                request_id: true,
                request_number: true,
                reference_job: true,
                amount: true,
                reason: true,
            },
        })
        : null;

    const requestAmountFromParams = searchParams?.amount ? Number(searchParams.amount) : null;
    const initialRequestContext = linkedPurchaseRequest
        ? {
            requestId: linkedPurchaseRequest.request_id,
            requestNumber: linkedPurchaseRequest.request_number,
            referenceJob: linkedPurchaseRequest.reference_job || null,
            amount: linkedPurchaseRequest.amount !== null && linkedPurchaseRequest.amount !== undefined
                ? Number(linkedPurchaseRequest.amount)
                : null,
            reason: linkedPurchaseRequest.reason || null,
        }
        : searchParams?.request_number ? {
            requestId: requestId,
            requestNumber: searchParams.request_number,
            referenceJob: searchParams.reference_job || null,
            amount: Number.isFinite(requestAmountFromParams) ? requestAmountFromParams : null,
            reason: searchParams.reason || null,
        } : undefined;

    const initialRequestItems = parsePurchaseRequestItems(
        linkedPurchaseRequest?.reason || searchParams?.reason,
        productsSerialized.map((product) => ({
            p_id: product.p_id,
            p_name: product.p_name,
            price_unit: Number(product.price_unit || 0),
        })),
    );

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
                                หน้านี้ใช้สำหรับขั้นจัดซื้อออก PO หลังยืนยันออก PO ระบบจะส่งงานไปคิว Store รับเข้าให้อัตโนมัติ
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
            <POForm
                products={productsSerialized}
                suppliers={suppliers}
                initialRequestContext={initialRequestContext}
                initialRequestItems={initialRequestItems}
                defaultPoNumber={buildDefaultPoNumber(initialRequestContext?.requestId)}
            />
        </div>
    );
}
