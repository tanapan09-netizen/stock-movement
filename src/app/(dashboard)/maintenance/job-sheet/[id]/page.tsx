'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getMaintenanceRequestById, updateMaintenanceRequest } from '@/actions/maintenanceActions';
import { getSystemSettings } from '@/actions/settingActions';
import { Printer, ArrowLeft, Wrench } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

interface SessionUser {
    role?: string;
    username?: string;
    name?: string;
}

interface MaintenancePart {
    p_id: string;
    quantity: number;
    unit: string | null;
    status: string;
    tbl_products?: {
        p_name?: string | null;
    } | null;
}

interface JobSheetRequest {
    request_id: number;
    request_number: string;
    created_at: Date | string;
    priority: string;
    status: string;
    title: string;
    description: string | null;
    reported_by: string;
    assigned_to: string | null;
    scheduled_date: Date | string | null;
    notes: string | null;
    tbl_rooms?: {
        room_code?: string | null;
        room_name?: string | null;
        building?: string | null;
    } | null;
    tbl_maintenance_parts?: MaintenancePart[] | null;
}

const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export default function JobSheetPage() {
    const params = useParams();
    const { data: session } = useSession();
    const sessionUser = (session?.user || {}) as SessionUser;

    const [request, setRequest] = useState<JobSheetRequest | null>(null);
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);

    useEffect(() => {
        if (!params.id) return;

        Promise.all([
            getMaintenanceRequestById(Number(params.id)),
            getSystemSettings(),
        ]).then(([requestResult, settingsResult]) => {
            if (requestResult.success) {
                setRequest((requestResult.data ?? null) as JobSheetRequest | null);
            }
            if (settingsResult.success && settingsResult.data) {
                setSettings(settingsResult.data);
            }
            setLoading(false);
        });
    }, [params.id]);

    const currentRole = (sessionUser.role || '').toLowerCase();
    const canAcceptJob = currentRole === 'technician' && request?.status === 'pending';

    const handleAcceptJob = async () => {
        if (!canAcceptJob || !request?.request_id) return;

        const assignedName =
            (sessionUser.name || sessionUser.username || 'technician').toString();

        setAccepting(true);
        try {
            const result = await updateMaintenanceRequest(
                request.request_id,
                {
                    status: 'in_progress',
                    assigned_to: assignedName,
                    scheduled_date: new Date().toISOString().split('T')[0],
                    notes: request?.notes || 'Technician accepted this job from job-sheet page',
                    edit_reason: 'ช่างรับงานจากหน้า job sheet',
                },
                assignedName
            );

            if (!result.success) {
                window.alert(result.error || 'Unable to accept this job');
                return;
            }

            setRequest((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    status: 'in_progress',
                    assigned_to: assignedName,
                };
            });
        } catch (error) {
            console.error(error);
            window.alert('Unable to accept this job');
        } finally {
            setAccepting(false);
        }
    };

    if (loading) return <div className="p-8 text-center">กำลังโหลด...</div>;
    if (!request) return <div className="p-8 text-center text-red-500">ไม่พบข้อมูลใบงาน</div>;

    return (
        <div className="min-h-screen bg-gray-100 p-8 print:p-0 print:bg-white text-black">
            <div className="mb-8 flex justify-between items-center print:hidden max-w-4xl mx-auto">
                <Link href="/maintenance/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                    <ArrowLeft size={20} /> กลับหน้าหลัก
                </Link>

                <div className="flex items-center gap-2">
                    {canAcceptJob && (
                        <button
                            onClick={handleAcceptJob}
                            disabled={accepting}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 shadow-sm disabled:opacity-60"
                        >
                            <Wrench size={18} /> {accepting ? 'Accepting...' : 'รับงาน'}
                        </button>
                    )}

                    <button
                        onClick={() => window.print()}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm"
                    >
                        <Printer size={20} /> พิมพ์ใบงาน
                    </button>
                </div>
            </div>

            <div id="job-sheet" className="bg-white shadow-lg print:shadow-none max-w-4xl mx-auto p-10 print:p-4 rounded-xl print:w-full">
                <div className="border-b-2 border-gray-800 pb-4 mb-6 flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-200 flex items-center justify-center rounded text-gray-400">
                            Logo
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">ใบแจ้งซ่อม / Job Sheet</h1>
                            <p className="text-sm text-gray-800 font-semibold">{settings.company_name || 'ชื่อบริษัท/หน่วยงาน'}</p>
                            <p className="text-sm text-gray-600">{settings.company_address || 'ที่อยู่บริษัท/หน่วยงาน'}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-mono font-bold text-blue-600">{request.request_number}</div>
                        <div className="text-sm text-gray-500">วันที่แจ้ง: {formatDate(request.created_at)}</div>
                        <div className="mt-2 inline-block px-3 py-1 border rounded text-sm font-semibold uppercase">
                            {request.priority === 'urgent' ? 'เร่งด่วนมาก' : request.priority === 'high' ? 'สูง' : 'ปกติ'}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="space-y-2">
                        <h3 className="font-bold border-b pb-1 mb-2">ข้อมูลงานซ่อม</h3>
                        <div className="grid grid-cols-3">
                            <span className="text-gray-600">หัวข้อ:</span>
                            <span className="col-span-2 font-medium">{request.title}</span>
                        </div>
                        <div className="grid grid-cols-3">
                            <span className="text-gray-600">สถานที่:</span>
                            <span className="col-span-2 font-medium">
                                {request.tbl_rooms?.room_code} - {request.tbl_rooms?.room_name}
                                {request.tbl_rooms?.building ? ` (อาคาร ${request.tbl_rooms.building})` : ''}
                            </span>
                        </div>
                        <div className="grid grid-cols-3">
                            <span className="text-gray-600">รายละเอียด:</span>
                            <span className="col-span-2 text-sm text-gray-700 whitespace-pre-wrap">{request.description || '-'}</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-bold border-b pb-1 mb-2">ข้อมูลผู้แจ้ง</h3>
                        <div className="grid grid-cols-3">
                            <span className="text-gray-600">ผู้แจ้ง:</span>
                            <span className="col-span-2 font-medium">{request.reported_by}</span>
                        </div>
                        <div className="grid grid-cols-3">
                            <span className="text-gray-600">ผู้รับผิดชอบ:</span>
                            <span className="col-span-2 font-medium">{request.assigned_to || '-'}</span>
                        </div>
                        <div className="grid grid-cols-3">
                            <span className="text-gray-600">วันนัดหมาย:</span>
                            <span className="col-span-2 font-medium">{formatDate(request.scheduled_date)}</span>
                        </div>
                    </div>
                </div>

                <div className="mb-8">
                    <h3 className="font-bold border-b pb-1 mb-2">รายการอะไหล่ที่ใช้ (Parts Used)</h3>
                    <table className="w-full text-sm border-collapse border border-gray-300">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="border border-gray-300 px-3 py-2 text-left">รายการอะไหล่</th>
                                <th className="border border-gray-300 px-3 py-2 text-center w-20">จำนวน</th>
                                <th className="border border-gray-300 px-3 py-2 text-center w-20">หน่วย</th>
                                <th className="border border-gray-300 px-3 py-2 text-center w-32">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {request.tbl_maintenance_parts && request.tbl_maintenance_parts.length > 0 ? (
                                request.tbl_maintenance_parts.map((part, index: number) => (
                                    <tr key={index}>
                                        <td className="border border-gray-300 px-3 py-2">{part.tbl_products?.p_name || part.p_id}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-center">{part.quantity}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-center">{part.unit || '-'}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-center">
                                            {part.status === 'used' ? 'ใช้แล้ว' : part.status === 'returned' ? 'คืนแล้ว' : 'เบิกแล้ว'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="border border-gray-300 px-3 py-4 text-center text-gray-500">
                                        - ไม่มีการใช้อะไหล่ -
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mb-8 border border-gray-300 rounded p-4 h-32">
                    <h3 className="font-bold mb-2 text-sm">บันทึกการซ่อม / สาเหตุปัญหา:</h3>
                </div>

                <div className="grid grid-cols-3 gap-8 mt-12">
                    <div className="text-center">
                        <div className="border-b border-gray-400 h-8 mb-2"></div>
                        <p className="font-medium">ลงชื่อผู้แจ้ง</p>
                        <p className="text-xs text-gray-500">วันที่ ........../........../..........</p>
                    </div>
                    <div className="text-center">
                        <div className="border-b border-gray-400 h-8 mb-2"></div>
                        <p className="font-medium">ลงชื่อช่างผู้ปฏิบัติงาน</p>
                        <p className="text-xs text-gray-500">วันที่ ........../........../..........</p>
                    </div>
                    <div className="text-center">
                        <div className="border-b border-gray-400 h-8 mb-2"></div>
                        <p className="font-medium">ลงชื่อผู้ตรวจสอบ</p>
                        <p className="text-xs text-gray-500">วันที่ ........../........../..........</p>
                    </div>
                </div>

                <div className="mt-12 pt-4 border-t text-xs text-gray-500 flex justify-between">
                    <span>พิมพ์เมื่อ: {formatDate(new Date())}</span>
                    <span>ระบบบริหารจัดการพัสดุและงานซ่อมบำรุง v1.0</span>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page { margin: 0; }
                    body * {
                        visibility: hidden;
                    }
                    #job-sheet, #job-sheet * {
                        visibility: visible;
                    }
                    #job-sheet {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 20px;
                        box-shadow: none;
                        border-radius: 0;
                    }
                }
            `}</style>
        </div>
    );
}
