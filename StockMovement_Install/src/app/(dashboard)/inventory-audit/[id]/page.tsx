import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Play, Save, CheckCircle, XCircle } from 'lucide-react';
import { startAudit, completeAudit, cancelAudit, updateAuditItem } from '@/actions/auditActions';

// Client Component for the Row to handle interactions
import { AuditItemRow } from '@/components/AuditItemRow';

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const auditId = parseInt(id);

    const audit = await prisma.tbl_inventory_audits.findUnique({
        where: { audit_id: auditId },
        include: {
            tbl_audit_items: {
                orderBy: { p_id: 'asc' }
            }
        }
    });

    if (!audit) notFound();

    // Get product names mapping
    const pIds = audit.tbl_audit_items.map(i => i.p_id);
    // @ts-ignore
    const products = await prisma.tbl_products.findMany({
        where: { p_id: { in: pIds } },
        select: { p_id: true, p_name: true, p_unit: true }
    });
    const productMap = new Map(products.map((p: any) => [p.p_id, p]));

    return (
        <div className="max-w-7xl mx-auto pb-20">
            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Link href="/inventory-audit" className="text-gray-500 hover:text-gray-700 flex items-center mb-2">
                        <ArrowLeft className="w-4 h-4 mr-1" /> กลับไปรายการ
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        Audit #{audit.audit_number}
                        <span className={`text-sm px-2 py-1 rounded-full border ${audit.status === 'in_progress' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                audit.status === 'completed' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-600'
                            }`}>
                            {audit.status?.toUpperCase()}
                        </span>
                    </h1>
                    <p className="text-gray-500 text-sm">
                        วันที่: {new Date(audit.audit_date!).toLocaleDateString('th-TH')} | คลัง: #{audit.warehouse_id}
                    </p>
                </div>

                <div className="flex gap-2">
                    {audit.status === 'draft' && (
                        <form action={startAudit.bind(null, auditId)}>
                            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow flex items-center">
                                <Play className="w-5 h-5 mr-2" /> เริ่มตรวจนับ
                            </button>
                        </form>
                    )}

                    {audit.status === 'in_progress' && (
                        <>
                            <form action={completeAudit.bind(null, auditId)}>
                                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold shadow flex items-center"
                                    onClick={(e) => { if (!confirm('ยืนยันว่าตรวจนับครบแล้ว?')) e.preventDefault() }}>
                                    <CheckCircle className="w-5 h-5 mr-2" /> เสร็จสิ้น
                                </button>
                            </form>
                            <form action={cancelAudit.bind(null, auditId)}>
                                <button type="submit" className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold flex items-center"
                                    onClick={(e) => { if (!confirm('ยืนยันยกเลิก?')) e.preventDefault() }}>
                                    <XCircle className="w-5 h-5 mr-2" /> ยกเลิก
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>

            {/* Content */}
            {audit.status === 'draft' ? (
                <div className="bg-white rounded-lg p-12 text-center shadow border border-dashed border-gray-300">
                    <p className="text-xl text-gray-500 mb-4">รายการนี้อยู่ในสถานะ Draft</p>
                    <p className="text-gray-400">กดปุ่ม "เริ่มตรวจนับ" เพื่อดึงข้อมูลสินค้าล่าสุดและเริ่มทำการนับสต็อก</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-4 py-3 w-16">#</th>
                                <th className="px-4 py-3">สินค้า</th>
                                <th className="px-4 py-3 text-right w-32">จำนวนในระบบ</th>
                                <th className="px-4 py-3 text-right w-40">ที่นับได้</th>
                                <th className="px-4 py-3 text-right w-32">ผลต่าง</th>
                                <th className="px-4 py-3 w-20">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {audit.tbl_audit_items.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                                        ไม่พบรายการสินค้าในคลังนี้
                                    </td>
                                </tr>
                            ) : (
                                audit.tbl_audit_items.map((item, index) => {
                                    const product = productMap.get(item.p_id) || { p_name: 'Unknown', p_unit: '-' };
                                    return (
                                        <AuditItemRow
                                            key={item.item_id}
                                            item={item}
                                            index={index}
                                            productName={product.p_name}
                                            unit={product.p_unit}
                                            readOnly={audit.status !== 'in_progress'}
                                        />
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
