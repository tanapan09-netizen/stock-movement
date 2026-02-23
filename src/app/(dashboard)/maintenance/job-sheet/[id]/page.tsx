'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getMaintenanceRequestById } from '@/actions/maintenanceActions';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// Helper to format date
const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export default function JobSheetPage() {
    const params = useParams();
    const [request, setRequest] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params.id) {
            getMaintenanceRequestById(Number(params.id)).then(result => {
                if (result.success) {
                    setRequest(result.data);
                }
                setLoading(false);
            });
        }
    }, [params.id]);

    if (loading) return <div className="p-8 text-center">กำลังโหลด...</div>;
    if (!request) return <div className="p-8 text-center text-red-500">ไม่พบข้อมูลใบงาน</div>;

    return (
        <div className="min-h-screen bg-gray-100 p-8 print:p-0 print:bg-white text-black">
            {/* Toolbar - Hidden when printing */}
            <div className="mb-8 flex justify-between items-center print:hidden max-w-4xl mx-auto">
                <Link href="/maintenance/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                    <ArrowLeft size={20} /> กลับหน้าหลัก
                </Link>
                <button
                    onClick={() => window.print()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm"
                >
                    <Printer size={20} /> พิมพ์ใบงาน
                </button>
            </div>

            {/* A4 Content Area */}
            <div id="job-sheet" className="bg-white shadow-lg print:shadow-none max-w-4xl mx-auto p-10 print:p-4 rounded-xl print:w-full">
                {/* Header */}
                <div className="border-b-2 border-gray-800 pb-4 mb-6 flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        {/* Logo placeholder */}
                        <div className="w-16 h-16 bg-gray-200 flex items-center justify-center rounded text-gray-400">
                            Logo
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">ใบแจ้งซ่อม / Job Sheet</h1>
                            <p className="text-sm text-gray-600">วิทยาลัยการอาชีพนวมินทราชูทิศ</p>
                            <p className="text-sm text-gray-600">ระบบบริหารจัดการงานซ่อมบำรุงและพัสดุ</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-mono font-bold text-blue-600">{request.request_number}</div>
                        <div className="text-sm text-gray-500">วันที่แจ้ง: {formatDate(request.created_at)}</div>
                        <div className="mt-2 inline-block px-3 py-1 border rounded text-sm font-semibold uppercase">
                            {request.priority === 'urgent' ? '🚨 เร่งด่วน' : request.priority === 'high' ? '⚠️ สูง' : 'ปกติ'}
                        </div>
                    </div>
                </div>

                {/* Job Info */}
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
                                {request.room?.room_code} - {request.room?.room_name}
                                {request.room?.building ? ` (อาคาร ${request.room.building})` : ''}
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
                            <span className="text-gray-600">วันที่นัดหมาย:</span>
                            <span className="col-span-2 font-medium">{formatDate(request.scheduled_date)}</span>
                        </div>
                    </div>
                </div>

                {/* Parts Used */}
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
                            {request.parts && request.parts.length > 0 ? (
                                request.parts.map((part: any, index: number) => (
                                    <tr key={index}>
                                        <td className="border border-gray-300 px-3 py-2">
                                            {part.tbl_products?.p_name || part.p_id}
                                        </td>
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

                {/* Operations & Resolution */}
                <div className="mb-8 border border-gray-300 rounded p-4 h-32">
                    <h3 className="font-bold mb-2 text-sm">บันทึกการซ่อม / สาเหตุปัญหา:</h3>
                    {/* Space for handwriting */}
                </div>

                {/* Signatures */}
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

                {/* Footer */}
                <div className="mt-12 pt-4 border-t text-xs text-gray-500 flex justify-between">
                    <span>พิมพ์เมื่อ: {formatDate(new Date())}</span>
                    <span>ระบบบริหารจัดการพัสดุและงานซ่อมบำรุง v1.0</span>
                </div>
            </div>

            {/* CSS for printing to hide dashboard elements */}
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
                    /* Attempts to hide Dashboard Sidebar/Navbar if they are outside Body content flow in a weird way, 
                       though 'body * visibility: hidden' usually catches them. */
                }
            `}</style>
        </div>
    );
}
