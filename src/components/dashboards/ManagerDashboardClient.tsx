'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  ExternalLink,
  FileCheck2,
  FileText,
  Loader2,
  ReceiptText,
  ShoppingCart,
  Tag,
  UserRound,
  Wrench,
  X,
  Zap,
} from 'lucide-react';

import { updateApprovalStatus } from '@/actions/approvalActions';
import { approvePettyCash, rejectPettyCash } from '@/actions/pettyCashActions';
import { useToast } from '@/components/ToastProvider';
import type { KpiGrain, KpiMetric } from '@/lib/kpi/client';
import { useKpiSummary, useKpiTrend } from '@/lib/kpi/hooks';

const formatDateTime = (value?: Date | string | null) => {
  if (!value) return '-';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
};

const formatShortDate = (value?: Date | string | null) => {
  if (!value) return '-';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('th-TH', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
};

const formatCurrency = (value?: number | null) =>
  value != null
    ? new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        maximumFractionDigits: 2,
      }).format(value)
    : '-';

const KPI_METRIC_OPTIONS: Array<{ key: KpiMetric; label: string }> = [
  { key: 'approval_sla', label: 'Approval SLA' },
  { key: 'register_lead', label: 'Register Lead' },
  { key: 'utilization', label: 'Utilization' },
  { key: 'maintenance_sla', label: 'Maintenance SLA' },
  { key: 'inventory_accuracy', label: 'Inventory Accuracy' },
  { key: 'disposal_cycle', label: 'Disposal Cycle' },
];

const KPI_GRAIN_OPTIONS: Array<{ key: KpiGrain; label: string }> = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];

const KPI_SUMMARY_CARDS: Array<{ key: KpiMetric; label: string; suffix: string }> = [
  { key: 'approval_sla', label: 'Approval SLA', suffix: '%' },
  { key: 'register_lead', label: 'Register Lead', suffix: 'days' },
  { key: 'utilization', label: 'Utilization', suffix: '%' },
  { key: 'maintenance_sla', label: 'Maintenance SLA', suffix: '%' },
  { key: 'inventory_accuracy', label: 'Inventory Accuracy', suffix: '%' },
  { key: 'disposal_cycle', label: 'Disposal Cycle', suffix: 'days' },
];

const toIsoDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getKpiSummaryValue = (
  metric: KpiMetric,
  data?: {
    approval_sla_pct: number;
    register_lead_days: number;
    utilization_pct: number;
    maintenance_sla_pct: number;
    inventory_accuracy_pct: number;
    disposal_cycle_days: number;
  } | null,
) => {
  if (!data) return 0;
  switch (metric) {
    case 'approval_sla':
      return data.approval_sla_pct;
    case 'register_lead':
      return data.register_lead_days;
    case 'utilization':
      return data.utilization_pct;
    case 'maintenance_sla':
      return data.maintenance_sla_pct;
    case 'inventory_accuracy':
      return data.inventory_accuracy_pct;
    case 'disposal_cycle':
      return data.disposal_cycle_days;
    default:
      return 0;
  }
};

function KpiMiniBars({ points }: { points: Array<{ period: string; value: number }> }) {
  const maxValue = Math.max(...points.map(point => point.value), 1);
  return (
    <div className="overflow-x-auto">
      <div className="flex h-36 min-w-[480px] items-end gap-2">
        {points.map(point => {
          const ratio = maxValue > 0 ? point.value / maxValue : 0;
          const height = Math.max(ratio * 100, 4);
          return (
            <div key={point.period} className="flex min-w-[30px] flex-1 flex-col items-center gap-1.5">
              <div className="flex h-28 w-full items-end rounded-md bg-slate-100 px-1 py-1">
                <div
                  className="w-full rounded-sm bg-gradient-to-t from-indigo-600 to-blue-400"
                  style={{ height: `${height}%` }}
                  title={`${point.period}: ${point.value.toFixed(2)}`}
                />
              </div>
              <span className="whitespace-nowrap text-[10px] font-semibold text-slate-500">{point.period}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const getSteps = (status?: string | null) => {
  const normalized = (status || '').toLowerCase();

  const currentStep = normalized.includes('approved')
    ? 2
    : normalized.includes('pending') || normalized.includes('waiting')
      ? 1
      : 0;

  return [
    { key: 'created', label: 'สร้างคำขอ', done: currentStep >= 0 },
    { key: 'pending', label: 'รออนุมัติ', done: currentStep >= 1 },
    { key: 'approved', label: 'อนุมัติแล้ว', done: currentStep >= 2 },
  ];
};

type DecisionQueueType = 'general' | 'purchase' | 'petty';
type ModuleKey = 'maintenance' | 'general' | 'purchase' | 'petty' | 'parts';

type DecisionQueueItem = {
  id: string;
  originalId: number;
  type: DecisionQueueType;
  module: string;
  number?: string | null;
  title?: string | null;
  requester?: string | null;
  owner?: string | null;
  status?: string | null;
  amount?: number | null;
  href: string;
  createdAt?: Date | string | null;
  description?: string | null;
  department?: string | null;
  attachments?: { name: string; url: string }[] | null;
  history?: { action: string; by: string; at: Date | string; note?: string }[] | null;
};

type WorkMonitorItem = {
  id: string;
  module: string;
  number?: string | null;
  title?: string | null;
  owner?: string | null;
  status?: string | null;
  approval?: string | null;
  updatedAt?: Date | string | null;
  href: string;
};

export interface DashboardDataProps {
  pendingGeneralApprovals: number;
  pendingPurchaseApprovals: number;
  pendingPettyCash: number;
  pendingPartRequests: number;
  activeMaintenance: number;
  unassignedMaintenance: number;
  decisionQueue: DecisionQueueItem[];
  workMonitor: WorkMonitorItem[];
}

const TYPE_CONFIG: Record<
  DecisionQueueType,
  {
    label: string;
    dot: string;
    chip: string;
    bar: string;
    drawerBg: string;
    drawerBadge: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
  }
> = {
  general: {
    label: 'ทั่วไป',
    dot: 'bg-indigo-500',
    chip: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
    bar: 'bg-indigo-500',
    drawerBg: 'from-indigo-50 to-white',
    drawerBadge: 'bg-indigo-100 text-indigo-700',
    badgeBg: 'bg-indigo-50',
    badgeBorder: 'border-indigo-200',
    badgeText: 'text-indigo-700',
  },
  purchase: {
    label: 'จัดซื้อ',
    dot: 'bg-indigo-400',
    chip: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
    bar: 'bg-indigo-400',
    drawerBg: 'from-indigo-50 to-white',
    drawerBadge: 'bg-indigo-100 text-indigo-700',
    badgeBg: 'bg-indigo-50',
    badgeBorder: 'border-indigo-200',
    badgeText: 'text-indigo-700',
  },
  petty: {
    label: 'Petty Cash',
    dot: 'bg-indigo-300',
    chip: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
    bar: 'bg-indigo-300',
    drawerBg: 'from-indigo-50 to-white',
    drawerBadge: 'bg-indigo-100 text-indigo-700',
    badgeBg: 'bg-indigo-50',
    badgeBorder: 'border-indigo-200',
    badgeText: 'text-indigo-700',
  },
};

const MODULE_CONFIG: Record<
  ModuleKey,
  {
    title: string;
    subtitle: string;
    href: string;
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    border: string;
    emptyText: string;
    showActions: boolean;
  }
> = {
  maintenance: {
    title: 'งานซ่อมค้างอยู่',
    subtitle: 'รายการงานซ่อมที่ยังไม่เสร็จสิ้น',
    href: '/maintenance',
    icon: Wrench,
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    border: 'border-indigo-100',
    emptyText: 'ไม่มีงานซ่อมค้างอยู่',
    showActions: false,
  },
  general: {
    title: 'อนุมัติทั่วไป',
    subtitle: 'OT · ลา · เบิกค่าใช้จ่าย',
    href: '/approvals/manage',
    icon: FileCheck2,
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    border: 'border-indigo-100',
    emptyText: 'ไม่มีรายการรออนุมัติ',
    showActions: true,
  },
  purchase: {
    title: 'คำขอซื้อ',
    subtitle: 'รอการจัดซื้อ',
    href: '/purchase-request/manage',
    icon: ShoppingCart,
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    border: 'border-indigo-100',
    emptyText: 'ไม่มีคำขอซื้อรอดำเนินการ',
    showActions: true,
  },
  petty: {
    title: 'เงินสดย่อย',
    subtitle: 'รออนุมัติผู้จัดการ',
    href: '/petty-cash',
    icon: ReceiptText,
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    border: 'border-indigo-100',
    emptyText: 'ไม่มีรายการเงินสดย่อย',
    showActions: true,
  },
  parts: {
    title: 'เบิกอะไหล่',
    subtitle: 'เช็กสถานะสายอนุมัติ',
    href: '/maintenance/part-requests',
    icon: ClipboardCheck,
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    border: 'border-indigo-100',
    emptyText: 'ไม่มีรายการเบิกอะไหล่',
    showActions: false,
  },
};

function AnimatePresence({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function ProgressSteps({ status }: { status?: string | null }) {
  const steps = getSteps(status);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {steps.map((step, index) => (
        <React.Fragment key={step.key}>
          <div className="inline-flex items-center gap-1.5">
            <span
              className={[
                'h-2.5 w-2.5 rounded-full transition-colors',
                step.done ? 'bg-indigo-500' : 'bg-slate-300',
              ].join(' ')}
            />
            <span
              className={[
                'text-[10px] font-medium',
                step.done ? 'text-indigo-700' : 'text-slate-400',
              ].join(' ')}
            >
              {step.label}
            </span>
          </div>

          {index < steps.length - 1 && <span className="h-px w-5 bg-slate-300" />}
        </React.Fragment>
      ))}
    </div>
  );
}

function HeroStatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black leading-none tabular-nums text-slate-900">{value}</p>
      <p className="mt-2 text-[11px] text-slate-500">{sub}</p>
    </div>
  );
}

function HeroMixBar({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const width = Math.max((value / Math.max(total, 1)) * 100, value > 0 ? 12 : 4);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className="font-bold tabular-nums text-slate-900">{value}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function ModuleListItem({
  item,
  showActions,
  processing,
  onOpenDetail,
  onApprove,
  onReject,
}: {
  item: DecisionQueueItem;
  showActions: boolean;
  processing: boolean;
  onOpenDetail: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const typeCfg = TYPE_CONFIG[item.type];

  return (
    <div
      className={[
        'overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition-all',
        processing ? 'pointer-events-none opacity-50' : 'hover:bg-white hover:shadow-sm',
      ].join(' ')}
    >
      <div className={`h-0.5 w-full ${typeCfg.bar}`} />

      <div className="p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={[
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold',
                typeCfg.badgeBg,
                typeCfg.badgeBorder,
                typeCfg.badgeText,
              ].join(' ')}
            >
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${typeCfg.dot}`} />
              {typeCfg.label}
            </span>
            {item.number && <span className="font-mono text-[10px] text-slate-400">{item.number}</span>}
          </div>
          {item.amount != null && (
            <span className="text-[11px] font-bold text-slate-700">{formatCurrency(item.amount)}</span>
          )}
        </div>

        <p className="min-h-[40px] line-clamp-2 text-sm font-medium text-slate-800">
          {item.title || 'ไม่ระบุรายละเอียด'}
        </p>

        <ProgressSteps status={item.status} />

        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400">
          {item.requester && (
            <span className="flex items-center gap-1">
              <UserRound size={10} />
              {item.requester}
            </span>
          )}
          {item.createdAt && (
            <span className="flex items-center gap-1">
              <CalendarDays size={10} />
              {formatShortDate(item.createdAt)}
            </span>
          )}
          {item.owner && (
            <span className="flex items-center gap-1">
              <Tag size={10} />
              {item.owner}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-slate-200 pt-3">
          <button
            onClick={onOpenDetail}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
          >
            <FileText size={11} />
            ดูรายละเอียด
          </button>

          {showActions && (
            <>
              <button
                onClick={onReject}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              >
                <X size={10} />
                ปฏิเสธ
              </button>
              <button
                onClick={onApprove}
                className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
              >
                {processing ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                อนุมัติ
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ModuleDrawer({
  moduleKey,
  items,
  processingId,
  onClose,
  onApprove,
  onReject,
  onOpenDetail,
}: {
  moduleKey: ModuleKey;
  items: DecisionQueueItem[];
  processingId: string | null;
  onClose: () => void;
  onApprove: (item: DecisionQueueItem) => void;
  onReject: (item: DecisionQueueItem) => void;
  onOpenDetail: (item: DecisionQueueItem) => void;
}) {
  const cfg = MODULE_CONFIG[moduleKey];
  const Icon = cfg.icon;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative ml-auto flex h-full w-full max-w-[480px] flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${cfg.iconBg} ${cfg.border}`}>
                <Icon className={`h-4 w-4 ${cfg.iconColor}`} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{cfg.title}</p>
                <p className="text-[11px] text-slate-400">{cfg.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700">
                  {items.length} รายการ
                </span>
              )}
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <a
            href={cfg.href}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800"
          >
            เปิดหน้าจัดการทั้งหมด <ExternalLink size={10} />
          </a>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 px-6 py-16 text-center">
              <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${cfg.iconBg}`}>
                <CheckCircle2 className={`h-5 w-5 ${cfg.iconColor}`} />
              </div>
              <p className="text-sm font-semibold text-slate-700">{cfg.emptyText}</p>
              <p className="mt-1 text-xs text-slate-400">รายการทั้งหมดถูกจัดการเรียบร้อยแล้ว</p>
            </div>
          ) : (
            items.map(item => (
              <ModuleListItem
                key={item.id}
                item={item}
                showActions={cfg.showActions}
                processing={processingId === item.id}
                onOpenDetail={() => onOpenDetail(item)}
                onApprove={() => onApprove(item)}
                onReject={() => onReject(item)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function DetailDrawer({
  item,
  processing,
  onClose,
  onApprove,
  onReject,
}: {
  item: DecisionQueueItem;
  processing: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
}) {
  const [tab, setTab] = useState<'detail' | 'history'>('detail');
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [note, setNote] = useState('');

  const rawTitle = item.title?.trim() || 'ไม่ระบุรายละเอียด';

  const cleanTitle = rawTitle
    .split(/หมายเหตุ:|ลิงก์สินค้า:|รวมเงิน:|ภาษี/i)[0]
    .replace(/\s+/g, ' ')
    .trim();

  const headerSummarySource = item.description?.trim() || rawTitle;
  const headerSummary = headerSummarySource
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);

  const detailSource = item.description || rawTitle || '';
  const sanitizedDetailSource = detailSource.replace(/https?:\/\/[^\s]+/g, '').trim();

  const urlMatch = detailSource.match(/https?:\/\/[^\s]+/);
  const productUrl = urlMatch ? urlMatch[0] : null;

  const shortUrl = productUrl
    ? productUrl.replace(/^https?:\/\//, '').slice(0, 36) + (productUrl.length > 36 ? '...' : '')
    : null;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/30 px-4 py-6 backdrop-blur-[2px]">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
        <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-6 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                  {item.module || 'รายการอนุมัติ'}
                </span>

                {item.number && (
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-mono text-xs text-slate-500">
                    {item.number}
                  </span>
                )}
              </div>

              <h2 className="max-w-2xl text-xl font-black leading-tight text-slate-900 sm:text-[22px]">
                {cleanTitle}
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                {headerSummary.length > 220 ? `${headerSummary}...` : headerSummary}
              </p>

              <div className="mt-4 flex flex-wrap gap-2.5 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600">
                  <UserRound size={12} className="text-slate-400" />
                  {item.requester || '-'}
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600">
                  <CalendarDays size={12} className="text-slate-400" />
                  {formatShortDate(item.createdAt)}
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600">
                  <Tag size={12} className="text-slate-400" />
                  {item.owner || '-'}
                </span>

                {item.amount != null && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 font-bold text-slate-700">
                    <Banknote size={12} />
                    {formatCurrency(item.amount)}
                  </span>
                )}
              </div>

              <ProgressSteps status={item.status} />
            </div>

            <button
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
              aria-label="ปิดหน้าต่าง"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center border-b border-slate-100 px-6 sm:px-7">
          <div className="flex items-center gap-5">
            {(['detail', 'history'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={[
                  'border-b-2 px-1 py-3.5 text-sm font-bold transition-colors',
                  tab === t
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-400 hover:text-slate-600',
                ].join(' ')}
              >
                {t === 'detail' ? 'รายละเอียด' : 'ประวัติ'}
              </button>
            ))}
          </div>

          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 transition hover:text-slate-700"
          >
            เปิดหน้าเต็ม <ArrowUpRight size={14} />
          </a>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-7">
          {tab === 'detail' ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                  รายละเอียดคำขอ
                </p>

                {productUrl && (
                  <a
                    href={productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-4 flex w-full items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <ExternalLink size={14} />
                      <span>เปิดดูสินค้า</span>
                    </div>

                    <span className="max-w-[180px] truncate text-xs text-indigo-500">
                      {shortUrl}
                    </span>
                  </a>
                )}

                <div className="whitespace-pre-wrap break-words text-[15px] leading-7 text-slate-700">
                  {sanitizedDetailSource || 'ไม่มีรายละเอียดเพิ่มเติม'}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="mb-1 text-xs font-semibold text-slate-400">สถานะ</p>
                  <p className="text-base font-bold text-slate-800">{item.status || 'pending'}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="mb-1 text-xs font-semibold text-slate-400">โมดูล</p>
                  <p className="text-base font-bold text-slate-800">{item.module || '-'}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="mb-1 text-xs font-semibold text-slate-400">ผู้ขอ</p>
                  <p className="text-base font-bold text-slate-800">{item.requester || '-'}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="mb-1 text-xs font-semibold text-slate-400">ผู้รับผิดชอบ</p>
                  <p className="text-base font-bold text-slate-800">{item.owner || '-'}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="mb-1 text-xs font-semibold text-slate-400">วันที่สร้าง</p>
                  <p className="text-base font-bold text-slate-800">{formatDateTime(item.createdAt)}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="mb-1 text-xs font-semibold text-slate-400">จำนวนเงิน</p>
                  <p className="text-base font-bold text-slate-700">
                    {item.amount != null ? formatCurrency(item.amount) : '-'}
                  </p>
                </div>
              </div>

              {item.attachments && item.attachments.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                    เอกสารแนบ
                  </p>

                  <div className="space-y-2">
                    {item.attachments.map(att => (
                      <a
                        key={att.name}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 transition hover:bg-slate-100"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white">
                          <FileText size={15} className="text-slate-500" />
                        </div>
                        <span className="truncate text-sm font-medium text-slate-700">{att.name}</span>
                        <ArrowUpRight size={14} className="ml-auto shrink-0 text-slate-400" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
                  บันทึกผู้จัดการ (ไม่บังคับ)
                </label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={4}
                  placeholder="เพิ่มหมายเหตุหรือเงื่อนไขก่อนอนุมัติ..."
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-800 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-50"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {item.history && item.history.length > 0 ? (
                item.history.map((h, i) => (
                  <div
                    key={i}
                    className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
                      <Clock size={16} className="text-slate-500" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800">{h.action}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {h.by} · {formatDateTime(h.at)}
                      </p>
                      {h.note && <p className="mt-2 text-sm leading-6 text-slate-600">{h.note}</p>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm font-medium text-slate-400">
                  ยังไม่มีประวัติ
                </div>
              )}
            </div>
          )}
        </div>

        {showReject ? (
          <div className="border-t border-slate-100 bg-rose-50/70 px-6 py-5 sm:px-7">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-rose-700">ระบุเหตุผลที่ไม่อนุมัติ</p>
              <button
                onClick={() => setShowReject(false)}
                className="text-rose-400 transition hover:text-rose-700"
              >
                <X size={16} />
              </button>
            </div>

            <textarea
              autoFocus
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="ระบุเหตุผลที่ไม่อนุมัติรายการนี้"
              className="w-full resize-none rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 placeholder:text-slate-400 focus:border-rose-400 focus:outline-none focus:ring-4 focus:ring-rose-100"
            />

            <div className="mt-3 flex justify-end">
              <button
                onClick={() => rejectReason.trim() && onReject(rejectReason.trim())}
                disabled={processing || !rejectReason.trim()}
                className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-rose-500 disabled:opacity-40"
              >
                {processing ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                ยืนยันไม่อนุมัติ
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-6 py-5 sm:flex-row sm:px-7">
            <button
              onClick={() => setShowReject(true)}
              disabled={processing}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
            >
              <X size={16} />
              ไม่อนุมัติ
            </button>

            <button
              onClick={onApprove}
              disabled={processing}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-40"
            >
              {processing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              อนุมัติรายการนี้
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DecisionQueueCard({
  item,
  processing,
  onClick,
  onApprove,
  onReject,
}: {
  item: DecisionQueueItem;
  processing: boolean;
  onClick: () => void;
  onApprove: (e: React.MouseEvent) => void;
  onReject: (e: React.MouseEvent) => void;
}) {
  const cfg = TYPE_CONFIG[item.type];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={processing}
      className={[
        'group relative flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300',
        processing ? 'pointer-events-none opacity-50' : '',
      ].join(' ')}
    >
      <div className={`h-0.5 w-full ${cfg.bar}`} />

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide ${cfg.chip}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
          <span className="font-mono text-[11px] text-slate-400">{item.number || '—'}</span>
        </div>

        <p className="min-h-[36px] flex-1 line-clamp-2 text-sm font-medium leading-snug text-slate-700">
          {item.title || <span className="italic text-slate-400">ไม่ระบุรายละเอียด</span>}
        </p>

        <ProgressSteps status={item.status} />

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <UserRound size={10} />
            {item.requester || '-'}
          </span>
          <span className="flex items-center gap-1">
            <CalendarDays size={10} />
            {formatShortDate(item.createdAt)}
          </span>
          {item.amount != null && (
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <Banknote size={10} />
              {formatCurrency(item.amount)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
          <span className="flex items-center gap-1 text-[11px] text-slate-400">
            <ChevronRight size={11} className="opacity-0 transition group-hover:opacity-100" />
            ดูรายละเอียด
          </span>
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={onReject}
              disabled={processing}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200 transition hover:bg-rose-50 hover:text-rose-600 hover:ring-rose-200 disabled:opacity-40"
            >
              <X size={10} strokeWidth={3} />
              ปฏิเสธ
            </button>
            <button
              type="button"
              onClick={onApprove}
              disabled={processing}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-40"
            >
              {processing ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} strokeWidth={3} />}
              อนุมัติ
            </button>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function ManagerDashboardClient({ data }: { data: DashboardDataProps }) {
  const { showToast } = useToast();
  const [queue, setQueue] = useState<DecisionQueueItem[]>(data.decisionQueue);
  const [kpiTo, setKpiTo] = useState(() => toIsoDate(new Date()));
  const [kpiFrom, setKpiFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return toIsoDate(d);
  });
  const [kpiMetric, setKpiMetric] = useState<KpiMetric>('approval_sla');
  const [kpiGrain, setKpiGrain] = useState<KpiGrain>('week');

  useEffect(() => {
    setQueue(data.decisionQueue);
  }, [data.decisionQueue]);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<DecisionQueueItem | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleKey | null>(null);
  const [rejectingItem, setRejectingItem] = useState<DecisionQueueItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleApprove = async (item: DecisionQueueItem) => {
    setProcessingId(item.id);
    try {
      const result =
        item.type === 'petty'
          ? await approvePettyCash(item.originalId)
          : await updateApprovalStatus(item.originalId, 'approved');

      if (result?.success) {
        showToast('อนุมัติสำเร็จ', 'success');
        setQueue(prev => prev.filter(e => e.id !== item.id));
        setDetailItem(null);
        return;
      }

      showToast(result?.error || 'เกิดข้อผิดพลาด', 'error');
    } catch {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (item: DecisionQueueItem, reason: string) => {
    setProcessingId(item.id);
    try {
      const result =
        item.type === 'petty'
          ? await rejectPettyCash(item.originalId, reason)
          : await updateApprovalStatus(item.originalId, 'rejected', reason);

      if (result?.success) {
        showToast('ไม่อนุมัติสำเร็จ', 'success');
        setQueue(prev => prev.filter(e => e.id !== item.id));
        setDetailItem(null);
        setRejectingItem(null);
        setRejectReason('');
        return;
      }

      showToast(result?.error || 'เกิดข้อผิดพลาด', 'error');
    } catch {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleQuickRejectSubmit = async () => {
    if (!rejectingItem || !rejectReason.trim()) {
      showToast('กรุณาระบุเหตุผล', 'error');
      return;
    }
    await handleReject(rejectingItem, rejectReason.trim());
  };

  const moduleItems = useMemo(
    () => ({
      general: queue.filter(item => item.type === 'general'),
      purchase: queue.filter(item => item.type === 'purchase'),
      petty: queue.filter(item => item.type === 'petty'),
      maintenance: data.workMonitor
        .filter(item => item.module === 'maintenance')
        .map(item => ({
          id: item.id,
          originalId: Number(item.id) || 0,
          type: 'general' as const,
          module: item.module,
          number: item.number,
          title: item.title,
          requester: null,
          owner: item.owner,
          status: item.status,
          href: item.href,
          createdAt: item.updatedAt,
          description: null,
        })),
      parts: data.workMonitor
        .filter(item => item.module === 'parts' || item.module === 'part-request' || item.module === 'เบิกอะไหล่')
        .map(item => ({
          id: item.id,
          originalId: Number(item.id) || 0,
          type: 'purchase' as const,
          module: item.module,
          number: item.number,
          title: item.title,
          requester: null,
          owner: item.owner,
          status: item.status,
          href: item.href,
          createdAt: item.updatedAt,
          description: null,
        })),
    }),
    [queue, data.workMonitor],
  );

  const totalPending =
    moduleItems.general.length +
    moduleItems.purchase.length +
    moduleItems.petty.length +
    data.pendingPartRequests;

  const openWorkload = totalPending + data.activeMaintenance;
  const approvalRate = totalPending === 0 ? 100 : Math.max(0, 100 - totalPending * 5);
  const kpiFilters = useMemo(() => ({ from: kpiFrom, to: kpiTo }), [kpiFrom, kpiTo]);
  const kpiSummary = useKpiSummary(kpiFilters, Boolean(kpiFrom && kpiTo));
  const kpiTrendRequest = useMemo(
    () => ({ from: kpiFrom, to: kpiTo, metric: kpiMetric, grain: kpiGrain }),
    [kpiFrom, kpiTo, kpiMetric, kpiGrain],
  );
  const kpiTrend = useKpiTrend(kpiTrendRequest, Boolean(kpiFrom && kpiTo));

  return (
  <>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
      .dash-root { font-family: 'IBM Plex Sans Thai', sans-serif; }
      @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      .fu{ animation: fadeUp .3s ease both; }
      .fu1{animation-delay:.04s}.fu2{animation-delay:.08s}.fu3{animation-delay:.12s}.fu4{animation-delay:.16s}.fu5{animation-delay:.20s}
    `}</style>

    <div className="dash-root min-h-screen bg-slate-100">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
        <section className="fu rounded-[32px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-indigo-50/50 p-6 shadow-sm sm:p-8">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                Manager BI Workspace
              </div>

              <h1 className="text-3xl font-black leading-tight text-slate-900 sm:text-[40px]">
                Dashboard <span className="text-slate-500">ควบคุมและอนุมัติงาน</span>
              </h1>

              <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-600">
                มุมมองภาพรวมแบบ BI สำหรับติดตามคิวอนุมัติ งานซ่อม งานจัดซื้อ และรายการที่ต้องเร่งตัดสินใจ
                ในจอเดียว
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <HeroStatCard
                  label="คิวอนุมัติรวม"
                  value={totalPending}
                  sub="ต้องติดตามทันที"
                />
                <HeroStatCard
                  label="งานซ่อมค้าง"
                  value={data.activeMaintenance}
                  sub={`ยังไม่มอบหมาย ${data.unassignedMaintenance}`}
                />
                <HeroStatCard
                  label="จัดซื้อรออนุมัติ"
                  value={moduleItems.purchase.length}
                  sub="Purchasing Queue"
                />
                <HeroStatCard
                  label="Petty Cash"
                  value={moduleItems.petty.length}
                  sub="Manager Approval"
                />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Operational Mix
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">สัดส่วนงานปัจจุบัน</p>
                </div>
                <div className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700">
                  Live
                </div>
              </div>

              <div className="space-y-3">
                <HeroMixBar
                  label="อนุมัติทั่วไป"
                  value={moduleItems.general.length}
                  total={Math.max(totalPending, 1)}
                />
                <HeroMixBar
                  label="จัดซื้อ"
                  value={moduleItems.purchase.length}
                  total={Math.max(totalPending, 1)}
                />
                <HeroMixBar
                  label="งานซ่อมค้าง"
                  value={data.activeMaintenance}
                  total={Math.max(openWorkload, 1)}
                />
                <HeroMixBar
                  label="Petty Cash"
                  value={moduleItems.petty.length}
                  total={Math.max(totalPending, 1)}
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    Approval Rate
                  </p>
                  <p className="mt-1 text-xl font-black tabular-nums text-slate-900">
                    {approvalRate}%
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    Open Workload
                  </p>
                  <p className="mt-1 text-xl font-black tabular-nums text-slate-900">
                    {openWorkload}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="fu fu1 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">KPI Monitor</p>
              <h2 className="mt-1 text-lg font-black text-slate-900">Asset & Operations KPI</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <input
                type="date"
                value={kpiFrom}
                onChange={e => setKpiFrom(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
                aria-label="KPI from date"
              />
              <input
                type="date"
                value={kpiTo}
                onChange={e => setKpiTo(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
                aria-label="KPI to date"
              />
              <select
                value={kpiMetric}
                onChange={e => setKpiMetric(e.target.value as KpiMetric)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
                aria-label="KPI metric"
              >
                {KPI_METRIC_OPTIONS.map(option => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={kpiGrain}
                onChange={e => setKpiGrain(e.target.value as KpiGrain)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
                aria-label="KPI grain"
              >
                {KPI_GRAIN_OPTIONS.map(option => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {kpiSummary.error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              KPI summary load failed: {kpiSummary.error}
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-6">
            {KPI_SUMMARY_CARDS.map(card => {
              const value = getKpiSummaryValue(card.key, kpiSummary.data);
              const display =
                card.key === 'register_lead' || card.key === 'disposal_cycle' ? value.toFixed(2) : value.toFixed(1);

              return (
                <div key={card.key} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{card.label}</p>
                  <div className="mt-1 flex items-end gap-1">
                    {kpiSummary.loading ? (
                      <div className="h-6 w-14 animate-pulse rounded bg-slate-200" />
                    ) : (
                      <>
                        <p className="text-xl font-black leading-none tabular-nums text-slate-900">{display}</p>
                        <p className="pb-0.5 text-[10px] font-semibold text-slate-500">{card.suffix}</p>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-700">
                Trend: {KPI_METRIC_OPTIONS.find(option => option.key === kpiMetric)?.label || kpiMetric}
              </p>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{kpiGrain}</span>
            </div>

            {kpiTrend.loading ? (
              <div className="h-28 animate-pulse rounded-xl bg-slate-200" />
            ) : kpiTrend.error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                KPI trend load failed: {kpiTrend.error}
              </div>
            ) : kpiTrend.data?.points?.length ? (
              <KpiMiniBars points={kpiTrend.data.points} />
            ) : (
              <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white text-xs font-semibold text-slate-400">
                No KPI trend data for selected range
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.9fr)]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 ring-1 ring-indigo-200">
                <CheckCircle2 className="h-4 w-4 text-indigo-500" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">คิวรอการตัดสินใจ</h2>
                <p className="text-[11px] text-slate-400">รายการสำคัญที่รออนุมัติจากผู้จัดการ</p>
              </div>
            </div>

            {queue.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50">
                  <CheckCircle2 className="h-6 w-6 text-indigo-500" />
                </div>
                <p className="text-sm font-semibold text-slate-700">ไม่มีรายการรออนุมัติ</p>
                <p className="mt-1 text-xs text-slate-400">ทุกอย่างถูกจัดการเรียบร้อยแล้ว</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
                {queue.map(item => (
                  <DecisionQueueCard
                    key={item.id}
                    item={item}
                    processing={processingId === item.id}
                    onClick={() => setDetailItem(item)}
                    onApprove={e => {
                      e.stopPropagation();
                      void handleApprove(item);
                    }}
                    onReject={e => {
                      e.stopPropagation();
                      setRejectingItem(item);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="self-start space-y-5 2xl:sticky 2xl:top-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 ring-1 ring-indigo-200">
                  <Zap className="h-4 w-4 text-indigo-500" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">จุดที่ควรรีบดำเนินการ</h2>
                  <p className="text-[11px] text-slate-400">ภาพรวมรายการเร่งด่วน</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  href="/maintenance"
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:bg-white hover:shadow-sm"
                >
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500">งานซ่อมยังไม่มอบหมาย</p>
                    <p className="text-2xl font-black leading-none tabular-nums text-slate-900">
                      {data.unassignedMaintenance}
                    </p>
                    <p className="mt-1.5 text-[11px] text-slate-500">กำหนด owner ให้ชัดเจน</p>
                  </div>
                  <Wrench className="h-8 w-8 text-indigo-200" />
                </Link>

                <Link
                  href="/approvals/manage"
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:bg-white hover:shadow-sm"
                >
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500">รายการรออนุมัติรวม</p>
                    <p className="text-2xl font-black leading-none tabular-nums text-slate-900">{totalPending}</p>
                    <p className="mt-1.5 text-[11px] text-slate-500">ทุกประเภทรวมกัน</p>
                  </div>
                  <Zap className="h-8 w-8 text-indigo-200" />
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 ring-1 ring-indigo-200">
                  <Activity className="h-4 w-4 text-indigo-500" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">ติดตามสถานะงาน</h2>
                  <p className="text-[11px] text-slate-400">อัปเดตล่าสุดจากทุกแผนก</p>
                </div>
              </div>

              <div className="space-y-2">
                {data.workMonitor.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-400">
                    ยังไม่มีข้อมูลติดตามงาน
                  </div>
                ) : (
                  data.workMonitor.map(item => (
                    <a
                      key={item.id}
                      href={item.href}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:bg-white hover:shadow-sm"
                    >
                      <div className="min-w-0 pr-4">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {item.title || item.number || item.module}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {item.module} · {item.owner || 'ยังไม่ระบุผู้รับผิดชอบ'} · {formatDateTime(item.updatedAt)}
                        </p>
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300" />
                    </a>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {activeModule && (
          <ModuleDrawer
            moduleKey={activeModule}
            items={moduleItems[activeModule]}
            processingId={processingId}
            onClose={() => setActiveModule(null)}
            onOpenDetail={item => {
              if (activeModule === 'maintenance' || activeModule === 'parts') {
                window.location.assign(item.href);
                return;
              }
              setDetailItem(item);
              setActiveModule(null);
            }}
            onApprove={item => void handleApprove(item)}
            onReject={item => setRejectingItem(item)}
          />
        )}

        {detailItem && (
          <DetailDrawer
            item={detailItem}
            processing={processingId === detailItem.id}
            onClose={() => setDetailItem(null)}
            onApprove={() => void handleApprove(detailItem)}
            onReject={reason => void handleReject(detailItem, reason)}
          />
        )}

        {rejectingItem && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
              onClick={() => {
                setRejectingItem(null);
                setRejectReason('');
              }}
            />
            <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="border-b border-slate-100 bg-gradient-to-b from-rose-50 to-white px-6 py-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">ยืนยันการไม่อนุมัติ</p>
                      <p className="text-[11px] text-slate-400">จำเป็นต้องระบุก่อนยืนยัน</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setRejectingItem(null);
                      setRejectReason('');
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-4 p-6">
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3.5">
                  <p className="mb-1 font-mono text-[10px] text-slate-400">
                    {rejectingItem.module} · {rejectingItem.number}
                  </p>
                  <p className="text-sm font-semibold text-slate-800">{rejectingItem.title}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    เหตุผล <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    rows={4}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-300 transition focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                    placeholder="ระบุเหตุผลที่ไม่อนุมัติรายการนี้"
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => {
                      setRejectingItem(null);
                      setRejectReason('');
                    }}
                    className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-200"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleQuickRejectSubmit}
                    disabled={processingId === rejectingItem.id || !rejectReason.trim()}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-500 disabled:opacity-40"
                  >
                    {processingId === rejectingItem.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                    ยืนยันไม่อนุมัติ
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  </>
);
}
