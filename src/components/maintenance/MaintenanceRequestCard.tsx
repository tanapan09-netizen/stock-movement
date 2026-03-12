'use client';

import { Wrench, Clock, CheckCircle, XCircle, MapPin, User, Calendar, AlertTriangle } from 'lucide-react';
import WorkflowStepper, { WorkflowStatus } from '@/components/common/WorkflowStepper';

interface MaintenanceRequestCardProps {
    request: any; // Using any for now to avoid duplicative typing, ideally import from types
    onClick: (request: any) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    pending: { label: 'รอดำเนินการ', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    in_progress: { label: 'กำลังซ่อม', color: 'bg-blue-100 text-blue-800', icon: Wrench },
    completed: { label: 'เสร็จแล้ว', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    cancelled: { label: 'ยกเลิก', color: 'bg-gray-100 text-gray-800', icon: XCircle }
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    low: { label: 'ต่ำ', color: 'bg-gray-100 text-gray-600', icon: AlertTriangle },
    normal: { label: 'ปกติ', color: 'bg-blue-100 text-blue-600', icon: AlertTriangle },
    high: { label: 'สูง', color: 'bg-orange-100 text-orange-600', icon: AlertTriangle },
    urgent: { label: 'เร่งด่วน', color: 'bg-red-100 text-red-600', icon: AlertTriangle }
};

export default function MaintenanceRequestCard({ request, onClick }: MaintenanceRequestCardProps) {
    const status = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
    const priority = PRIORITY_CONFIG[request.priority] || PRIORITY_CONFIG.normal;
    const StatusIcon = status.icon;

    return (
        <div
            onClick={() => onClick(request)}
            className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-shadow cursor-pointer relative"
        >
            {/* Header: ID and Status */}
            <div className="flex justify-between items-start mb-3">
                <div>
                    <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {request.request_number}
                    </span>
                    <h3 className="font-semibold text-gray-900 dark:text-white mt-1 line-clamp-1">
                        {request.title}
                    </h3>
                </div>
                <div className="w-[100px]">
                    <WorkflowStepper
                        currentStep={request.status === 'completed' ? 3 : request.status === 'in_progress' ? 2 : 1}
                        totalSteps={3}
                        status={request.status === 'pending' ? 'pending' : request.status as WorkflowStatus}
                        size="sm"
                    />
                </div>
            </div>

            {/* Details: Location & Date */}
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-gray-400" />
                    <span>{request.tbl_rooms?.room_code} - {request.tbl_rooms?.room_name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <User size={14} className="text-gray-400" />
                    <span>แจ้งโดย: {request.reported_by}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    <span>{new Date(request.created_at).toLocaleDateString('th-TH')}</span>
                </div>
            </div>

            {/* Footer: Priority & Assigned */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-700">
                <div className={`flex items-center gap-1 text-xs font-medium ${priority.color.replace('bg-', 'text-').replace('100', '600')}`}>
                    <priority.icon size={12} />
                    {priority.label}
                </div>

                {request.assigned_to ? (
                    <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                        <Wrench size={12} />
                        {request.assigned_to}
                    </div>
                ) : (
                    <span className="text-xs text-gray-400 italic">ยังไม่ระบุช่าง</span>
                )}
            </div>
        </div>
    );
}
