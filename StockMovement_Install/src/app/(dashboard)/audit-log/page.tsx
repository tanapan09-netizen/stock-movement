import { getAuditLogs, AuditAction, AuditEntity } from '@/actions/auditActions';
import { User, Package, FileText, ArrowDownCircle, ArrowUpCircle, Trash2, Edit, Plus, LogIn, LogOut, Check, X } from 'lucide-react';

export default async function AuditLogPage() {
    const { logs, total } = await getAuditLogs();

    const getActionIcon = (action: AuditAction | string) => {
        switch (action.toLowerCase()) {
            case 'create': return <Plus className="w-4 h-4 text-green-500" />;
            case 'update': return <Edit className="w-4 h-4 text-blue-500" />;
            case 'delete': return <Trash2 className="w-4 h-4 text-red-500" />;
            case 'stock_in': return <ArrowDownCircle className="w-4 h-4 text-green-500" />;
            case 'stock_out': return <ArrowUpCircle className="w-4 h-4 text-orange-500" />;
            case 'login': return <LogIn className="w-4 h-4 text-blue-500" />;
            case 'logout': return <LogOut className="w-4 h-4 text-gray-500" />;
            case 'approve': return <Check className="w-4 h-4 text-green-500" />;
            case 'reject': return <X className="w-4 h-4 text-red-500" />;
            case 'withdraw': return <ArrowUpCircle className="w-4 h-4 text-orange-500" />;
            case 'use': return <Check className="w-4 h-4 text-blue-500" />;
            case 'complete': return <Check className="w-4 h-4 text-green-500" />;
            default: return <FileText className="w-4 h-4 text-gray-500" />;
        }
    };

    const getActionLabel = (action: AuditAction | string) => {
        const key = action.toLowerCase();
        const labels: Record<string, string> = {
            create: 'สร้าง',
            update: 'แก้ไข',
            delete: 'ลบ',
            login: 'เข้าสู่ระบบ',
            logout: 'ออกจากระบบ',
            stock_in: 'รับเข้า',
            stock_out: 'เบิกออก',
            borrow: 'ยืม',
            return: 'คืน',
            approve: 'อนุมัติ',
            reject: 'ปฏิเสธ',
            withdraw: 'เบิกใช้งาน',
            use: 'ใช้งานจริง',
            complete: 'เสร็จสิ้น'
        };
        return labels[key] || action;
    };

    const getEntityLabel = (entity: AuditEntity | string) => {
        const key = entity.toLowerCase();
        const labels: Record<string, string> = {
            product: 'สินค้า',
            asset: 'ทรัพย์สิน',
            user: 'ผู้ใช้',
            role: 'บทบาท',
            purchase_order: 'ใบสั่งซื้อ',
            borrow_request: 'การยืม',
            movement: 'เคลื่อนไหว',
            category: 'หมวดหมู่',
            supplier: 'ผู้ขาย',
            warehouse: 'คลังสินค้า',
            room: 'ห้อง',
            maintenancerequest: 'แจ้งซ่อม',
            maintenancepart: 'อะไหล่ซ่อม'
        };
        return labels[key] || entity;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">📋 บันทึกการใช้งาน (Audit Log)</h1>
                    <p className="text-gray-500">ประวัติการดำเนินการในระบบทั้งหมด</p>
                </div>
                <div className="text-sm text-gray-500">
                    รวม {total} รายการ
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">เวลา</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">ผู้ใช้</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">การดำเนินการ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">ประเภท</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">รายการ</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">รายละเอียด</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {logs.map(log => (
                            <tr key={log.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-500">
                                    {new Date(log.timestamp).toLocaleString('th-TH')}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm font-medium">{log.username}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        {getActionIcon(log.action)}
                                        <span className="text-sm">{getActionLabel(log.action)}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-sm px-2 py-1 bg-gray-100 rounded">
                                        {getEntityLabel(log.entity)}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    {log.entityName || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">
                                    {log.details ? (
                                        <span className="text-xs">
                                            {Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(', ')}
                                        </span>
                                    ) : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
