import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, DollarSign, Activity } from 'lucide-react';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { addAssetHistory } from '@/actions/assetActions';
import AssetActions from '@/components/AssetActions';
import PrintButton from '@/components/PrintButton';
import AssetLabelPrintButton from '@/components/AssetLabelPrintButton';
import AssetImage from '@/components/AssetImage';
import { canAccessDashboardPage } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';

type DepreciationRow = {
    year: number;
    daysUsed: number;
    beginningValue: number;
    expense: number;
    accumulatedDep: number;
    endingValue: number;
};

const translateActionType = (type: string) => {
    switch (type) {
        case 'Create': return 'ลงทะเบียน';
        case 'Update': return 'แก้ไขข้อมูล';
        case 'Purchase': return 'ซื้อสินทรัพย์';
        case 'OpeningBalance': return 'เพิ่มสินทรัพย์ยกมา';
        case 'Repair': return 'ซ่อม';
        case 'Maintenance': return 'บำรุงรักษา';
        case 'Move': return 'ย้ายสถานที่';
        case 'Sell': return 'ขายสินทรัพย์';
        case 'DepreciationPause': return 'หยุดคิดค่าเสื่อม';
        case 'DepreciationResume': return 'เริ่มคิดค่าเสื่อม';
        case 'Dispose': return 'จำหน่าย/เลิกใช้งาน';
        default: return type;
    }
};

function getImageUrl(url: string | null) {
    if (!url) return null;
    try {
        const parsed = JSON.parse(url);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
    } catch {
        // ignore JSON parse error
    }
    if (url.startsWith('http') || url.startsWith('/uploads/')) return url;
    return `/uploads/${url}`;
}

function getStatusBadgeClass(status: string) {
    if (status === 'Active') return 'bg-green-100 text-green-800';
    if (status === 'DepreciationPaused') return 'bg-violet-100 text-violet-800';
    if (status === 'Sold') return 'bg-rose-100 text-rose-800';
    if (status === 'Disposed') return 'bg-red-100 text-red-800';
    if (status === 'InRepair') return 'bg-amber-100 text-amber-800';
    return 'bg-gray-100 text-gray-800';
}

function buildDepreciationTable(input: {
    cost: number;
    salvage: number;
    life: number;
    purchaseDate: Date;
    cutoffDate: Date;
}): DepreciationRow[] {
    const { cost, salvage, life, purchaseDate, cutoffDate } = input;
    if (life <= 0 || cost <= salvage || cutoffDate.getTime() < purchaseDate.getTime()) return [];

    const annualDepreciation = cost / life;
    const msPerDay = 1000 * 60 * 60 * 24;
    const totalDepreciable = Math.max(0, cost - salvage);
    const endOfLifeDate = new Date(purchaseDate);
    endOfLifeDate.setFullYear(purchaseDate.getFullYear() + life);

    const scheduleEndDate = cutoffDate.getTime() < endOfLifeDate.getTime()
        ? cutoffDate
        : endOfLifeDate;

    const purchaseYear = purchaseDate.getFullYear();
    const currentYear = scheduleEndDate.getFullYear();
    const table: DepreciationRow[] = [];
    let accumulatedDep = 0;

    for (let year = purchaseYear; year <= currentYear; year++) {
        const periodStart = new Date(Math.max(purchaseDate.getTime(), new Date(year, 0, 1).getTime()));
        const periodEnd = new Date(Math.min(scheduleEndDate.getTime(), new Date(year, 11, 31).getTime()));
        if (periodEnd.getTime() < periodStart.getTime()) continue;

        const beginningValue = cost - accumulatedDep;
        const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        const daysInThisYear = isLeapYear ? 366 : 365;
        const daysUsed = Math.floor((periodEnd.getTime() - periodStart.getTime()) / msPerDay) + 1;
        let expense = (annualDepreciation / daysInThisYear) * daysUsed;

        if (accumulatedDep + expense > totalDepreciable) {
            expense = totalDepreciable - accumulatedDep;
        }

        accumulatedDep += expense;
        const endingValue = cost - accumulatedDep;

        table.push({
            year,
            daysUsed,
            beginningValue,
            expense,
            accumulatedDep,
            endingValue,
        });

        if (endingValue <= salvage || accumulatedDep >= totalDepreciable) break;
    }

    return table;
}

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    const permissionContext = await getUserPermissionContext(session?.user as PermissionSessionUser | undefined);
    const canEditPage = canAccessDashboardPage(
        permissionContext.role,
        permissionContext.permissions,
        '/assets/[id]',
        { isApprover: permissionContext.isApprover, level: 'edit' },
    );
    const printedBy = typeof session?.user?.name === 'string' && session.user.name.trim()
        ? session.user.name
        : 'Admin';

    const asset = await prisma.tbl_assets.findUnique({
        where: { asset_id: parseInt(id, 10) },
        include: {
            tbl_asset_history: {
                orderBy: { action_date: 'desc' },
            },
        },
    });

    if (!asset) return notFound();

    const cost = Number(asset.purchase_price);
    const salvage = Number(asset.salvage_value);
    const life = asset.useful_life_years;
    const annualDepreciation = life > 0 ? cost / life : 0;
    const purchaseDate = new Date(asset.purchase_date);
    const depreciationPauseEntry = asset.tbl_asset_history.find((entry) => entry.action_type === 'DepreciationPause');
    const now = new Date();
    const depreciationCutoffDate = asset.status === 'DepreciationPaused'
        ? (depreciationPauseEntry ? new Date(depreciationPauseEntry.action_date) : now)
        : now;
    const depreciationStopped = asset.status === 'DepreciationPaused';
    const depreciationTable = buildDepreciationTable({
        cost,
        salvage,
        life,
        purchaseDate,
        cutoffDate: depreciationCutoffDate,
    });
    const currentYear = depreciationCutoffDate.getFullYear();

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <Link href="/assets" className="flex items-center text-gray-500 hover:text-blue-600 transition">
                    <ArrowLeft className="w-4 h-4 mr-1" /> ย้อนกลับ
                </Link>
                <div className="flex gap-2">
                    <AssetLabelPrintButton
                        assetCode={asset.asset_code}
                        assetName={asset.asset_name}
                        category={asset.category}
                        location={asset.location}
                        roomSection={asset.room_section}
                    />
                    <AssetActions
                        asset={{
                            asset_id: asset.asset_id,
                            asset_code: asset.asset_code,
                            asset_name: asset.asset_name,
                        }}
                        isAdmin={canEditPage}
                        variant="button"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="h-64 bg-gray-100 flex items-center justify-center">
                            {asset.image_url ? (
                                <AssetImage
                                    src={getImageUrl(asset.image_url)!}
                                    className="h-full w-full object-cover"
                                    alt={asset.asset_name}
                                    fallbackText="Asset Image"
                                />
                            ) : (
                                <span className="text-gray-400">No Image</span>
                            )}
                        </div>
                        <div className="p-6">
                            <h1 className="text-2xl font-bold text-gray-800 mb-2">{asset.asset_name}</h1>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{asset.asset_code}</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(asset.status)}`}>
                                    {asset.status}
                                </span>
                            </div>

                            <div className="space-y-3 text-sm text-gray-600">
                                <div className="flex justify-between border-b pb-2">
                                    <span>หมวดหมู่</span>
                                    <span className="font-medium text-gray-900">{asset.category}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span>สถานที่</span>
                                    <span className="font-medium text-gray-900">{asset.location || '-'}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span>โซน/จุดติดตั้ง</span>
                                    <span className="font-medium text-gray-900">{asset.room_section || '-'}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span>วันที่ซื้อ</span>
                                    <span className="font-medium text-gray-900">{new Date(asset.purchase_date).toLocaleDateString('th-TH')}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span>ราคาซื้อ</span>
                                    <span className="font-medium text-gray-900">{cost.toLocaleString()} บาท</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span>Serial Number</span>
                                    <span className="font-medium text-gray-900">{asset.serial_number || '-'}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span>Brand</span>
                                    <span className="font-medium text-gray-900">{asset.brand || '-'}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span>Model</span>
                                    <span className="font-medium text-gray-900">{asset.model || '-'}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span>Vendor</span>
                                    <span className="font-medium text-gray-900">{asset.vendor || '-'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {canEditPage && (
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                                <Activity className="w-4 h-4 mr-2" /> บันทึกประวัติรายการ
                            </h3>
                            <form action={addAssetHistory} className="space-y-3">
                                <input type="hidden" name="asset_id" value={asset.asset_id} />
                                <select name="action_type" className="w-full text-sm border rounded p-2">
                                    <option value="Maintenance">บำรุงรักษา</option>
                                    <option value="Repair">ซ่อม</option>
                                    <option value="Move">ย้ายสถานที่</option>
                                    <option value="Sell">ขายทรัพย์สิน</option>
                                    <option value="DepreciationPause">หยุดคิดค่าเสื่อมราคา</option>
                                    <option value="DepreciationResume">เริ่มคิดค่าเสื่อมราคาอีกครั้ง</option>
                                    <option value="Dispose">จำหน่าย/เลิกใช้งาน</option>
                                </select>
                                <input
                                    type="text"
                                    name="description"
                                    placeholder="รายละเอียด..."
                                    required
                                    className="w-full text-sm border rounded p-2"
                                />
                                <input type="number" name="cost" placeholder="ค่าใช้จ่าย (ถ้ามี)" className="w-full text-sm border rounded p-2" />

                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    <input type="date" name="work_date" className="w-full text-sm border rounded p-2" />
                                    <input type="date" name="next_maintenance_date" className="w-full text-sm border rounded p-2" />
                                </div>

                                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                    <input type="date" name="sale_date" className="w-full text-sm border rounded p-2" />
                                    <input type="number" min="0" step="0.01" name="sale_price" placeholder="ราคาขาย (บาท)" className="w-full text-sm border rounded p-2" />
                                    <input type="text" name="buyer_name" placeholder="ผู้ซื้อ" className="w-full text-sm border rounded p-2" />
                                </div>
                                <input type="text" name="sale_reference" placeholder="เลขที่เอกสารการขาย/อ้างอิง" className="w-full text-sm border rounded p-2" />

                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    <input
                                        type="text"
                                        name="performed_by_override"
                                        placeholder="ผู้ดำเนินการจริง (ช่าง/ผู้รับเหมา)"
                                        className="w-full text-sm border rounded p-2"
                                    />
                                    <select name="maintenance_state" defaultValue="" className="w-full text-sm border rounded p-2">
                                        <option value="">ไม่เปลี่ยนสถานะทรัพย์สิน</option>
                                        <option value="Active">Active</option>
                                        <option value="InRepair">InRepair</option>
                                    </select>
                                </div>

                                <input type="text" name="work_order_ref" placeholder="เลขที่ใบงาน/เอกสารอ้างอิง" className="w-full text-sm border rounded p-2" />
                                <input type="text" name="service_provider" placeholder="ผู้ให้บริการ/ร้านซ่อม" className="w-full text-sm border rounded p-2" />
                                <textarea name="parts_replaced" placeholder="รายการอะไหล่ที่เปลี่ยน" className="w-full text-sm border rounded p-2" />
                                <input type="number" min="0" step="0.5" name="downtime_hours" placeholder="Downtime (ชั่วโมง)" className="w-full text-sm border rounded p-2" />
                                <input type="text" name="new_location" placeholder="New location" className="w-full text-sm border rounded p-2" />
                                <input type="text" name="new_room_section" placeholder="New room section" className="w-full text-sm border rounded p-2" />
                                <input type="text" name="transfer_approval_ref" placeholder="Transfer approval ref" className="w-full text-sm border rounded p-2" />
                                <textarea name="disposal_reason" placeholder="เหตุผลจำหน่าย (ใช้กับ Dispose)" className="w-full text-sm border rounded p-2" />
                                <input type="text" name="secondary_approver" placeholder="ผู้อนุมัติคนที่ 2 (ถ้าจำเป็น)" className="w-full text-sm border rounded p-2" />
                                <button type="submit" className="w-full bg-blue-600 text-white rounded py-2 text-sm font-medium hover:bg-blue-700">
                                    บันทึก
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div id="depreciation-printable" className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-800 flex items-center text-lg mb-3">
                                    <DollarSign className="w-5 h-5 mr-2" /> ตารางค่าเสื่อมราคา (Straight-Line)
                                </h3>
                                <div className="flex flex-wrap gap-2 text-sm">
                                    <div className="bg-blue-600 text-white px-3 py-1.5 rounded shadow-sm">
                                        <span className="opacity-80 mr-1">ต้นทุน</span>
                                        <span className="font-bold">{cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="bg-blue-600 text-white px-3 py-1.5 rounded shadow-sm">
                                        <span className="opacity-80 mr-1">มูลค่าซาก</span>
                                        <span className="font-bold">{salvage.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="bg-blue-600 text-white px-3 py-1.5 rounded shadow-sm">
                                        <span className="opacity-80 mr-1">อายุใช้งาน</span>
                                        <span className="font-bold">{life} ปี</span>
                                    </div>
                                    <div className="bg-blue-600 text-white px-3 py-1.5 rounded shadow-sm">
                                        <span className="opacity-80 mr-1">ค่าเสื่อม/ปี</span>
                                        <span className="font-bold">{annualDepreciation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="bg-blue-700 text-white px-3 py-1.5 rounded shadow-sm">
                                        <span className="opacity-80 mr-1">เริ่มคิดค่าเสื่อม</span>
                                        <span className="font-bold">{purchaseDate.toLocaleDateString('th-TH')}</span>
                                    </div>
                                    {depreciationStopped && (
                                        <div className="bg-violet-700 text-white px-3 py-1.5 rounded shadow-sm">
                                            <span className="opacity-80 mr-1">หยุดคิดค่าเสื่อม</span>
                                            <span className="font-bold">{depreciationCutoffDate.toLocaleDateString('th-TH')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <PrintButton
                                assetName={asset.asset_name}
                                assetCode={asset.asset_code}
                                cost={cost}
                                salvage={salvage}
                                life={life}
                                printedBy={printedBy}
                            />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-center">
                                <thead className="bg-white text-gray-500 border-b">
                                    <tr>
                                        <th className="py-3 px-4">ปี</th>
                                        <th className="py-3 px-4">จำนวนวัน</th>
                                        <th className="py-3 px-4">มูลค่าต้นงวด</th>
                                        <th className="py-3 px-4">ค่าเสื่อมงวด</th>
                                        <th className="py-3 px-4">ค่าเสื่อมสะสม</th>
                                        <th className="py-3 px-4">มูลค่าคงเหลือ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {depreciationTable.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-6 text-gray-500">ไม่มีรายการค่าเสื่อมตามเงื่อนไขปัจจุบัน</td>
                                        </tr>
                                    ) : (
                                        depreciationTable.map((row) => (
                                            <tr key={row.year} className={row.year === currentYear ? 'bg-blue-50 font-medium' : ''}>
                                                <td className="py-2 px-4">{row.year + 543}</td>
                                                <td className="py-2 px-4 text-gray-500">{row.daysUsed}</td>
                                                <td className="py-2 px-4">{row.beginningValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td className="py-2 px-4 text-red-600">{row.expense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td className="py-2 px-4 text-gray-500">{row.accumulatedDep.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td className="py-2 px-4 text-blue-600">{row.endingValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-4 border-b">
                            <h3 className="font-bold text-gray-800 flex items-center">
                                <Calendar className="w-4 h-4 mr-2" /> ประวัติการใช้งาน/บำรุงรักษา
                            </h3>
                        </div>
                        <div className="p-6">
                            {asset.tbl_asset_history.length === 0 ? (
                                <p className="text-center text-gray-400 py-4">ยังไม่มีประวัติ</p>
                            ) : (
                                <div className="relative border-l-2 border-gray-200 ml-3 space-y-6">
                                    {asset.tbl_asset_history.map((history) => (
                                        <div key={history.history_id} className="relative pl-8">
                                            <span className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-white ${history.action_type === 'Create'
                                                ? 'bg-green-500'
                                                : history.action_type === 'Repair'
                                                    ? 'bg-orange-500'
                                                    : history.action_type === 'Sell'
                                                        ? 'bg-rose-500'
                                                        : history.action_type === 'DepreciationPause'
                                                            ? 'bg-violet-500'
                                                            : history.action_type === 'Dispose'
                                                                ? 'bg-red-500'
                                                                : 'bg-blue-500'
                                                }`}
                                            />
                                            <div>
                                                <div className="flex items-center text-sm mb-1">
                                                    <span className="font-bold text-gray-900 mr-2">{translateActionType(history.action_type)}</span>
                                                    <span className="text-gray-500 text-xs">{new Date(history.action_date).toLocaleString('th-TH')}</span>
                                                </div>
                                                <p className="text-sm text-gray-700">{history.description || '-'}</p>
                                                {(history.cost && Number(history.cost) > 0) && (
                                                    <p className="text-sm text-red-600 mt-1">
                                                        มูลค่ารายการ: {Number(history.cost).toLocaleString()} บาท
                                                    </p>
                                                )}
                                                <p className="text-xs text-gray-500 mt-1">โดย: {history.performed_by || '-'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
