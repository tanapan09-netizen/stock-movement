'use client';

import { useState } from 'react';
import { updateAuditItem } from '@/actions/auditActions';
import { Check, Loader2 } from 'lucide-react';

interface Props {
    item: any;
    index: number;
    productName: string;
    unit: string;
    readOnly: boolean;
}

export function AuditItemRow({ item, index, productName, unit, readOnly }: Props) {
    const [counted, setCounted] = useState<string>(item.counted_qty?.toString() || '');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const systemQty = item.system_qty;
    const countedNum = counted === '' ? null : parseInt(counted);
    const discrepancy = countedNum !== null ? countedNum - systemQty : null;

    const handleBlur = async () => {
        if (readOnly) return;
        if (counted === '' || isNaN(parseInt(counted))) return;

        // Only update if changed
        if (parseInt(counted) === item.counted_qty) return;

        setSaving(true);
        setSaved(false);
        try {
            await updateAuditItem(item.item_id, parseInt(counted));
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e) {
            alert('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    return (
        <tr className={`hover:bg-blue-50 transition ${saved ? 'bg-green-50' : ''}`}>
            <td className="px-4 py-3 text-gray-500">{index + 1}</td>
            <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{productName}</div>
                <div className="text-xs text-gray-500">{item.p_id}</div>
            </td>
            <td className="px-4 py-3 text-right font-medium text-gray-600">
                {systemQty} {unit}
            </td>
            <td className="px-4 py-3 text-right">
                {readOnly ? (
                    <span className="font-bold">{item.counted_qty ?? '-'}</span>
                ) : (
                    <div className="relative">
                        <input
                            type="number"
                            className="w-24 text-right border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={counted}
                            onChange={(e) => setCounted(e.target.value)}
                            onBlur={handleBlur}
                            placeholder="..."
                        />
                    </div>
                )}
            </td>
            <td className="px-4 py-3 text-right font-bold">
                {discrepancy !== null ? (
                    <span className={discrepancy === 0 ? 'text-green-600' : 'text-red-600'}>
                        {discrepancy > 0 ? `+${discrepancy}` : discrepancy}
                    </span>
                ) : '-'}
            </td>
            <td className="px-4 py-3 text-center">
                {saving && <Loader2 className="w-4 h-4 animate-spin text-blue-500 mx-auto" />}
                {saved && <Check className="w-4 h-4 text-green-500 mx-auto" />}
                {!saving && !saved && discrepancy === 0 && countedNum !== null && (
                    <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
                )}
                {!saving && !saved && discrepancy !== 0 && discrepancy !== null && (
                    <span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span>
                )}
            </td>
        </tr>
    );
}
