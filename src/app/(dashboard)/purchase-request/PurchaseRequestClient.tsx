'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createApprovalRequest, updatePurchaseRequest } from '@/actions/approvalActions';
import { FloatingSearchInput } from '@/components/FloatingField';
import SearchableSelect from '@/components/SearchableSelect';
import { ApprovalRequest } from '../approvals/types';
import { ClipboardList, Eye, Loader2, Package, Pencil, Plus, Printer, Send, ShoppingCart, Trash2, X } from 'lucide-react';
import { getProcurementStatusBadgeClass, getProcurementStatusLabel } from '@/lib/procurement-status';

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
    stockProducts: Array<{
        p_id: string;
        p_name: string;
        p_count: number | null;
        p_unit: string | null;
        price_unit: number | null;
    }>;
    initialEditRequestId?: number | null;
}

type PurchaseItemType = 'stock' | 'non_stock';

interface PurchaseItem {
    id: string;
    itemType: PurchaseItemType;
    stockProductId: string;
    stockSearch: string;
    description: string;
    quantity: number;
    unit: string;
    pricePerUnit: number;
    includeLink: boolean;
    productLink: string;
}

function buildStockSearchLabel(productId: string, productName: string) {
    return `${productId} - ${productName}`;
}

function createEmptyPurchaseItem(): PurchaseItem {
    return {
        id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(),
        itemType: 'stock',
        stockProductId: '',
        stockSearch: '',
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

function getValueAfterColon(line: string | undefined) {
    if (!line) return '';
    const separatorIndex = line.indexOf(':');
    if (separatorIndex < 0) return '';
    return line.slice(separatorIndex + 1).trim();
}

function parseRequestForEdit(
    request: ApprovalRequest,
    stockProducts: Array<{ p_id: string; p_name: string; p_count: number | null; p_unit: string | null; price_unit: number | null }>,
) {
    const raw = request.reason || '';
    const lines = raw.split('\n');
    const normalizedLines = lines.map((line) => line.trim()).filter(Boolean);
    const headerLines = normalizedLines.filter((line) => line.includes(':')).slice(0, 3);
    const items: PurchaseItem[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (/^\d+\./.test(trimmed)) {
            const cleaned = trimmed.replace(/^\d+\.\s*/, '');
            const isNonStock = /^\[(?:NON[-_\s]?STOCK)\]\s*/i.test(cleaned);
            const cleanedWithoutTypeTag = cleaned
                .replace(/^\[(?:NON[-_\s]?STOCK)\]\s*/i, '')
                .replace(/^\[(?:STOCK)\]\s*/i, '');
            const match = cleanedWithoutTypeTag.match(/^(.*) - ([\d.]+)\s+(.+?) @ [^\d]*([\d,]+\.\d{2})/);

            items.push({
                id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(),
                itemType: isNonStock ? 'non_stock' : 'stock',
                stockProductId: '',
                stockSearch: isNonStock ? '' : (match?.[1]?.trim() || cleanedWithoutTypeTag),
                description: match?.[1]?.trim() || cleanedWithoutTypeTag,
                quantity: Number(match?.[2] || 1),
                unit: match?.[3]?.trim() || '',
                pricePerUnit: Number((match?.[4] || '0').replace(/,/g, '')),
                includeLink: false,
                productLink: '',
            });
            continue;
        }

        if (items.length > 0 && trimmed.includes('http')) {
            const normalizedLink = trimmed.replace(/^[^:]+:/, '').trim();
            if (/^https?:\/\//i.test(normalizedLink)) {
                items[items.length - 1].includeLink = true;
                items[items.length - 1].productLink = normalizedLink;
            }
        }
    }

    const normalizedItems = (items.length > 0 ? items : [createEmptyPurchaseItem()]).map((item) => {
        if (item.itemType !== 'stock') return item;
        const normalizedDescription = (item.description || '').trim().toLowerCase();
        const matchedProduct = stockProducts.find((product) => (
            product.p_id.toLowerCase() === normalizedDescription
            || product.p_name.trim().toLowerCase() === normalizedDescription
        ));
        if (!matchedProduct) return item;
        return {
            ...item,
            stockProductId: matchedProduct.p_id,
            stockSearch: buildStockSearchLabel(matchedProduct.p_id, matchedProduct.p_name),
            description: matchedProduct.p_name,
            unit: matchedProduct.p_unit || item.unit || '',
            pricePerUnit: Number(matchedProduct.price_unit ?? item.pricePerUnit ?? 0),
        };
    });

    return {
        requestDate: request.created_at ? new Date(request.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        subject: getValueAfterColon(headerLines[0]),
        priority: Number(getValueAfterColon(headerLines[1]).split('/')[0] || 3),
        note: getValueAfterColon(headerLines[2]),
        includeTax: normalizedLines.some((line) => line.includes('7%')),
        items: normalizedItems,
    };
}

export default function PurchaseRequestClient({ initialRequests, activeJobs, stockProducts, initialEditRequestId = null }: Props) {
    const [requests, setRequests] = useState<ApprovalRequest[]>(initialRequests);
    const [editingRequestId, setEditingRequestId] = useState<number | null>(null);
    const [requestDate, setRequestDate] = useState(new Date().toISOString().slice(0, 10));
    const [priority, setPriority] = useState(3);
    const [subject, setSubject] = useState('');
    const [referenceJob, setReferenceJob] = useState('');
    const [requestItemType, setRequestItemType] = useState<PurchaseItemType>('stock');
    const [items, setItems] = useState<PurchaseItem[]>([createEmptyPurchaseItem()]);
    const [includeTax, setIncludeTax] = useState(false);
    const [note, setNote] = useState('');
    const [previewOpen, setPreviewOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const returnedBannerRef = useRef<HTMLDivElement | null>(null);
    const stockPickerRef = useRef<HTMLDivElement | null>(null);
    const [openStockPickerItemId, setOpenStockPickerItemId] = useState<string | null>(null);

    const jobOptions = activeJobs
        .map((job) => ({
            value: job.request_number || '',
            label: `${job.request_number || '-'} - ห้อง ${job.tbl_rooms?.room_code || '-'}: ${job.title || '-'}`,
        }))
        .filter((option) => option.value);

    const subTotal = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.pricePerUnit || 0), 0);
    const taxAmount = includeTax ? subTotal * 0.07 : 0;
    const netTotal = subTotal + taxAmount;
    const editingRequest = editingRequestId
        ? requests.find((request) => request.request_id === editingRequestId) ?? null
        : null;
    const editingReturnedRequest = editingRequest?.status === 'returned' ? editingRequest : null;
    const returnedRequests = requests.filter((request) => request.status === 'returned');
    const otherRequests = requests.filter((request) => request.status !== 'returned');

    const addItem = () => {
        setItems((prev) => [
            ...prev,
            {
                ...createEmptyPurchaseItem(),
                itemType: requestItemType,
            },
        ]);
    };

    const removeItem = (id: string) => {
        if (items.length === 1) return;
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    const updateItem = <K extends keyof PurchaseItem>(id: string, field: K, value: PurchaseItem[K]) => {
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
    };

    const setDocumentItemType = (itemType: PurchaseItemType) => {
        if (itemType === 'stock' && stockProducts.length === 0) {
            setMessage({ type: 'error', text: 'ยังไม่มีสินค้าใน stock ให้เลือก' });
            return;
        }

        setOpenStockPickerItemId(null);
        setRequestItemType(itemType);
        const fallbackProduct = stockProducts[0];

        setItems((prev) => prev.map((item) => {
            if (itemType === 'non_stock') {
                return {
                    ...item,
                    itemType: 'non_stock',
                    stockProductId: '',
                    stockSearch: '',
                };
            }

            if (!fallbackProduct) {
                return {
                    ...item,
                    itemType: 'stock',
                };
            }

            const matchedByExistingId = item.stockProductId
                ? stockProducts.find((product) => product.p_id === item.stockProductId)
                : null;
            const selected = matchedByExistingId || fallbackProduct;

            return {
                ...item,
                itemType: 'stock',
                stockProductId: matchedByExistingId ? selected.p_id : '',
                stockSearch: matchedByExistingId ? buildStockSearchLabel(selected.p_id, selected.p_name) : '',
                description: matchedByExistingId ? selected.p_name : '',
                unit: matchedByExistingId ? (selected.p_unit || item.unit || '') : item.unit,
                pricePerUnit: matchedByExistingId ? Number(selected.price_unit ?? item.pricePerUnit ?? 0) : item.pricePerUnit,
            };
        }));
    };

    const setStockProduct = (id: string, productId: string) => {
        const selected = stockProducts.find((product) => product.p_id === productId);
        if (!selected) return;

        setItems((prev) => prev.map((item) => {
            if (item.id !== id) return item;
            return {
                ...item,
                itemType: 'stock',
                stockProductId: selected.p_id,
                stockSearch: buildStockSearchLabel(selected.p_id, selected.p_name),
                description: selected.p_name,
                unit: selected.p_unit || '',
                pricePerUnit: Number(selected.price_unit ?? 0),
            };
        }));
    };

    const setStockProductByQuery = (id: string, rawValue: string) => {
        const query = rawValue.trim();
        if (!query) {
            setItems((prev) => prev.map((item) => (
                item.id === id
                    ? { ...item, stockProductId: '', stockSearch: '', description: '' }
                    : item
            )));
            return;
        }

        const lower = query.toLowerCase();
        const idFromLabel = query.includes(' - ') ? query.split(' - ')[0].trim() : '';
        const selected = stockProducts.find((product) => (
            product.p_id.toLowerCase() === lower
            || product.p_name.trim().toLowerCase() === lower
            || (idFromLabel && product.p_id.toLowerCase() === idFromLabel.toLowerCase())
        ));

        if (selected) {
            setStockProduct(id, selected.p_id);
            return;
        }

        setItems((prev) => prev.map((item) => (
            item.id === id
                ? {
                    ...item,
                    itemType: 'stock',
                    stockProductId: '',
                    stockSearch: query,
                    description: query,
                }
                : item
        )));
    };

    const startEditing = (request: ApprovalRequest) => {
        const parsed = parseRequestForEdit(request, stockProducts);
        setEditingRequestId(request.request_id);
        setRequestDate(parsed.requestDate);
        setSubject(parsed.subject);
        setPriority(parsed.priority);
        setReferenceJob(request.reference_job || '');
        setRequestItemType(parsed.items[0]?.itemType === 'non_stock' ? 'non_stock' : 'stock');
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
        setRequestItemType('stock');
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

    useEffect(() => {
        if (!editingReturnedRequest || !returnedBannerRef.current) return;

        returnedBannerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        returnedBannerRef.current.focus({ preventScroll: true });
    }, [editingReturnedRequest]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (stockPickerRef.current && !stockPickerRef.current.contains(event.target as Node)) {
                setOpenStockPickerItemId(null);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getFilteredStockProducts = (query: string) => {
        const keyword = query.trim().toLowerCase();
        if (!keyword) return stockProducts.slice(0, 40);
        return stockProducts.filter((product) => (
            product.p_id.toLowerCase().includes(keyword)
            || product.p_name.toLowerCase().includes(keyword)
        )).slice(0, 40);
    };

    const renderRequestCard = (request: ApprovalRequest, emphasis: 'default' | 'returned' = 'default') => (
        <div
            key={request.request_id}
            className={`p-5 transition-colors ${
                emphasis === 'returned'
                    ? 'bg-orange-50/80 dark:bg-orange-950/20'
                    : 'hover:bg-gray-50/50 dark:hover:bg-slate-700/20'
            }`}
        >
            <div className="flex flex-col gap-3">
                <div className="flex justify-between items-start gap-3">
                    <div className="font-semibold text-emerald-700 dark:text-emerald-400 text-sm">
                        {request.request_number}
                    </div>
                    <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getProcurementStatusBadgeClass(request.status)}`}>
                        {getProcurementStatusLabel(request.status)}
                    </span>
                </div>
                <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-gray-100 dark:border-slate-700 shadow-inner max-h-48 overflow-y-auto font-mono leading-relaxed">
                    {request.reason}
                </div>
                {request.rejection_reason && (
                    <div className={`rounded-xl border px-3.5 py-3 text-xs ${
                        request.status === 'returned'
                            ? 'border-orange-200 bg-orange-100/70 text-orange-800 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-200'
                            : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200'
                    }`}>
                        <div className="mb-1 font-semibold">
                            {request.status === 'returned' ? 'เหตุผลที่ตีกลับ' : 'เหตุผลที่ไม่อนุมัติ'}
                        </div>
                        <div>{request.rejection_reason}</div>
                    </div>
                )}
                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                    <span>ยอดรวมสุทธิ</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        ฿{request.amount ? formatCurrency(Number(request.amount)) : '0.00'}
                    </span>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                    {(request.status === 'pending' || request.status === 'returned') && (
                        <button
                            type="button"
                            onClick={() => startEditing(request)}
                            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                                request.status === 'returned'
                                    ? 'border-orange-200 text-orange-700 hover:bg-orange-100/70'
                                    : 'border-amber-200 text-amber-700 hover:bg-amber-50'
                            }`}
                        >
                            <Pencil className="w-4 h-4" />
                            {request.status === 'returned' ? 'แก้ไขและส่งใหม่' : 'แก้ไขก่อนพิมพ์'}
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
    );

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

        if (requestItemType === 'stock') {
            if (stockProducts.length === 0) {
                setMessage({ type: 'error', text: 'ยังไม่มีสินค้าใน stock ให้เลือก' });
                return;
            }
            const missingStockProduct = items.find((item) => !item.stockProductId);
            if (missingStockProduct) {
                setMessage({ type: 'error', text: 'กรุณาเลือกสินค้าใน stock ให้ครบทุกรายการ' });
                return;
            }
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
${items.map((item, index) => `${index + 1}. ${item.itemType === 'non_stock' ? '[NON-STOCK] ' : '[STOCK] '}${item.description} - ${item.quantity} ${item.unit} @ ฿${formatCurrency(item.pricePerUnit)} (รวม: ฿${formatCurrency((item.quantity || 0) * (item.pricePerUnit || 0))})${item.includeLink ? `\n   ลิงก์สินค้า: ${item.productLink.trim()}` : ''}`).join('\n')}

รวมเงิน: ฿${formatCurrency(subTotal)}
${includeTax ? `ภาษี 7%: ฿${formatCurrency(taxAmount)}\n` : ''}ยอดรวมสุทธิ: ฿${formatCurrency(netTotal)}`;

        setSubmitting(true);
        try {
            const isReturnedResubmission = editingRequest?.status === 'returned';

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
                setMessage({
                    type: 'success',
                    text: editingRequestId
                        ? (isReturnedResubmission ? 'แก้ไขและส่งคำขอซื้อกลับเข้าคิวจัดซื้อแล้ว' : 'อัปเดตใบเสนอซื้อเรียบร้อยแล้ว')
                        : 'ส่งคำขอซื้อเรียบร้อยแล้ว และระบบแจ้งเตือนฝ่ายจัดซื้อแล้ว',
                });
            } else {
                setMessage({ type: 'error', text: result.error || 'ไม่สามารถส่งคำขอซื้อได้' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด' });
        } finally {
            setSubmitting(false);
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
                        {editingReturnedRequest && (
                            <div
                                ref={returnedBannerRef}
                                tabIndex={-1}
                                className="rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 text-sm text-orange-900 outline-none focus:ring-2 focus:ring-orange-300 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-100"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <div className="font-semibold">กำลังแก้ไขคำขอซื้อที่ถูกตีกลับ</div>
                                        <div className="mt-1 text-xs text-orange-700 dark:text-orange-200">
                                            เลขที่ {editingReturnedRequest.request_number || '-'} ต้องแก้ไขและส่งกลับเข้าคิวจัดซื้ออีกครั้ง
                                        </div>
                                    </div>
                                    <span className="inline-flex items-center rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                                        Returned
                                    </span>
                                </div>
                                {editingReturnedRequest.rejection_reason && (
                                    <div className="mt-3 rounded-xl border border-orange-200 bg-white/80 px-4 py-3 text-xs text-orange-800 dark:border-orange-900/50 dark:bg-orange-950/40 dark:text-orange-100">
                                        <div className="mb-1 font-semibold">เหตุผลที่ตีกลับ</div>
                                        <div>{editingReturnedRequest.rejection_reason}</div>
                                    </div>
                                )}
                            </div>
                        )}

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
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_230px]">
                                    <div>
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
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ประเภทสินค้า (ทั้งใบ)</label>
                                        <select
                                            value={requestItemType}
                                            onChange={(e) => setDocumentItemType(e.target.value as PurchaseItemType)}
                                            className="h-[50px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                                        >
                                            <option value="stock">สินค้าใน stock</option>
                                            <option value="non_stock">สินค้านอก stock</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
                            <div className="overflow-x-auto">
                                <table className="min-w-[920px] w-full table-fixed text-sm text-left">
                                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
                                        <tr>
                                            <th className="w-12 px-3 py-3 text-center">ลำดับ</th>
                                            <th className="w-[44%] px-3 py-3">รายการสินค้า</th>
                                            <th className="w-[11%] px-3 py-3 text-right">จำนวน</th>
                                            <th className="w-[11%] px-3 py-3 text-center">หน่วย</th>
                                            <th className="w-[13%] px-3 py-3 text-right">ราคา/หน่วย</th>
                                            <th className="w-[13%] px-3 py-3 text-right">รวม</th>
                                            <th className="w-12 px-3 py-3 text-center">ลบ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item, index) => (
                                            <tr key={item.id} className="align-top border-b border-slate-100 bg-white transition-colors hover:bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/20 dark:hover:bg-slate-800/30">
                                                <td className="px-3 py-4 text-center text-sm font-medium text-slate-500">{index + 1}</td>
                                                <td className="px-3 py-4">
                                                    <div className="space-y-2.5 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 dark:border-slate-700 dark:bg-slate-800/50">
                                                    {item.itemType === 'stock' ? (
                                                        <div className="space-y-2">
                                                            <div
                                                                ref={openStockPickerItemId === item.id ? stockPickerRef : null}
                                                                className="relative"
                                                            >
                                                                <div className="relative">
                                                                    <FloatingSearchInput
                                                                        label="ค้นหาสินค้า"
                                                                        dense
                                                                        value={item.stockSearch || (item.stockProductId ? buildStockSearchLabel(item.stockProductId, item.description) : item.description)}
                                                                        onFocus={() => setOpenStockPickerItemId(item.id)}
                                                                        onChange={(e) => {
                                                                            setStockProductByQuery(item.id, e.target.value);
                                                                            setOpenStockPickerItemId(item.id);
                                                                        }}
                                                                        placeholder="ค้นหาสินค้า"
                                                                        required
                                                                        containerClassName="w-full"
                                                                        className="h-11 border-2 border-cyan-300 pr-10 text-sm font-medium text-slate-800 dark:border-cyan-700 dark:bg-slate-800 dark:text-slate-200"
                                                                    />
                                                                    {item.stockSearch && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setStockProductByQuery(item.id, '');
                                                                                setOpenStockPickerItemId(item.id);
                                                                            }}
                                                                            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                                                        >
                                                                            <X className="h-4 w-4" />
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                {openStockPickerItemId === item.id && (
                                                                    <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                                                                        <div className="max-h-72 overflow-y-auto">
                                                                            {getFilteredStockProducts(item.stockSearch || item.description).length > 0 ? (
                                                                                getFilteredStockProducts(item.stockSearch || item.description).map((product) => {
                                                                                    const qty = Number(product.p_count ?? 0);
                                                                                    return (
                                                                                        <button
                                                                                            key={product.p_id}
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                setStockProduct(item.id, product.p_id);
                                                                                                setOpenStockPickerItemId(null);
                                                                                            }}
                                                                                            className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-3 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/70"
                                                                                        >
                                                                                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                                                                                                <Package className="h-5 w-5" />
                                                                                            </div>
                                                                                            <div className="min-w-0 flex-1">
                                                                                                <div className="truncate text-base font-semibold text-slate-800 dark:text-slate-100">
                                                                                                    {product.p_name}
                                                                                                </div>
                                                                                                <div className="mt-1 inline-flex rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                                                                                                    รหัส: {product.p_id}
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="text-right">
                                                                                                <div className={`text-3xl font-bold leading-none ${qty > 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                                                                                                    {qty.toLocaleString('th-TH')}
                                                                                                </div>
                                                                                                <div className="text-xs text-slate-400">{product.p_unit || 'ชิ้น'}</div>
                                                                                            </div>
                                                                                        </button>
                                                                                    );
                                                                                })
                                                                            ) : (
                                                                                <div className="px-4 py-6 text-center text-sm text-slate-500">ไม่พบสินค้า</div>
                                                                            )}
                                                                        </div>
                                                                        <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-300">
                                                                            แสดง {getFilteredStockProducts(item.stockSearch || item.description).length} จาก {stockProducts.length} รายการ
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                                                {item.stockProductId && (
                                                                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                                                                        รหัส: {item.stockProductId}
                                                                    </span>
                                                                )}
                                                                {item.unit && (
                                                                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                                                                        หน่วย: {item.unit}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            value={item.description}
                                                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                                            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-cyan-400 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                                                            placeholder="ระบุชื่อสินค้า / รายละเอียด"
                                                            required
                                                        />
                                                    )}
                                                    <div className="flex items-center justify-between gap-2">
                                                        <label className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                            <input
                                                                type="checkbox"
                                                                checked={item.includeLink}
                                                                onChange={(e) => updateItem(item.id, 'includeLink', e.target.checked)}
                                                                className="rounded text-emerald-600 focus:ring-emerald-500"
                                                            />
                                                            แนบลิงก์สินค้า
                                                        </label>
                                                        <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[10px] font-semibold ${requestItemType === 'non_stock' ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'}`}>
                                                            {requestItemType === 'non_stock' ? 'NON-STOCK' : 'STOCK'}
                                                        </span>
                                                    </div>
                                                    {item.includeLink && (
                                                        <input
                                                            type="url"
                                                            value={item.productLink}
                                                            onChange={(e) => updateItem(item.id, 'productLink', e.target.value)}
                                                            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 focus:border-cyan-400 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                                                            placeholder="https://example.com/product"
                                                        />
                                                    )}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-4 align-top">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity || ''}
                                                        onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                                                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-right text-base font-semibold text-slate-800 focus:border-cyan-400 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                                                        required
                                                    />
                                                </td>
                                                <td className="px-3 py-4 align-top">
                                                    <input
                                                        type="text"
                                                        value={item.unit}
                                                        onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                                                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-center text-base font-semibold text-slate-800 focus:border-cyan-400 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                                                        placeholder="ชิ้น"
                                                        required
                                                    />
                                                </td>
                                                <td className="px-3 py-4 align-top">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={item.pricePerUnit === 0 ? '' : item.pricePerUnit}
                                                        onChange={(e) => updateItem(item.id, 'pricePerUnit', Number(e.target.value))}
                                                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-right text-base font-semibold text-slate-800 focus:border-cyan-400 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                                                        placeholder="0.00"
                                                        required
                                                    />
                                                </td>
                                                <td className="px-3 py-4 text-right">
                                                    <div className="inline-flex min-w-[96px] justify-end rounded-xl bg-emerald-50 px-3 py-2 text-base font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{formatCurrency((item.quantity || 0) * (item.pricePerUnit || 0))}</div>
                                                </td>
                                                <td className="px-3 py-4 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(item.id)}
                                                        disabled={items.length === 1}
                                                        className="rounded-lg border border-rose-200 p-2 text-rose-500 transition hover:bg-rose-50 disabled:opacity-30 dark:border-rose-500/30 dark:hover:bg-rose-500/10"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t border-dashed border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-800/50">
                                            <td colSpan={7} className="px-3 py-3.5">
                                                <button
                                                    type="button"
                                                    onClick={addItem}
                                                    className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300"
                                                >
                                                    <Plus className="w-4 h-4" /> เพิ่มรายการสินค้า
                                                </button>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="flex justify-end border-t border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 dark:border-slate-700 dark:from-slate-900/60 dark:to-slate-900/30">
                                <div className="w-full sm:w-80 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800/70">
                                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                        <span>รวมก่อนภาษี</span>
                                        <span className="font-semibold text-slate-900 dark:text-slate-200">{formatCurrency(subTotal)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
                                            <input
                                                type="checkbox"
                                                checked={includeTax}
                                                onChange={(e) => setIncludeTax(e.target.checked)}
                                                className="rounded text-emerald-600 focus:ring-emerald-500"
                                            />
                                            VAT 7%
                                        </label>
                                        <span className="font-semibold text-slate-900 dark:text-slate-200">{formatCurrency(taxAmount)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-600 text-base font-bold text-slate-900 dark:text-white">
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

                    <div className="overflow-y-auto">
                        {requests.length === 0 ? (
                            <div className="p-10 flex flex-col items-center justify-center text-center">
                                <ClipboardList className="w-12 h-12 text-gray-300 dark:text-slate-600 mb-3" />
                                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">ยังไม่มีคำขอซื้อในระบบ</div>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                {returnedRequests.length > 0 && (
                                    <div className="border-b border-orange-100 bg-orange-50/60 dark:border-orange-900/40 dark:bg-orange-950/10">
                                        <div className="flex items-center justify-between gap-3 px-5 py-3">
                                            <div>
                                                <div className="text-sm font-semibold text-orange-800 dark:text-orange-200">ต้องแก้ไข</div>
                                                <div className="text-xs text-orange-600 dark:text-orange-300">คำขอที่ถูกตีกลับและรอส่งกลับเข้าคิวจัดซื้อ</div>
                                            </div>
                                            <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-orange-500 px-2 py-1 text-[10px] font-bold text-white">
                                                {returnedRequests.length}
                                            </span>
                                        </div>
                                        <div className="divide-y divide-orange-100 dark:divide-orange-900/30">
                                            {returnedRequests.map((request) => renderRequestCard(request, 'returned'))}
                                        </div>
                                    </div>
                                )}

                                {otherRequests.length > 0 && (
                                    <div className="divide-y divide-gray-100 dark:divide-slate-700">
                                        <div className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                            รายการล่าสุด
                                        </div>
                                        {otherRequests.map((request) => (
                                <div key={request.request_id} className="p-5 hover:bg-gray-50/50 dark:hover:bg-slate-700/20 transition-colors">
                                    <div className="flex flex-col gap-3">
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="font-semibold text-emerald-700 dark:text-emerald-400 text-sm">
                                                {request.request_number}
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getProcurementStatusBadgeClass(request.status)}`}>
                                                {getProcurementStatusLabel(request.status)}
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
                                            {(request.status === 'pending' || request.status === 'returned') && (
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
                                        ))}
                                    </div>
                                )}
                            </div>
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
                                <table className="w-full table-auto text-sm [&_th.w-12]:w-auto [&_th.w-12]:whitespace-nowrap [&_th.w-24]:min-w-[6rem] [&_th.w-24]:w-auto [&_th.w-24]:whitespace-nowrap [&_th.w-32]:min-w-[8rem] [&_th.w-32]:w-auto [&_th.w-32]:whitespace-nowrap">
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
                                                    <div className="flex items-center gap-2">
                                                        <div className="font-medium">{item.description || '-'}</div>
                                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.itemType === 'non_stock' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                            {item.itemType === 'non_stock' ? 'NON-STOCK' : 'STOCK'}
                                                        </span>
                                                    </div>
                                                    {item.includeLink && item.productLink.trim() && (
                                                        <div className="mt-1 break-all text-xs text-blue-700">{item.productLink.trim()}</div>
                                                    )}
                                                </td>
                                                <td className="py-3 whitespace-nowrap text-right">{item.quantity || 0}</td>
                                                <td className="py-3 whitespace-nowrap">{item.unit || '-'}</td>
                                                <td className="py-3 whitespace-nowrap text-right">{formatCurrency(item.pricePerUnit || 0)}</td>
                                                <td className="py-3 whitespace-nowrap text-right font-medium"><div className="inline-flex min-w-[96px] justify-end rounded-xl bg-emerald-50 px-3 py-2 text-base font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{formatCurrency((item.quantity || 0) * (item.pricePerUnit || 0))}</div></td>
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

