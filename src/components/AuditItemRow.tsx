'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, Loader2, RotateCcw } from 'lucide-react';

import { updateAuditItem } from '@/actions/auditActions';
import {
    INVENTORY_AUDIT_COPY,
    INVENTORY_AUDIT_REASON_OPTIONS,
    getInventoryAuditItemStatusMeta,
} from '@/lib/inventory-audit';

interface Props {
    item: {
        item_id: number;
        p_id: string;
        snapshot_qty?: number | null;
        final_count_qty?: number | null;
        counted_qty?: number | null;
        variance_qty?: number | null;
        variance_value?: number | string | null;
        movement_delta_qty?: number | null;
        approved_adjustment_qty?: number | null;
        reason_code?: string | null;
        reason_note?: string | null;
        item_status?: string | null;
        requires_recount?: boolean | null;
        recount_qty?: number | null;
    };
    index: number;
    productName: string;
    unit: string;
    liveQty: number;
    readOnly: boolean;
}

const formatMoney = (value: number) =>
    new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        maximumFractionDigits: 0,
    }).format(value || 0);

export function AuditItemRow({ item, index, productName, unit, liveQty, readOnly }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [counted, setCounted] = useState(item.final_count_qty?.toString() || item.counted_qty?.toString() || '');
    const [reasonCode, setReasonCode] = useState(item.reason_code || '');
    const [reasonNote, setReasonNote] = useState(item.reason_note || '');
    const [saved, setSaved] = useState(false);

    const snapshotQty = Number(item.snapshot_qty || 0);
    const countedQty = counted === '' ? null : Number.parseInt(counted, 10);
    const varianceQty = countedQty === null ? Number(item.variance_qty || 0) : countedQty - snapshotQty;
    const adjustmentQty = countedQty === null ? Number(item.approved_adjustment_qty || 0) : countedQty - liveQty;
    const status = getInventoryAuditItemStatusMeta(item.item_status);

    const commit = (payload?: { reasonCode?: string | null; reasonNote?: string | null }) => {
        if (readOnly) return;
        if (countedQty === null || Number.isNaN(countedQty)) return;

        startTransition(async () => {
            const result = await updateAuditItem(item.item_id, {
                countedQty,
                reasonCode: payload?.reasonCode ?? (reasonCode || null),
                reasonNote: payload?.reasonNote ?? (reasonNote || null),
            });

            if (!result.success) {
                alert(result.error || INVENTORY_AUDIT_COPY.itemUpdateFailed);
                return;
            }

            setSaved(true);
            window.setTimeout(() => setSaved(false), 1800);
            router.refresh();
        });
    };

    return (
        <tr className={`border-b border-slate-100 align-top transition ${saved ? 'bg-emerald-50/60' : 'hover:bg-slate-50/70'}`}>
            <td className="px-4 py-4 text-sm text-slate-500">{index + 1}</td>

            <td className="px-4 py-4">
                <div className="min-w-[220px]">
                    <p className="font-medium text-slate-900">{productName}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.p_id}</p>
                </div>
            </td>

            <td className="px-4 py-4 text-right">
                <div className="text-sm font-semibold text-slate-900">{snapshotQty}</div>
                <div className="text-xs text-slate-500">{unit}</div>
            </td>

            <td className="px-4 py-4">
                {readOnly ? (
                    <div className="text-right">
                        <div className="text-sm font-semibold text-slate-900">
                            {item.final_count_qty ?? item.counted_qty ?? INVENTORY_AUDIT_COPY.valuePlaceholder}
                        </div>
                        {item.recount_qty !== null && item.recount_qty !== undefined && (
                            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                                <RotateCcw className="h-3 w-3" /> นับซ้ำแล้ว
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        <input
                            type="number"
                            min="0"
                            value={counted}
                            onChange={(event) => setCounted(event.target.value)}
                            onBlur={() => commit()}
                            className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-right text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                            placeholder={INVENTORY_AUDIT_COPY.valuePlaceholder}
                        />
                        {item.recount_qty !== null && item.recount_qty !== undefined && (
                            <div className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                                <RotateCcw className="h-3 w-3" /> รายการนี้มีการนับซ้ำ
                            </div>
                        )}
                    </div>
                )}
            </td>

            <td className="px-4 py-4 text-right">
                <div className={`text-sm font-semibold ${varianceQty === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {varianceQty > 0 ? `+${varianceQty}` : varianceQty}
                </div>
                <div className="mt-1 text-xs text-slate-500">{formatMoney(Number(item.variance_value || 0))}</div>
            </td>

            <td className="px-4 py-4 text-right">
                <div className="text-sm font-semibold text-slate-900">{liveQty}</div>
                <div className="mt-1 text-xs text-slate-500">
                    {Number(item.movement_delta_qty || 0) === 0
                        ? 'ไม่มี drift'
                        : `drift ${Number(item.movement_delta_qty || 0) > 0 ? '+' : ''}${Number(item.movement_delta_qty || 0)}`}
                </div>
            </td>

            <td className="px-4 py-4 text-right">
                <div className={`text-sm font-semibold ${adjustmentQty === 0 ? 'text-slate-700' : 'text-blue-700'}`}>
                    {adjustmentQty > 0 ? `+${adjustmentQty}` : adjustmentQty}
                </div>
                <div className="mt-1 text-xs text-slate-500">ยอดที่จะ post</div>
            </td>

            <td className="px-4 py-4">
                {readOnly ? (
                    <div className="max-w-[220px] text-sm text-slate-700">
                        <p>{INVENTORY_AUDIT_REASON_OPTIONS.find((option) => option.value === item.reason_code)?.label || INVENTORY_AUDIT_COPY.valuePlaceholder}</p>
                        {item.reason_note && <p className="mt-1 text-xs text-slate-500">{item.reason_note}</p>}
                    </div>
                ) : (
                    <div className="min-w-[220px] space-y-2">
                        <select
                            value={reasonCode}
                            onChange={(event) => {
                                const value = event.target.value;
                                setReasonCode(value);
                                commit({ reasonCode: value || null, reasonNote });
                            }}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                        >
                            <option value="">เลือกสาเหตุ (ถ้ามีผลต่าง)</option>
                            {INVENTORY_AUDIT_REASON_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <textarea
                            rows={2}
                            value={reasonNote}
                            onChange={(event) => setReasonNote(event.target.value)}
                            onBlur={() => commit({ reasonCode: reasonCode || null, reasonNote })}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                            placeholder={INVENTORY_AUDIT_COPY.reasonPlaceholder}
                        />
                    </div>
                )}
            </td>

            <td className="px-4 py-4">
                <div className="flex min-w-[150px] flex-col items-start gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.badgeClass}`}>
                        {status.label}
                    </span>

                    {item.requires_recount && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                            <AlertTriangle className="h-3 w-3" /> ต้องนับซ้ำ
                        </span>
                    )}

                    {isPending && (
                        <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                            <Loader2 className="h-3 w-3 animate-spin" /> กำลังบันทึก
                        </span>
                    )}
                    {saved && !isPending && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                            <Check className="h-3 w-3" /> บันทึกแล้ว
                        </span>
                    )}
                </div>
            </td>
        </tr>
    );
}
