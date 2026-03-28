import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, DollarSign, Activity } from 'lucide-react';
import { addAssetHistory } from '@/actions/assetActions';
import AssetActions from '@/components/AssetActions';
import PrintButton from '@/components/PrintButton';
import { auth } from '@/auth';
import AssetImage from '@/components/AssetImage';
import { canAccessDashboardPage } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';

const translateActionType = (type: string) => {
    switch (type) {
        case 'Create': return 'ลงทะเบียนใหม่';
        case 'Update': return 'อัปเดตข้อมูล';
        case 'Dispose': return 'จำหน่าย/เลิกใช้งาน';
        case 'Repair': return 'ส่งซ่อม';
        case 'Maintenance': return 'บำรุงรักษา';
        case 'Move': return 'ย้ายสถานที่';
        default: return type;
    }
};

const translateDescription = (desc: string | null) => {
    if (!desc) return '';
    if (desc === 'Asset registered in system') return 'ลงทะเบียนทรัพย์สินเข้าสู่ระบบ';
    if (desc === 'Asset details updated') return 'อัปเดตข้อมูลทรัพย์สิน';
    if (desc === 'Asset marked as disposed') return 'บันทึกการจำหน่าย/เลิกใช้งานทรัพย์สิน';
    return desc;
};

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

    const asset = await prisma.tbl_assets.findUnique({
        where: { asset_id: parseInt(id) },
        include: {
            tbl_asset_history: {
                orderBy: { action_date: 'desc' }
            }
        }
    });

    if (!asset) {
        return notFound();
    }

    const getImageUrl = (url: string | null) => {
        if (!url) return null;
        try {
            const parsed = JSON.parse(url);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed[0]; // Assume first string is the main url
            }
        } catch (e) {
            // Not a JSON string, fallback to standard handling
        }
        if (url.startsWith('http') || url.startsWith('/uploads/')) return url;
        return `/uploads/${url}`;
    };

    // Depreciation Calculation (Straight Line - หลักสรรพากร / TRD Principle)
    // สรรพากรคิดค่าเสื่อมจาก "ราคาทุน" เป็นฐาน (ไม่ลบมูลค่าซากก่อน) แต่หักจนเหลือมูลค่าซาก (เช่น 1 บาท)
    const cost = Number(asset.purchase_price);
    const salvage = Number(asset.salvage_value);
    const life = asset.useful_life_years;
    const annualDepreciation = cost / life; // ฐานทุนเต็ม
    const purchaseDate = new Date(asset.purchase_date);
    const purchaseYear = purchaseDate.getFullYear();
    const purchaseMonth = purchaseDate.getMonth(); // 0-11

    // Calculate based on exact days
    const msPerDay = 1000 * 60 * 60 * 24;
    const currentYear = new Date().getFullYear();

    const depreciationTable = [];
    let accumulatedDep = 0;
    const totalDepreciable = cost - salvage;

    // The asset fully depreciates exactly 'life' years after purchase
    const endOfLifeDate = new Date(purchaseDate);
    endOfLifeDate.setFullYear(purchaseDate.getFullYear() + life);
    // Subtract 1 day so it doesn't overlap into the next period unnecessarily
    // endOfLifeDate.setDate(endOfLifeDate.getDate() - 1);

    for (let i = 0; i <= life; i++) {
        const year = purchaseYear + i;
        const beginningValue = cost - accumulatedDep;

        let expense = 0;

        // Days in current year
        const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        const daysInThisYear = isLeapYear ? 366 : 365;
        let daysUsed = daysInThisYear;

        if (i === 0) {
            // Year 1: from purchase date to Dec 31
            const endOfYear = new Date(year, 11, 31);
            daysUsed = Math.floor((endOfYear.getTime() - purchaseDate.getTime()) / msPerDay) + 1;
            expense = (annualDepreciation / daysInThisYear) * daysUsed;
        } else if (i === life) {
            // Last year: from Jan 1 to the end of life date
            const startOfYear = new Date(year, 0, 1);
            if (endOfLifeDate.getTime() >= startOfYear.getTime()) {
                daysUsed = Math.floor((endOfLifeDate.getTime() - startOfYear.getTime()) / msPerDay) + 1;
                const remaining = totalDepreciable - accumulatedDep;
                expense = Math.min(remaining, (annualDepreciation / daysInThisYear) * daysUsed);
            } else {
                daysUsed = 0;
                expense = 0;
            }
        } else {
            // Full years in between
            expense = annualDepreciation;
        }

        // Cap depreciation so we don't go below salvage value
        if (accumulatedDep + expense > totalDepreciable) {
            expense = totalDepreciable - accumulatedDep;
        }

        accumulatedDep += expense;
        const endingValue = cost - accumulatedDep;

        if (expense > 0 || i === 0) {
            depreciationTable.push({
                year,
                daysUsed,
                beginningValue,
                expense,
                accumulatedDep,
                endingValue
            });
        }

        if (endingValue <= salvage || accumulatedDep >= totalDepreciable) break;
    }

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <Link href="/assets" className="flex items-center text-gray-500 hover:text-blue-600 transition">
                    <ArrowLeft className="w-4 h-4 mr-1" /> ย้อนกลับ
                </Link>
                <div className="flex gap-2">
                    <AssetActions
                        asset={{
                            asset_id: asset.asset_id,
                            asset_code: asset.asset_code,
                            asset_name: asset.asset_name
                        }}
                        isAdmin={canEditPage}
                        variant="button"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Col: Details & Image */}
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
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${asset.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>{asset.status}</span>
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
                                    <span>วันที่ซื้อ</span>
                                    <span className="font-medium text-gray-900">{new Date(asset.purchase_date).toLocaleDateString('th-TH')}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="font-medium text-gray-900">{Number(asset.purchase_price).toLocaleString()} บ.</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span>Serial Number</span>
                                    <span className="font-medium text-gray-900">{asset.serial_number || '-'}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span>ยี่ห้อ (Brand)</span>
                                    <span className="font-medium text-gray-900">{asset.brand || '-'}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span>รุ่น (Model)</span>
                                    <span className="font-medium text-gray-900">{asset.model || '-'}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span>Vendor</span>
                                    <span className="font-medium text-gray-900">{asset.vendor || '-'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions (Add History) */}
                    {canEditPage && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                            <Activity className="w-4 h-4 mr-2" /> บันทึกประวัติ
                        </h3>
                        <form action={addAssetHistory} className="space-y-3">
                            <input type="hidden" name="asset_id" value={asset.asset_id} />
                            <select name="action_type" className="w-full text-sm border rounded p-2">
                                <option value="Repair">ส่งซ่อม</option>
                                <option value="Maintenance">บำรุงรักษา</option>
                                <option value="Move">ย้ายสถานที่</option>
                                <option value="Dispose">จำหน่าย/เลิกใช้งาน</option>
                            </select>
                            <input type="text" name="description" placeholder="รายละเอียด..." required className="w-full text-sm border rounded p-2" />
                            <input type="number" name="cost" placeholder="ค่าใช้จ่าย (ถ้ามี)" className="w-full text-sm border rounded p-2" />
                            <input
                                type="text"
                                name="new_location"
                                placeholder='New location (required for "Move")'
                                className="w-full text-sm border rounded p-2"
                            />
                            <input
                                type="text"
                                name="transfer_approval_ref"
                                placeholder='Transfer approval ref (required by policy, e.g. REQ-YYYYMMDD-001)'
                                className="w-full text-sm border rounded p-2"
                            />
                            <textarea
                                name="disposal_reason"
                                placeholder="เหตุผลจำหน่าย (จำเป็นเมื่อเลือกจำหน่าย/เลิกใช้งาน)"
                                className="w-full text-sm border rounded p-2"
                            />
                            <input
                                type="text"
                                name="secondary_approver"
                                placeholder="ผู้อนุมัติคนที่ 2 (required when policy enabled)"
                                className="w-full text-sm border rounded p-2"
                            />
                            <button type="submit" className="w-full bg-blue-600 text-white rounded py-2 text-sm font-medium hover:bg-blue-700">
                                บันทึก
                            </button>
                        </form>
                    </div>
                    )}
                </div>

                {/* Right Col: Depreciation & History */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Depreciation Table */}
                    <div id="depreciation-printable" className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-800 flex items-center text-lg mb-3">
                                    <DollarSign className="w-5 h-5 mr-2" /> ตารางค่าเสื่อมราคา (Straight-Line / หลักสรรพากร)
                                </h3>
                                <div className="flex flex-wrap gap-2 text-sm">
                                    <div className="bg-blue-600 text-white px-3 py-1.5 rounded shadow-sm">
                                        <span className="opacity-80 mr-1">ทุน</span>
                                        <span className="font-bold">{cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="bg-blue-600 text-white px-3 py-1.5 rounded shadow-sm">
                                        <span className="opacity-80 mr-1">ซาก</span>
                                        <span className="font-bold">{salvage.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="bg-blue-600 text-white px-3 py-1.5 rounded shadow-sm">
                                        <span className="opacity-80 mr-1">อายุใช้งาน</span>
                                        <span className="font-bold">{life} ปี</span>
                                    </div>
                                    <div className="bg-blue-600 text-white px-3 py-1.5 rounded shadow-sm">
                                        <span className="opacity-80 mr-1">ค่าเสื่อม/ปี</span>
                                        <span className="font-bold">{annualDepreciation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                                    </div>
                                    <div className="bg-blue-700 text-white px-3 py-1.5 rounded shadow-sm flex items-center">
                                        <span className="opacity-80 mr-1">เริ่มคิดจากวันที่ซื้อ:</span>
                                        <span className="font-bold">{purchaseDate.toLocaleDateString('th-TH')}</span>
                                    </div>
                                </div>
                            </div>
                            <PrintButton
                                assetName={asset.asset_name}
                                assetCode={asset.asset_code}
                                cost={cost}
                                salvage={salvage}
                                life={life}
                                printedBy={(session?.user as any)?.name || 'Admin'}
                            />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-center">
                                <thead className="bg-white text-gray-500 border-b">
                                    <tr>
                                        <th className="py-3 px-4">ปี</th>
                                        <th className="py-3 px-4">จำนวนวัน</th>
                                        <th className="py-3 px-4">มูลค่าต้นงวด</th>
                                        <th className="py-3 px-4">ค่าเสื่อม/ปี</th>
                                        <th className="py-3 px-4">ค่าเสื่อมสะสม</th>
                                        <th className="py-3 px-4">มูลค่าสุทธิ (BV)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {depreciationTable.map((row) => (
                                        <tr key={row.year} className={row.year === currentYear ? 'bg-blue-50 font-medium' : ''}>
                                            <td className="py-2 px-4">{row.year + 543}</td>
                                            <td className="py-2 px-4 text-gray-500">
                                                {(row.daysUsed === 365 || row.daysUsed === 366) ? '1 ปี' : row.daysUsed}
                                            </td>
                                            <td className="py-2 px-4">{row.beginningValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td className="py-2 px-4 text-red-600">{row.expense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td className="py-2 px-4 text-gray-500">{row.accumulatedDep.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td className="py-2 px-4 text-blue-600">{row.endingValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* History Timeline */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-4 border-b">
                            <h3 className="font-bold text-gray-800 flex items-center">
                                <Calendar className="w-4 h-4 mr-2" /> ประวัติการใช้งาน/ซ่อมบำรุง
                            </h3>
                        </div>
                        <div className="p-6">
                            {asset.tbl_asset_history.length === 0 ? (
                                <p className="text-center text-gray-400 py-4">ยังไม่มีประวัติ</p>
                            ) : (
                                <div className="relative border-l-2 border-gray-200 ml-3 space-y-6">
                                    {asset.tbl_asset_history.map(h => (
                                        <div key={h.history_id} className="relative pl-8">
                                            <span className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-white ${h.action_type === 'Create' ? 'bg-green-500' :
                                                h.action_type === 'Repair' ? 'bg-orange-500' :
                                                    h.action_type === 'Dispose' ? 'bg-red-500' : 'bg-blue-500'
                                                }`}></span>
                                            <div>
                                                <div className="flex items-center text-sm mb-1">
                                                    <span className="font-bold text-gray-900 mr-2">{translateActionType(h.action_type)}</span>
                                                    <span className="text-gray-500 text-xs">{new Date(h.action_date).toLocaleString('th-TH')}</span>
                                                </div>
                                                <p className="text-sm text-gray-700">{translateDescription(h.description)}</p>
                                                {(h.cost && Number(h.cost) > 0) && (
                                                    <p className="text-sm text-red-600 mt-1">
                                                        ค่าใช้จ่าย: {Number(h.cost).toLocaleString()} บาท
                                                    </p>
                                                )}
                                                <p className="text-xs text-gray-500 mt-1">โดย: {h.performed_by === 'System' ? 'ระบบ' : (h.performed_by || '-')}</p>
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
