'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createApprovalRequest, updatePurchaseRequest } from '@/actions/approvalActions';
import SearchableSelect from '@/components/SearchableSelect';
import { ApprovalRequest } from '../approvals/types';
import { ClipboardList, Eye, Loader2, Pencil, Plus, Printer, Send, ShoppingCart, Trash2, X } from 'lucide-react';

interface ActiveJobOption {
    request_number?: string;
    title?: string | null;
    tbl_rooms?: {
        room_code?: string | null;
    } | null;
}

interface Props {
    initialRequests: ApprovalRequest[];
    activeJobs: ActiveJobOption[];
    initialEditRequestId?: number | null;
}

interface PurchaseItem {
    id: string;
    description: string;
    quantity: number;
    unit: string;
    pricePerUnit: number;
    includeLink: boolean;
    productLink: string;
}

function createEmptyPurchaseItem(): PurchaseItem {
    return {
        id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(),
        description: '',
        quantity: 1,
        unit: '',
        pricePerUnit: 0,
        includeLink: false,
        productLink: '',
    };
}

function formatCurrency(value: number) {
    return value.toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function getLineValue(lines: string[], prefixes: string[]) {
    for (const prefix of prefixes) {
        const line = lines.find((entry) => entry.startsWith(prefix));
        if (line) {
            return line.replace(prefix, '').trim();
        }
    }

    return '';
}

function parseRequestForEdit(request: ApprovalRequest) {
    const raw = request.reason || '';
    const lines = raw.split('\n');
    const items: PurchaseItem[] = [];
    let inItems = false;

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed === 'รายการสินค้า:' || trimmed === 'เธฃเธฒเธขเธเธฒเธฃเธชเธดเธเธเนเธฒ:') {
            inItems = true;
            continue;
        }

        if (!inItems) continue;
        if (trimmed.startsWith('รวมเงิน:') || trimmed.startsWith('เธฃเธงเธกเน€เธเธดเธ:')) break;

        if (/^\d+\./.test(trimmed)) {
            const cleaned = trimmed.replace(/^\d+\.\s*/, '');
            const linkMatch = cleaned.match(/\n\s*ลิงก์สินค้า:/);
            const withoutLink = linkMatch ? cleaned.slice(0, linkMatch.index).trim() : cleaned;
            const match = withoutLink.match(/^(.*) - ([\d.]+)\s+(.+?) @ ฿([\d,]+\.\d{2})/);

            items.push({
                id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(),
                description: match?.[1]?.trim() || withoutLink,
                quantity: Number(match?.[2] || 1),
                unit: match?.[3]?.trim() || '',
                pricePerUnit: Number((match?.[4] || '0').replace(/,/g, '')),
                includeLink: false,
                productLink: '',
            });
            continue;
        }

        if ((trimmed.startsWith('ลิงก์สินค้า:') || trimmed.startsWith('เธฅเธดเธเธเนเธชเธดเธเธเนเธฒ:')) && items.length > 0) {
            items[items.length - 1].includeLink = true;
            items[items.length - 1].productLink = trimmed
                .replace('ลิงก์สินค้า:', '')
                .replace('เธฅเธดเธเธเนเธชเธดเธเธเนเธฒ:', '')
                .trim();
        }
    }

    return {
        requestDate: request.created_at ? new Date(request.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        subject: getLineValue(lines, ['เรื่อง:', 'เน€เธฃเธทเนเธญเธ:']),
        priority: Number(getLineValue(lines, ['ระดับความสำคัญ:', 'เธฃเธฐเธ”เธฑเธเธเธงเธฒเธกเธชเธณเธเธฑเธ:']).split('/')[0] || 3),
        note: getLineValue(lines, ['หมายเหตุ:', 'เธซเธกเธฒเธขเน€เธซเธ•เธธ:']),
        includeTax: lines.some((line) => line.startsWith('ภาษี 7%:') || line.startsWith('เธ เธฒเธฉเธต 7%:')),
        items: items.length > 0 ? items : [createEmptyPurchaseItem()],
    };
}

export default function PurchaseRequestClient({ initialRequests, activeJobs, initialEditRequestId = null }: Props) {
    const [requests, setRequests] = useState<ApprovalRequest[]>(initialRequests);
    const [editingRequestId, setEditingRequestId] = useState<number | null>(null);
    const [requestDate, setRequestDate] = useState(new Date().toISOString().slice(0, 10));
    const [priority, setPriority] = useState(3);
    const [subject, setSubject] = useState('');
    const [referenceJob, setReferenceJob] = useState('');
    const [items, setItems] = useState<PurchaseItem[]>([createEmptyPurchaseItem()]);
    const [includeTax, setIncludeTax] = useState(false);
    const [note, setNote] = useState('');
    const [previewOpen, setPreviewOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const jobOptions = activeJobs
        .map((job) => ({
            value: job.request_number || '',
            label: `${job.request_number || '-'} - ห้อง ${job.tbl_rooms?.room_code || '-'}: ${job.title || '-'}`,
        }))
        .filter((option) => option.value);

    const subTotal = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.pricePerUnit || 0), 0);
    const taxAmount = includeTax ? subTotal * 0.07 : 0;
    const netTotal = subTotal + taxAmount;

    const addItem = () => {
        setItems((prev) => [...prev, createEmptyPurchaseItem()]);
    };

    const removeItem = (id: string) => {
        if (items.length === 1) return;
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    const updateItem = <K extends keyof PurchaseItem>(id: string, field: K, value: PurchaseItem[K]) => {
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
    };

    const startEditing = (request: ApprovalRequest) => {
        const parsed = parseRequestForEdit(request);
        setEditingRequestId(request.request_id);
        setRequestDate(parsed.requestDate);
        setSubject(parsed.subject);
        setPriority(parsed.priority);
        setReferenceJob(request.reference_job || '');
        setItems(parsed.items);
        setIncludeTax(parsed.includeTax);
        setNote(parsed.note === '-' ? '' : parsed.note);
        setMessage(null);
        setPreviewOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setEditingRequestId(null);
        setSubject('');
        setPriority(3);
        setReferenceJob('');
        setItems([createEmptyPurchaseItem()]);
        setIncludeTax(false);
        setNote('');
    };

    useEffect(() => {
        if (!initialEditRequestId) return;
        const target = initialRequests.find((request) => request.request_id === initialEditRequestId);
        if (target) {
            startEditing(target);
        }
    }, [initialEditRequestId, initialRequests]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setMessage(null);

        if (!subject.trim()) {
            setMessage({ type: 'error', text: 'กรุณากรอกหัวข้อคำขอซื้อ' });
            return;
        }

        const invalidItems = items.filter((item) => !item.description.trim() || item.quantity <= 0 || item.pricePerUnit < 0);
        if (invalidItems.length > 0) {
            setMessage({ type: 'error', text: 'กรุณากรอกรายการสินค้าให้ครบ และจำนวนต้องมากกว่า 0' });
            return;
        }

        const invalidLinkItem = items.find((item) => {
            if (!item.includeLink) return false;
            if (!item.productLink.trim()) return true;

            try {
                new URL(item.productLink.trim());
                return false;
            } catch {
                return true;
            }
        });

        if (invalidLinkItem) {
            setMessage({ type: 'error', text: 'ลิงก์สินค้าต้องเป็น URL ที่ถูกต้อง เช่น https://example.com/item' });
            return;
        }

        if (netTotal <= 0) {
            setMessage({ type: 'error', text: 'ยอดรวมสุทธิต้องมากกว่า 0 บาท' });
            return;
        }

        const formattedReason = `เรื่อง: ${subject}
ระดับความสำคัญ: ${priority}/5
หมายเหตุ: ${note.trim() || '-'}

รายการสินค้า:
${items.map((item, index) => `${index + 1}. ${item.description} - ${item.quantity} ${item.unit} @ ฿${formatCurrency(item.pricePerUnit)} (รวม: ฿${formatCurrency((item.quantity || 0) * (item.pricePerUnit || 0))})${item.includeLink ? `\n   ลิงก์สินค้า: ${item.productLink.trim()}` : ''}`).join('\n')}

รวมเงิน: ฿${formatCurrency(subTotal)}
${includeTax ? `ภาษี 7%: ฿${formatCurrency(taxAmount)}\n` : ''}ยอดรวมสุทธิ: ฿${formatCurrency(netTotal)}`;

        setSubmitting(true);
        try {
            const result = editingRequestId
                ? await updatePurchaseRequest({
                    requestId: editingRequestId,
                    request_date: requestDate,
                    amount: netTotal,
                    reason: formattedReason,
                    reference_job: referenceJob || null,
                })
                : await createApprovalRequest({
                    request_type: 'purchase',
                    request_date: requestDate,
                    amount: netTotal,
                    reason: formattedReason,
                    reference_job: referenceJob || null,
                });

            if (result.success && result.data) {
                setRequests((prev) => editingRequestId
                    ? prev.map((request) => request.request_id === editingRequestId ? result.data as ApprovalRequest : request)
                    : [result.data as ApprovalRequest, ...prev]);
                resetForm();
                setMessage({ type: 'success', text: editingRequestId ? 'อัปเดตใบเสนอซื้อเรียบร้อยแล้ว' : 'ส่งคำขอซื้อเรียบร้อยแล้ว และระบบแจ้งเตือนฝ่ายจัดซื้อแล้ว' });
            } else {
                setMessage({ type: 'error', text: result.error || 'ไม่สามารถส่งคำขอซื้อได้' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด' });
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'approved':
                return 'bg-emerald-100 text-emerald-700';
            case 'rejected':
                return 'bg-rose-100 text-rose-700';
            default:
                return 'bg-amber-100 text-amber-700';
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-8">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <ShoppingCart className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ส่งคำขอซื้อ</h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            ระบุรายละเอียดสินค้า แนบลิงก์สินค้าเป็นรายรายการได้ และพิมพ์ใบเสนอซื้อออกเป็นกระดาษได้หลังส่งคำขอ
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">วันที่ขอ</label>
                                <input
                                    type="date"
                                    value={requestDate}
                                    onChange={(e) => setRequestDate(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">อ้างอิงงานซ่อม</label>
                                <SearchableSelect
                                    options={jobOptions}
                                    value={referenceJob}
                                    onChange={setReferenceJob}
                                    placeholder="เลือกงานซ่อมที่เกี่ยวข้อง (ถ้ามี)"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="md:w-[200px] shrink-0">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ระดับความสำคัญ</label>
                                <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-700/50 p-2 border rounded-lg border-gray-200 dark:border-slate-600">
                                    {[1, 2, 3, 4, 5].map((level) => (
                                        <label key={level} className="flex flex-col items-center cursor-pointer px-1">
                                            <span className="text-xs font-semibold mb-1 text-gray-600 dark:text-gray-300">{level}</span>
                                            <input
                                                type="radio"
                                                name="priority"
                                                value={level}
                                                checked={priority === level}
                                                onChange={() => setPriority(level)}
                                                className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                                            />
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">หัวข้อคำขอซื้อ</label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-3 dark:bg-slate-700 dark:border-slate-600"
                                    placeholder="เช่น จัดซื้ออุปกรณ์ทำความสะอาดห้องพัก"
                                    required
                                />
                            </div>
                        </div>

                        <div className="border border-gray-200 dark:border-slate-600 rounded-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-slate-700 dark:text-gray-300 border-b border-gray-200 dark:border-slate-600">
                                        <tr>
                                            <th className="px-3 py-3 w-12 text-center">ลำดับ</th>
                                            <th className="px-3 py-3 min-w-[300px]">รายการสินค้า</th>
                                            <th className="px-3 py-3 w-28 text-right">จำนวน</th>
                                            <th className="px-3 py-3 w-28 text-center">หน่วย</th>
                                            <th className="px-3 py-3 w-36 text-right">ราคา/หน่วย</th>
                                            <th className="px-3 py-3 w-36 text-right">รวม</th>
                                            <th className="px-3 py-3 w-12 text-center">ลบ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item, index) => (
                                            <tr key={item.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 align-top">
                                                <td className="px-3 py-3 text-center text-gray-500">{index + 1}</td>
                                                <td className="px-3 py-3 space-y-2">
                                                    <input
                                                        type="text"
                                                        value={item.description}
                                                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                                        className="w-full bg-transparent border-0 border-b border-gray-300 dark:border-slate-600 focus:ring-0 px-1 py-1 text-sm outline-none"
                                                        placeholder="ระบุชื่อสินค้า / รายละเอียด"
                                                        required
                                                    />
                                                    <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                                                        <input
                                                            type="checkbox"
                                                            checked={item.includeLink}
                                                            onChange={(e) => updateItem(item.id, 'includeLink', e.target.checked)}
                                                            className="rounded text-emerald-600 focus:ring-emerald-500"
                                                        />
                                                        แนบลิงก์สินค้า
                                                    </label>
                                                    {item.includeLink && (
                                                        <input
                                                            type="url"
                                                            value={item.productLink}
                                                            onChange={(e) => updateItem(item.id, 'productLink', e.target.value)}
                                                            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-xs dark:bg-slate-700"
                                                            placeholder="https://example.com/product"
                                                        />
                                                    )}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity || ''}
                                                        onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                                                        className="w-full bg-transparent border-0 border-b border-gray-300 dark:border-slate-600 focus:ring-0 px-1 py-1 text-sm text-right outline-none"
                                                        required
                                                    />
                                                </td>
                                                <td className="px-3 py-3">
                                                    <input
                                                        type="text"
                                                        value={item.unit}
                                                        onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                                                        className="w-full bg-transparent border-0 border-b border-gray-300 dark:border-slate-600 focus:ring-0 px-1 py-1 text-sm text-center outline-none"
                                                        placeholder="ชิ้น"
                                                        required
                                                    />
                                                </td>
                                                <td className="px-3 py-3">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={item.pricePerUnit === 0 ? '' : item.pricePerUnit}
                                                        onChange={(e) => updateItem(item.id, 'pricePerUnit', Number(e.target.value))}
                                                        className="w-full bg-transparent border-0 border-b border-gray-300 dark:border-slate-600 focus:ring-0 px-1 py-1 text-sm text-right outline-none"
                                                        placeholder="0.00"
                                                        required
                                                    />
                                                </td>
                                                <td className="px-3 py-3 text-right font-medium text-emerald-700 dark:text-emerald-400">
                                                    {formatCurrency((item.quantity || 0) * (item.pricePerUnit || 0))}
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(item.id)}
                                                        disabled={items.length === 1}
                                                        className="p-1.5 rounded-md text-rose-500 hover:bg-rose-50 disabled:opacity-30"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-gray-50/80 dark:bg-slate-700/30">
                                            <td colSpan={7} className="px-3 py-3">
                                                <button
                                                    type="button"
                                                    onClick={addItem}
                                                    className="inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-medium text-sm"
                                                >
                                                    <Plus className="w-4 h-4" /> เพิ่มรายการสินค้า
                                                </button>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="bg-gray-50 dark:bg-slate-800/80 p-5 border-t border-gray-200 dark:border-slate-600 flex justify-end">
                                <div className="w-full sm:w-72 space-y-3 text-sm">
                                    <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                                        <span>รวมก่อนภาษี</span>
                                        <span className="font-medium text-gray-900 dark:text-gray-200">{formatCurrency(subTotal)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <label className="flex items-center gap-2 cursor-pointer text-gray-600 dark:text-gray-400">
                                            <input
                                                type="checkbox"
                                                checked={includeTax}
                                                onChange={(e) => setIncludeTax(e.target.checked)}
                                                className="rounded text-emerald-600 focus:ring-emerald-500"
                                            />
                                            VAT 7%
                                        </label>
                                        <span className="font-medium text-gray-900 dark:text-gray-200">{formatCurrency(taxAmount)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-slate-600 text-base font-bold text-gray-900 dark:text-white">
                                        <span>ยอดรวมสุทธิ</span>
                                        <span className="text-emerald-600 dark:text-emerald-400">฿ {formatCurrency(netTotal)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">หมายเหตุ</label>
                            <input
                                type="text"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="w-full border rounded-lg px-3 py-2.5 dark:bg-slate-700 dark:border-slate-600 text-sm"
                                placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)"
                            />
                        </div>

                        {message && (
                            <div className={`rounded-xl px-4 py-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                {message.text}
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3">
                            {editingRequestId && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="sm:w-1/4 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3.5 font-medium text-slate-700 hover:bg-slate-50"
                                >
                                    <X className="w-4 h-4" />
                                    ยกเลิกแก้ไข
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setPreviewOpen(true)}
                                className="sm:w-1/4 inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-3.5 font-medium text-emerald-700 hover:bg-emerald-50"
                            >
                                <Eye className="w-5 h-5" />
                                ดูตัวอย่าง
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="sm:flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3.5 font-medium disabled:opacity-60"
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                {submitting ? 'กำลังส่งคำขอ...' : 'ส่งใบเสนอซื้อ'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="xl:col-span-1 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-fit max-h-[1000px]">
                    <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex items-center gap-3 bg-gray-50/50 dark:bg-slate-800/50">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                            <ClipboardList className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">คำขอซื้อล่าสุดของฉัน</h2>
                    </div>

                    <div className="divide-y divide-gray-100 dark:divide-slate-700 overflow-y-auto">
                        {requests.length === 0 ? (
                            <div className="p-10 flex flex-col items-center justify-center text-center">
                                <ClipboardList className="w-12 h-12 text-gray-300 dark:text-slate-600 mb-3" />
                                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">ยังไม่มีคำขอซื้อในระบบ</div>
                            </div>
                        ) : (
                            requests.map((request) => (
                                <div key={request.request_id} className="p-5 hover:bg-gray-50/50 dark:hover:bg-slate-700/20 transition-colors">
                                    <div className="flex flex-col gap-3">
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="font-semibold text-emerald-700 dark:text-emerald-400 text-sm">
                                                {request.request_number}
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(request.status)}`}>
                                                {request.status}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-gray-100 dark:border-slate-700 shadow-inner max-h-48 overflow-y-auto font-mono leading-relaxed">
                                            {request.reason}
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                                            <span>ยอดรวมสุทธิ</span>
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                ฿{request.amount ? formatCurrency(Number(request.amount)) : '0.00'}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap justify-end gap-2">
                                            {request.status === 'pending' && (
                                                <button
                                                    type="button"
                                                    onClick={() => startEditing(request)}
                                                    className="inline-flex items-center gap-2 rounded-lg border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                    แก้ไขก่อนพิมพ์
                                                </button>
                                            )}
                                            <Link
                                                href={`/print/purchase-request/${request.request_id}`}
                                                target="_blank"
                                                className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                                            >
                                                <Printer className="w-4 h-4" />
                                                พิมพ์ใบเสนอซื้อ
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {previewOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 px-4 py-6 overflow-y-auto">
                    <div className="mx-auto max-w-5xl rounded-2xl bg-white shadow-2xl">
                        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">ตัวอย่างใบเสนอซื้อ</h2>
                                <p className="text-sm text-gray-500">ตรวจสอบข้อมูลก่อนส่งคำขอจริง</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPreviewOpen(false)}
                                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 md:p-8 text-black">
                            <div className="mb-6 border-b pb-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h1 className="text-3xl font-bold tracking-wide">ใบเสนอซื้อ</h1>
                                        <p className="mt-2 text-sm text-gray-600">Purchase Request Preview</p>
                                    </div>
                                    <div className="text-right text-sm">
                                        <div>
                                            <span className="block text-gray-500">วันที่ขอ</span>
                                            <span>{requestDate || '-'}</span>
                                        </div>
                                        <div className="mt-2">
                                            <span className="block text-gray-500">ระดับความสำคัญ</span>
                                            <span className="font-semibold">{priority}/5</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="rounded border p-4">
                                    <div className="text-xs uppercase text-gray-500">หัวข้อ</div>
                                    <div className="mt-1 font-semibold">{subject || '-'}</div>
                                </div>
                                <div className="rounded border p-4">
                                    <div className="text-xs uppercase text-gray-500">อ้างอิงงาน</div>
                                    <div className="mt-1 font-semibold">{referenceJob || '-'}</div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h3 className="mb-3 text-sm font-bold uppercase text-gray-500">รายการสินค้า</h3>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b-2 border-black">
                                            <th className="py-2 text-left w-12">#</th>
                                            <th className="py-2 text-left">รายละเอียด</th>
                                            <th className="py-2 text-right w-24">จำนวน</th>
                                            <th className="py-2 text-left w-24">หน่วย</th>
                                            <th className="py-2 text-right w-32">ราคา/หน่วย</th>
                                            <th className="py-2 text-right w-32">รวม</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {items.map((item, index) => (
                                            <tr key={item.id}>
                                                <td className="py-3">{index + 1}</td>
                                                <td className="py-3">
                                                    <div className="font-medium">{item.description || '-'}</div>
                                                    {item.includeLink && item.productLink.trim() && (
                                                        <div className="mt-1 break-all text-xs text-blue-700">{item.productLink.trim()}</div>
                                                    )}
                                                </td>
                                                <td className="py-3 text-right">{item.quantity || 0}</td>
                                                <td className="py-3">{item.unit || '-'}</td>
                                                <td className="py-3 text-right">{formatCurrency(item.pricePerUnit || 0)}</td>
                                                <td className="py-3 text-right font-medium">{formatCurrency((item.quantity || 0) * (item.pricePerUnit || 0))}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mb-6 rounded border p-4 text-sm">
                                <div className="mb-2 font-semibold">หมายเหตุ</div>
                                <div>{note || '-'}</div>
                            </div>

                            <div className="ml-auto mb-8 w-full max-w-sm space-y-2 text-sm">
                                <div className="flex justify-between border-b pb-2">
                                    <span>รวมเงิน</span>
                                    <span>฿{formatCurrency(subTotal)}</span>
                                </div>
                                {includeTax && (
                                    <div className="flex justify-between border-b pb-2">
                                        <span>ภาษี 7%</span>
                                        <span>฿{formatCurrency(taxAmount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-base font-bold">
                                    <span>ยอดรวมสุทธิ</span>
                                    <span>฿{formatCurrency(netTotal)}</span>
                                </div>
                            </div>

                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 border-t pt-4">
                                <button
                                    type="button"
                                    onClick={() => setPreviewOpen(false)}
                                    className="rounded-xl border px-4 py-2.5 text-gray-700 hover:bg-gray-50"
                                >
                                    กลับไปแก้ไข
                                </button>
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-gray-700 hover:bg-gray-50"
                                >
                                    <Printer className="h-4 w-4" />
                                    พิมพ์ตัวอย่าง
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewOpen(false)}
                                    className="rounded-xl bg-emerald-600 px-4 py-2.5 font-medium text-white hover:bg-emerald-700"
                                >
                                    ยืนยันตัวอย่าง
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
