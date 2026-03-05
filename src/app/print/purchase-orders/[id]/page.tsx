import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { getRolePermissions } from '@/actions/roleActions';
import { PERMISSIONS } from '@/lib/permissions';
import { Lock } from 'lucide-react';
import PrintButton from './PrintButton';

export default async function POPrintPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const poId = parseInt(params.id);
    if (isNaN(poId)) notFound();

    const session = await auth();
    const userRole = (session?.user as { role?: string })?.role || '';
    const rolePermissions = await getRolePermissions(userRole);

    // Check Print Permission (reuses PO_PRINT or PO_VIEW if strict)
    if (!rolePermissions[PERMISSIONS.PO_PRINT] && !rolePermissions[PERMISSIONS.PO_VIEW]) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-gray-500">
                <Lock className="w-12 h-12 mb-4 text-gray-400" />
                <h3 className="text-lg font-medium">Access Denied</h3>
            </div>
        );
    }

    const po = await prisma.tbl_purchase_orders.findUnique({
        where: { po_id: poId },
    });

    if (!po) notFound();

    const items = await prisma.tbl_po_items.findMany({
        where: { po_id: poId }
    });

    // Merge items
    const poWithItems = { ...po, tbl_po_items: items };

    // Get Product Names
    const pIds = poWithItems.tbl_po_items.map(i => i.p_id);
    const products = await prisma.tbl_products.findMany({ where: { p_id: { in: pIds } }, select: { p_id: true, p_name: true } });
    const productMap = new Map(products.map(p => [p.p_id, p.p_name]));

    // Get Supplier
    const supplier = po.supplier_id ? await prisma.tbl_suppliers.findUnique({ where: { id: po.supplier_id } }) : null;

    // Fetch Company Settings
    const settings = await prisma.tbl_system_settings.findMany();
    const companyInfo = settings.reduce((acc, curr) => {
        acc[curr.setting_key] = curr.setting_value;
        return acc;
    }, {} as Record<string, string>);



    return (
        <div className="bg-white min-h-screen p-8 print:p-0 text-black">
            <div className="max-w-[210mm] mx-auto print:max-w-none">
                {/* Print Controls */}
                <div className="mb-6 print:hidden flex justify-end">
                    <PrintButton />
                </div>

                {/* Header */}
                <div className="border-b pb-4 mb-6 flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold uppercase tracking-wider mb-2">Purchase Order</h1>
                        <div className="text-sm">
                            <p className="font-bold">{companyInfo['company_name'] || 'Company Name Co., Ltd.'}</p>
                            <p>{companyInfo['company_address'] || '123 Business Rd, Bangkok 10110'}</p>
                            <p>Tax ID: {companyInfo['company_tax_id'] || '0123456789000'}</p>
                            <p>Tel: {companyInfo['company_phone'] || '-'} Email: {companyInfo['company_email'] || '-'}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="mb-2">
                            <span className="text-sm text-gray-500 block">PO Number</span>
                            <span className="text-xl font-bold">{po.po_number}</span>
                        </div>
                        <div className="mb-2">
                            <span className="text-sm text-gray-500 block">Date</span>
                            <span>{po.order_date ? new Date(po.order_date).toLocaleDateString('th-TH') : '-'}</span>
                        </div>
                        <div>
                            <span className="text-sm text-gray-500 block">Status</span>
                            <span className="uppercase font-semibold">{po.status}</span>
                        </div>
                    </div>
                </div>

                {/* Supplier Info */}
                <div className="mb-8 p-4 border rounded-sm">
                    <h3 className="text-xs uppercase font-bold text-gray-500 mb-2">Vendor / Supplier</h3>
                    <div className="font-bold text-lg">{supplier?.name || 'Unknown Supplier'}</div>
                    <div className="text-sm mt-1">
                        <p>{supplier?.address}</p>
                        <p>Phone: {supplier?.phone} | Email: {supplier?.email}</p>
                        <p>Tax ID: {supplier?.tax_id}</p>
                    </div>
                </div>

                {/* Items Table */}
                <table className="w-full text-sm mb-8">
                    <thead>
                        <tr className="border-b-2 border-black">
                            <th className="py-2 text-left w-12">#</th>
                            <th className="py-2 text-left">Description</th>
                            <th className="py-2 text-right w-24">Qty</th>
                            <th className="py-2 text-right w-32">Unit Price</th>
                            <th className="py-2 text-right w-32">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {poWithItems.tbl_po_items.map((item, index) => (
                            <tr key={item.item_id}>
                                <td className="py-3 text-gray-500">{index + 1}</td>
                                <td className="py-3">
                                    <div className="font-bold">{productMap.get(item.p_id)}</div>
                                    <div className="text-xs text-gray-500">{item.p_id}</div>
                                </td>
                                <td className="py-3 text-right">{item.quantity}</td>
                                <td className="py-3 text-right">{Number(item.unit_price).toLocaleString()}</td>
                                <td className="py-3 text-right font-bold">{Number(item.line_total).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-black">
                            <td colSpan={3}></td>
                            <td className="py-2 text-right">Subtotal</td>
                            <td className="py-2 text-right">{Number(po.subtotal || 0).toLocaleString()}</td>
                        </tr>
                        {Number(po.tax_amount || 0) > 0 && (
                            <tr>
                                <td colSpan={3}></td>
                                <td className="py-2 text-right">VAT (7%)</td>
                                <td className="py-2 text-right">{Number(po.tax_amount || 0).toLocaleString()}</td>
                            </tr>
                        )}
                        <tr className="border-t border-gray-200">
                            <td colSpan={3}></td>
                            <td className="py-3 text-right font-bold">Total Amount</td>
                            <td className="py-3 text-right font-bold text-lg">{Number(po.total_amount).toLocaleString()}</td>
                        </tr>
                    </tfoot>
                </table>

                {/* Notes */}
                {po.notes && (
                    <div className="mb-8 border p-4 bg-gray-50 print:bg-transparent">
                        <h4 className="font-bold text-sm mb-1">Notes:</h4>
                        <p className="text-sm whitespace-pre-wrap">{po.notes}</p>
                    </div>
                )}

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-12 mt-20 page-break-inside-avoid">
                    <div className="text-center">
                        <div className="border-b border-black w-3/4 mx-auto mb-2"></div>
                        <p className="font-bold">{po.created_by || '________________'}</p>
                        <p className="text-xs uppercase text-gray-500">Prepared By</p>
                        <p className="text-xs mt-1">Date: ____/____/____</p>
                    </div>
                    <div className="text-center">
                        <div className="border-b border-black w-3/4 mx-auto mb-2 opacity-50"></div>
                        <p className="font-bold">{po.approved_by || '________________'}</p>
                        <p className="text-xs uppercase text-gray-500">Approved By</p>
                        <p className="text-xs mt-1">Date: ____/____/____</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-12 text-center text-xs text-gray-400 print:fixed print:bottom-4 print:left-0 print:w-full">
                    <p>Generated by Stock Movement System on {new Date().toLocaleDateString('th-TH')}</p>
                </div>

            </div>
        </div>
    );
}
