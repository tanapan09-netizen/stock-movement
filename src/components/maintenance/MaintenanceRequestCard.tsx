'use client';

import { Wrench, Clock, CheckCircle, XCircle, MapPin, User, Calendar, AlertTriangle, ArrowRight, BellRing, ShieldCheck, AlertCircle, Package } from 'lucide-react';
import WorkflowStepper, { WorkflowStatus } from '@/components/common/WorkflowStepper';
import { getMaintenanceWorkflowStep, MAINTENANCE_WORKFLOW_LABELS } from '@/lib/maintenance-workflow';

// ── AgeBadgeInfo type (ต้อง match กับที่ define ใน MaintenanceClient.tsx) ──
export interface AgeBadgeInfo {
    label: string;
    isOverSLA: boolean;
    isWarning: boolean;
    colorClass: string;
}

interface MaintenanceRequestCardProps {
    request: any;
    onClick: (request: any) => void;
    onResend?: (request: any) => void;
    /** ส่งมาจาก MaintenanceClient — null หมายถึงงานปิดแล้ว ไม่ต้องแสดง */
    ageBadge?: AgeBadgeInfo | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    pending: { label: 'รอเรื่อง', color: 'text-yellow-600', bg: 'bg-yellow-50', icon: Clock },
    approved: { label: 'แจ้งเรื่องต่อ', color: 'text-orange-600', bg: 'bg-orange-50', icon: ArrowRight },
    in_progress: { label: 'ดำเนินการ', color: 'text-blue-600', bg: 'bg-blue-50', icon: Wrench },
    confirmed: { label: 'รอหัวหน้าช่างตรวจรับ', color: 'text-purple-600', bg: 'bg-purple-50', icon: CheckCircle },
    completed: { label: 'ปิดงานแล้ว', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
    cancelled: { label: 'ยกเลิก', color: 'text-gray-600', bg: 'bg-gray-50', icon: XCircle }
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    low: { label: 'ต่ำ', color: 'text-gray-500', bg: 'bg-gray-50', icon: AlertTriangle },
    normal: { label: 'ปกติ', color: 'text-blue-500', bg: 'bg-blue-50', icon: AlertTriangle },
    high: { label: 'สูง', color: 'text-orange-500', bg: 'bg-orange-50', icon: AlertTriangle },
    urgent: { label: 'เร่งด่วน', color: 'text-red-500', bg: 'bg-red-50', icon: AlertTriangle }
};

export default function MaintenanceRequestCard({ request, onClick, onResend, ageBadge }: MaintenanceRequestCardProps) {
    const status = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
    const priority = PRIORITY_CONFIG[request.priority] || PRIORITY_CONFIG.normal;
    const hasPartsStockPosted = Array.isArray(request.tbl_maintenance_history)
        && request.tbl_maintenance_history.some((item: { action?: string }) => item.action === 'PARTS_STOCK_POSTED');

    return (
        <div
            onClick={() => onClick(request)}
            className="group bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700/50 hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-200 dark:hover:border-blue-900/50 transition-all duration-500 cursor-pointer relative overflow-hidden flex flex-col gap-5"
        >
            {/* Header: Priority and ID */}
            <div className="flex justify-between items-start">
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${priority.bg} ${priority.color} border border-current/10 shadow-sm`}>
                    <priority.icon size={12} strokeWidth={3} />
                    {priority.label}
                </div>
                <span className="text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase bg-gray-50 dark:bg-slate-700/50 px-2.5 py-1 rounded-lg border border-gray-100 dark:border-slate-700">
                    {request.request_number}
                </span>
            </div>

            {/* Title & Description */}
            <div className="space-y-1">
                <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight group-hover:text-blue-600 transition-colors duration-300">
                    {request.title}
                </h3>
                {request.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed font-medium">
                        {request.description}
                    </p>
                )}

                {/* ── Age Badge (เพิ่มใหม่) ───────────────────────────────── */}
                {ageBadge && (
                    <div className="flex items-center gap-2 flex-wrap pt-1.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${ageBadge.colorClass}`}>
                            <Clock size={11} />
                            {ageBadge.label}
                        </span>

                        {ageBadge.isOverSLA && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-red-600 animate-pulse">
                                <AlertTriangle size={11} />
                                เกิน SLA
                            </span>
                        )}

                        {ageBadge.isWarning && !ageBadge.isOverSLA && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-orange-500">
                                <AlertCircle size={11} />
                                ใกล้เกิน SLA
                            </span>
                        )}
                    </div>
                )}
                {/* ─────────────────────────────────────────────────────────── */}
            </div>

            {/* Main Info Grid */}
            <div className="grid grid-cols-2 gap-4 py-5 border-y border-gray-50 dark:border-slate-700/50">
                {/* Location side */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 uppercase tracking-tighter font-black text-[9px]">
                        <MapPin size={11} className="text-blue-500" /> สถานที่
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900 dark:text-white leading-none mb-1.5">
                            {request.tbl_rooms?.room_code}
                        </span>
                        <div className="flex flex-wrap gap-1 mb-1.5">
                            {[request.tbl_rooms?.zone, request.tbl_rooms?.building, request.tbl_rooms?.floor].filter(Boolean).map((text, i) => (
                                <span key={i} className="text-[8px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1 rounded uppercase tracking-tighter border border-blue-100 dark:border-blue-800">
                                    {text}
                                </span>
                            ))}
                        </div>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 font-medium italic">
                            {request.tbl_rooms?.room_name}
                        </span>
                    </div>
                </div>

                {/* Reporter side */}
                <div className="space-y-2 border-l border-gray-50 dark:border-slate-700/50 pl-4">
                    <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 uppercase tracking-tighter font-black text-[9px]">
                        <User size={11} className="text-blue-500" /> ผู้แจ้ง / วันที่
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900 dark:text-white leading-none mb-1.5">
                            {request.reported_by}
                        </span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5 font-bold bg-gray-50 dark:bg-slate-700/50 px-2 py-0.5 rounded-full self-start">
                            <Calendar size={10} />
                            {new Date(request.created_at).toLocaleDateString('th-TH', { 
                                day: 'numeric', month: 'short', year: '2-digit' 
                            })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Technician info (if any) */}
            {request.status === 'in_progress' && request.assigned_to && (
                <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-3 flex items-center gap-3 border border-blue-100/50 dark:border-blue-900/20 shadow-inner">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 rotate-3 group-hover:rotate-0 transition-transform duration-500">
                        <ShieldCheck size={18} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] text-blue-500 dark:text-blue-400 font-black uppercase tracking-widest leading-none mb-1">ช่างผู้รับผิดชอบ</span>
                        <span className="text-sm text-gray-900 dark:text-white font-black leading-tight">{request.assigned_to}</span>
                    </div>
                </div>
            )}

            {/* Bottom Section: Stepper & Status */}
            <div className="mt-auto space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className={`flex items-center gap-2.5 text-sm font-black ${status.color}`}>
                            <div className={`w-2.5 h-2.5 rounded-full bg-current ${status.bg} shadow-[0_0_12px_current]`} />
                            {status.label}
                        </div>
                        {hasPartsStockPosted && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                                <Package size={11} />
                                ตัดสต็อกแล้ว
                            </span>
                        )}
                    </div>
                    {request.status === 'pending' && onResend && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onResend(request);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-yellow-50 hover:bg-yellow-500 hover:text-white text-yellow-700 rounded-2xl text-[10px] font-black border border-yellow-200 transition-all duration-500 hover:shadow-lg hover:shadow-yellow-200 dark:hover:shadow-yellow-900/40"
                        >
                            <BellRing size={14} />
                            แจ้งเตือนซ้ำ
                        </button>
                    )}
                </div>

                {/* Workflow Stepper at bottom - Full width */}
                <div className="pt-2">
                    <WorkflowStepper
                        currentStep={getMaintenanceWorkflowStep(request.status)}
                        totalSteps={5}
                        labels={[...MAINTENANCE_WORKFLOW_LABELS]}
                        status={request.status === 'pending' ? 'pending' : request.status as WorkflowStatus}
                        size="sm"
                    />
                </div>
            </div>

            {/* Hover Indicator */}
            <div className="absolute top-1/2 -right-16 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:right-6 transition-all duration-700 ease-out">
                <div className="w-12 h-12 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl shadow-2xl flex items-center justify-center -rotate-12 group-hover:rotate-0 transition-all duration-500 hover:scale-110">
                    <ArrowRight size={24} strokeWidth={3} />
                </div>
            </div>
        </div>
    );
}
