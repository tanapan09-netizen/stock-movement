'use client';

import { Wrench, Clock, CheckCircle, XCircle, MapPin, User, Calendar, AlertTriangle, ArrowRight, BellRing, ShieldCheck } from 'lucide-react';
import WorkflowStepper, { WorkflowStatus } from '@/components/common/WorkflowStepper';

interface MaintenanceRequestCardProps {
    request: any;
    onClick: (request: any) => void;
    onResend?: (request: any) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    pending: { label: 'รอดำเนินการ', color: 'text-yellow-600', bg: 'bg-yellow-50', icon: Clock },
    in_progress: { label: 'กำลังซ่อม', color: 'text-blue-600', bg: 'bg-blue-50', icon: Wrench },
    completed: { label: 'เสร็จแล้ว', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
    cancelled: { label: 'ยกเลิก', color: 'text-gray-600', bg: 'bg-gray-50', icon: XCircle }
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    low: { label: 'ต่ำ', color: 'text-gray-500', bg: 'bg-gray-50', icon: AlertTriangle },
    normal: { label: 'ปกติ', color: 'text-blue-500', bg: 'bg-blue-50', icon: AlertTriangle },
    high: { label: 'สูง', color: 'text-orange-500', bg: 'bg-orange-50', icon: AlertTriangle },
    urgent: { label: 'เร่งด่วน', color: 'text-red-500', bg: 'bg-red-50', icon: AlertTriangle }
};

export default function MaintenanceRequestCard({ request, onClick, onResend }: MaintenanceRequestCardProps) {
    const status = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
    const priority = PRIORITY_CONFIG[request.priority] || PRIORITY_CONFIG.normal;
    const StatusIcon = status.icon;

    return (
        <div
            onClick={() => onClick(request)}
            className="group bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-900 transition-all duration-300 cursor-pointer relative overflow-hidden"
        >
            {/* Status Background Glow */}
            <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-10 blur-3xl transition-colors duration-500 ${status.bg}`} />

            <div className="relative z-10">
                {/* Header: ID and Priority */}
                <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase bg-gray-50 dark:bg-slate-700/50 px-2 py-1 rounded-md">
                        #{request.request_number}
                    </span>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${priority.bg} ${priority.color} border border-current/10`}>
                        <priority.icon size={12} />
                        {priority.label}
                    </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
                    {request.title}
                </h3>

                {/* Main Content Info */}
                <div className="space-y-3 mb-5 py-3 border-y border-gray-50 dark:border-slate-700/50">
                    <div className="flex items-center gap-2.5 text-sm">
                        <div className="p-1.5 bg-gray-50 dark:bg-slate-700 rounded-lg text-gray-400">
                            <MapPin size={16} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-gray-900 dark:text-white font-bold leading-none mb-0.5">
                                {request.tbl_rooms?.room_code}
                            </span>
                            <div className="flex flex-wrap gap-1 mb-0.5">
                                {[request.tbl_rooms?.zone, request.tbl_rooms?.building, request.tbl_rooms?.floor].filter(Boolean).map((text, i) => (
                                    <span key={i} className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1 rounded uppercase tracking-tighter">
                                        {text}
                                    </span>
                                ))}
                            </div>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">
                                {request.tbl_rooms?.room_name}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm">
                        <div className="p-1.5 bg-gray-50 dark:bg-slate-700 rounded-lg text-gray-400">
                            <User size={16} />
                        </div>
                        <span className="text-gray-600 dark:text-gray-400">โดย {request.reported_by}</span>
                    </div>
                    {request.status === 'in_progress' && request.assigned_to && (
                        <div className="flex items-center gap-2.5 text-sm animate-in fade-in slide-in-from-left-2 duration-500">
                            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-500">
                                <ShieldCheck size={16} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider leading-none mb-0.5">ช่างผู้ดูแล</span>
                                <span className="text-gray-700 dark:text-gray-300 font-semibold">{request.assigned_to}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Status and Workflow */}
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <div className={`flex items-center gap-1.5 text-xs font-bold ${status.color}`}>
                            <StatusIcon size={14} className="animate-pulse" />
                            {status.label}
                        </div>
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Calendar size={10} />
                            {new Date(request.created_at).toLocaleDateString('th-TH', { 
                                day: 'numeric', 
                                month: 'short', 
                                year: '2-digit' 
                            })}
                        </span>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <div className="w-[110px]">
                            <WorkflowStepper
                                currentStep={request.status === 'completed' ? 3 : request.status === 'in_progress' ? 2 : 1}
                                totalSteps={3}
                                status={request.status === 'pending' ? 'pending' : request.status as WorkflowStatus}
                                size="sm"
                            />
                        </div>
                        {request.status === 'pending' && onResend && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onResend(request);
                                }}
                                className="flex items-center gap-1.5 px-2 py-1 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg text-[10px] font-bold border border-yellow-200 transition-colors"
                            >
                                <BellRing size={12} />
                                แจ้งเตือนซ้ำ
                            </button>
                        )}
                    </div>
                </div>

                {/* Hover Indicator */}
                <div className="absolute bottom-4 right-4 opacity-0 transform translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                    <div className="p-2 bg-blue-600 text-white rounded-full shadow-lg">
                        <ArrowRight size={16} />
                    </div>
                </div>
            </div>
        </div>
    );
}
