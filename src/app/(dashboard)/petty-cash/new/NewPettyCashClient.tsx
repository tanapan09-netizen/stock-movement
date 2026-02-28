'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createPettyCashRequest } from '@/actions/pettyCashActions';
import { useToast } from '@/components/ToastProvider';
import { Plus, Trash2, ArrowLeft, Save, Eye, X, Upload, FileText, Paperclip } from 'lucide-react';

interface LineItem {
    id: string;
    description: string;
    amount: number;
    remark: string;
    vatExempt: boolean;
}

const WHT_RATES = [
    { value: 0, label: 'ไม่หัก' },
    { value: 1, label: '1% - ค่าขนส่ง' },
    { value: 2, label: '2% - ค่าโฆษณา' },
    { value: 3, label: '3% - ค่าบริการ / ค่าจ้างทำของ' },
    { value: 5, label: '5% - ค่าเช่า' },
];

export default function NewPettyCashClient() {
    const router = useRouter();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('Basic Data');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Header
    const [header, setHeader] = useState({
        documentNo: 'AUTO',
        documentDate: new Date().toISOString().split('T')[0],
        department: '',
        payee: '',
        description: '',
    });

    // Line Items
    const [lineItems, setLineItems] = useState<LineItem[]>([
        { id: Date.now().toString(), description: '', amount: 0, remark: '', vatExempt: false }
    ]);

    // WHT
    const [whtRate, setWhtRate] = useState(0);
    const [whtPayeeName, setWhtPayeeName] = useState('');
    const [whtPayeeTaxId, setWhtPayeeTaxId] = useState('');
    const [whtPayeeAddress, setWhtPayeeAddress] = useState('');

    // Notes & Attachment
    const [notes, setNotes] = useState('');
    const [attachments, setAttachments] = useState<FileList | null>(null);

    // --- Calculations ---
    const calculations = useMemo(() => {
        const subtotal = lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const vatableAmount = lineItems
            .filter(item => !item.vatExempt)
            .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const vatExemptAmount = subtotal - vatableAmount;
        const vatBase = vatableAmount / 1.07; // ราคาก่อน VAT (ถ้ารวม VAT แล้ว)
        const vatAmount = vatableAmount - vatBase;
        const whtBase = subtotal;
        const whtAmount = (whtBase * whtRate) / 100;
        const netTotal = subtotal - whtAmount;

        return { subtotal, vatableAmount, vatExemptAmount, vatBase, vatAmount, whtBase, whtAmount, netTotal };
    }, [lineItems, whtRate]);

    const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2 });

    // --- Handlers ---
    const handleAddItem = () => {
        setLineItems([
            ...lineItems,
            { id: Date.now().toString(), description: '', amount: 0, remark: '', vatExempt: false }
        ]);
    };

    const handleRemoveItem = (id: string) => {
        setLineItems(lineItems.filter(item => item.id !== id));
    };

    const handleItemChange = (id: string, field: keyof LineItem, value: any) => {
        setLineItems(lineItems.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (calculations.subtotal <= 0) {
            showToast('รายการเบิกต้องมียอดรวมมากกว่า 0 บาท', 'error');
            return;
        }
        if (lineItems.some(i => !i.description.trim())) {
            showToast('กรุณาระบุชื่อค่าใช้จ่ายให้ครบถ้วน', 'error');
            return;
        }

        setIsSubmitting(true);

        const combinedPurpose = `**แผนก/โครงการ:** ${header.department}
**ผู้รับเงิน:** ${header.payee}
**รายละเอียด:** ${header.description}

**รายการค่าใช้จ่าย:**
${lineItems.map((item, idx) => `${idx + 1}. ${item.description} - ฿${fmt(Number(item.amount))}${item.vatExempt ? ' (ไม่รวม VAT)' : ''}${item.remark ? ` [${item.remark}]` : ''}`).join('\n')}

**ยอดรวม:** ฿${fmt(calculations.subtotal)}
**VAT (7%):** ฿${fmt(calculations.vatAmount)}
**WHT (${whtRate}%):** ฿${fmt(calculations.whtAmount)}
**ยอดสุทธิ:** ฿${fmt(calculations.netTotal)}${notes ? `\n\n**หมายเหตุ:** ${notes}` : ''}`;

        const fd = new FormData();
        fd.append('purpose', combinedPurpose);
        fd.append('requested_amount', calculations.netTotal.toString());

        const res = await createPettyCashRequest(fd);
        if (res.success) {
            showToast('สร้างคำขอเบิกเงินสดย่อยสำเร็จ', 'success');
            router.push('/petty-cash');
            router.refresh();
        } else {
            showToast(res.error || 'ส่งคำขอล้มเหลว', 'error');
            setIsSubmitting(false);
        }
    };

    // --- Tab Content Renderers ---
    const renderBasicData = () => (
        <div className="space-y-8">
            {/* Header Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <label className="sm:w-1/3 text-sm font-medium text-gray-700">เลขที่เอกสาร <span className="text-red-500">*</span></label>
                        <input type="text" disabled value={header.documentNo} className="w-full sm:w-2/3 bg-gray-50 border border-gray-300 rounded-md p-2 text-sm text-gray-500" />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <label className="sm:w-1/3 text-sm font-medium text-gray-700">แผนก/โครงการ <span className="text-red-500">*</span></label>
                        <input type="text" value={header.department} onChange={e => setHeader({ ...header, department: e.target.value })} className="w-full sm:w-2/3 border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500" placeholder="เช่น บริหาร, IT..." />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <label className="sm:w-1/3 text-sm font-medium text-gray-700 mt-2">รายละเอียด</label>
                        <textarea rows={3} value={header.description} onChange={e => setHeader({ ...header, description: e.target.value })} className="w-full sm:w-2/3 border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500 resize-none"></textarea>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <label className="sm:w-1/3 text-sm font-medium text-gray-700">วันที่เอกสาร <span className="text-red-500">*</span></label>
                        <input type="date" value={header.documentDate} onChange={e => setHeader({ ...header, documentDate: e.target.value })} className="w-full sm:w-2/3 border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <label className="sm:w-1/3 text-sm font-medium text-gray-700">ผู้รับเงิน <span className="text-red-500">*</span></label>
                        <input type="text" value={header.payee} onChange={e => setHeader({ ...header, payee: e.target.value })} className="w-full sm:w-2/3 border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                </div>
            </div>

            {/* Line Items Table */}
            <div className="pt-6 border-t border-gray-200">
                <div className="flex justify-between items-end mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">รายการค่าใช้จ่าย</h3>
                    <button type="button" onClick={handleAddItem} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50 flex items-center gap-1 font-medium shadow-sm transition-colors">
                        <Plus className="w-4 h-4 text-blue-600" /> แทรกค่าใช้จ่าย
                    </button>
                </div>
                <div className="overflow-x-auto border border-gray-200 rounded-md">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 font-medium w-12 text-center">No.</th>
                                <th className="px-4 py-3 font-medium">ชื่อค่าใช้จ่าย <span className="text-red-500">*</span></th>
                                <th className="px-4 py-3 font-medium w-48 text-right">จำนวนเงิน <span className="text-red-500">*</span></th>
                                <th className="px-4 py-3 font-medium w-64">หมายเหตุ</th>
                                <th className="px-4 py-3 font-medium w-24 text-center">ไม่คิด VAT</th>
                                <th className="px-4 py-3 font-medium w-16 text-center"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {lineItems.length === 0 ? (
                                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">กรุณากดปุ่ม &quot;แทรกค่าใช้จ่าย&quot; อย่างน้อย 1 รายการ</td></tr>
                            ) : (
                                lineItems.map((item, index) => (
                                    <tr key={item.id} className="bg-white hover:bg-gray-50 group">
                                        <td className="px-4 py-2 text-center text-gray-400">{index + 1}</td>
                                        <td className="px-4 py-2">
                                            <input type="text" value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} placeholder="ระบุชื่อรายการ..." className="w-full border-gray-300 rounded px-2 py-1.5 focus:ring-blue-500 focus:border-blue-500" />
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="relative">
                                                <input type="number" min="0" step="0.01" value={item.amount || ''} onChange={e => handleItemChange(item.id, 'amount', parseFloat(e.target.value))} className="w-full border-gray-300 rounded px-2 py-1.5 pl-6 text-right focus:ring-blue-500 focus:border-blue-500" />
                                                <span className="absolute left-2 top-1.5 text-gray-400">฿</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">
                                            <input type="text" value={item.remark} onChange={e => handleItemChange(item.id, 'remark', e.target.value)} className="w-full border-gray-300 rounded px-2 py-1.5 focus:ring-blue-500 focus:border-blue-500" />
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <input type="checkbox" checked={item.vatExempt} onChange={e => handleItemChange(item.id, 'vatExempt', e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer" />
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <button type="button" onClick={() => handleRemoveItem(item.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t border-gray-200">
                            <tr>
                                <td colSpan={2} className="px-4 py-3 text-right font-medium text-gray-700">รวมเงิน :</td>
                                <td className="px-4 py-3 text-right font-bold text-gray-900 bg-white border-x border-gray-200">{fmt(calculations.subtotal)}</td>
                                <td colSpan={3}></td>
                            </tr>
                            <tr>
                                <td colSpan={2} className="px-4 py-2 text-right text-gray-500 border-t border-gray-200">ฐานภาษี (VAT 7%) :</td>
                                <td className="px-4 py-2 text-right text-gray-700 bg-white border-x border-gray-200">{fmt(calculations.vatBase)}</td>
                                <td colSpan={3} className="border-t border-gray-200"></td>
                            </tr>
                            <tr>
                                <td colSpan={2} className="px-4 py-2 text-right text-gray-500 border-t border-gray-200">ภาษีมูลค่าเพิ่ม :</td>
                                <td className="px-4 py-2 text-right text-gray-700 bg-white border-x border-gray-200">{fmt(calculations.vatAmount)}</td>
                                <td colSpan={3} className="border-t border-gray-200"></td>
                            </tr>
                            {whtRate > 0 && (
                                <tr>
                                    <td colSpan={2} className="px-4 py-2 text-right text-red-600 border-t border-gray-200">หัก ณ ที่จ่าย ({whtRate}%) :</td>
                                    <td className="px-4 py-2 text-right text-red-600 bg-white border-x border-gray-200">-{fmt(calculations.whtAmount)}</td>
                                    <td colSpan={3} className="border-t border-gray-200"></td>
                                </tr>
                            )}
                            <tr>
                                <td colSpan={2} className="px-4 py-2 text-right font-medium text-blue-800 bg-blue-50 border-t border-blue-100">จำนวนเงินทั้งสิ้น :</td>
                                <td className="px-4 py-2 text-right font-bold text-blue-800 bg-blue-50 border-x border-t border-blue-100 text-lg">฿{fmt(calculations.netTotal)}</td>
                                <td colSpan={3} className="bg-blue-50 border-t border-blue-100"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderVAT = () => (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center"><span className="text-emerald-600 font-bold text-sm">7%</span></div>
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">ภาษีมูลค่าเพิ่ม (VAT)</h3>
                    <p className="text-sm text-gray-500">คำนวณอัตโนมัติจากรายการค่าใช้จ่ายในแท็บ Basic Data</p>
                </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-emerald-800">
                <strong>หมายเหตุ:</strong> รายการที่ติ๊ก &quot;ไม่คิด VAT&quot; ในแท็บ Basic Data จะไม่ถูกนำมาคำนวณภาษี
            </div>

            {/* VAT Summary Table */}
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 border-b">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium">รายการ</th>
                            <th className="px-4 py-3 text-right font-medium w-48">จำนวนเงิน</th>
                            <th className="px-4 py-3 text-center font-medium w-32">สถานะ VAT</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {lineItems.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-gray-700">{idx + 1}. {item.description || <span className="text-gray-400 italic">ยังไม่ระบุ</span>}</td>
                                <td className="px-4 py-3 text-right font-medium">฿{fmt(Number(item.amount) || 0)}</td>
                                <td className="px-4 py-3 text-center">
                                    {item.vatExempt
                                        ? <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">ยกเว้น VAT</span>
                                        : <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700">รวม VAT 7%</span>
                                    }
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* VAT Calculation Summary */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b font-medium text-gray-700 text-sm">สรุปการคำนวณ VAT</div>
                <div className="p-4 space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">ยอดรวมทั้งหมด</span><span className="font-medium">฿{fmt(calculations.subtotal)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">ยอดที่ยกเว้น VAT</span><span className="font-medium text-gray-500">฿{fmt(calculations.vatExemptAmount)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">ยอดที่รวม VAT แล้ว</span><span className="font-medium">฿{fmt(calculations.vatableAmount)}</span></div>
                    <hr />
                    <div className="flex justify-between"><span className="text-gray-600">ราคาก่อน VAT (ฐานภาษี)</span><span className="font-semibold">฿{fmt(calculations.vatBase)}</span></div>
                    <div className="flex justify-between text-emerald-700 font-semibold text-base"><span>ภาษีมูลค่าเพิ่ม (7%)</span><span>฿{fmt(calculations.vatAmount)}</span></div>
                </div>
            </div>
        </div>
    );

    const renderWHT = () => (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center"><span className="text-orange-600 font-bold text-sm">WHT</span></div>
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">ภาษีหัก ณ ที่จ่าย (WHT)</h3>
                    <p className="text-sm text-gray-500">เลือกอัตราภาษีหัก ณ ที่จ่ายที่ต้องการ</p>
                </div>
            </div>

            {/* WHT Rate Selection */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">อัตราภาษีหัก ณ ที่จ่าย</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {WHT_RATES.map(rate => (
                            <button
                                key={rate.value}
                                type="button"
                                onClick={() => setWhtRate(rate.value)}
                                className={`p-3 border rounded-lg text-left transition-all text-sm ${whtRate === rate.value
                                    ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200 text-orange-800'
                                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                                    }`}
                            >
                                <div className="font-semibold">{rate.value}%</div>
                                <div className="text-xs mt-0.5 opacity-75">{rate.label}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* WHT Payee Info */}
                {whtRate > 0 && (
                    <div className="pt-5 border-t border-gray-200 space-y-4">
                        <h4 className="text-sm font-semibold text-gray-700">ข้อมูลผู้ถูกหักภาษี (สำหรับใบ 50 ทวิ)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">ชื่อผู้ถูกหัก</label>
                                <input type="text" value={whtPayeeName} onChange={e => setWhtPayeeName(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-orange-500 focus:border-orange-500" placeholder="ชื่อบุคคล/บริษัท" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">เลขประจำตัวผู้เสียภาษี</label>
                                <input type="text" value={whtPayeeTaxId} onChange={e => setWhtPayeeTaxId(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-orange-500 focus:border-orange-500" placeholder="13 หลัก" maxLength={13} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-500 mb-1">ที่อยู่</label>
                                <textarea rows={2} value={whtPayeeAddress} onChange={e => setWhtPayeeAddress(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-orange-500 focus:border-orange-500 resize-none" placeholder="ที่อยู่ผู้ถูกหักภาษี" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* WHT Calculation Summary */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b font-medium text-gray-700 text-sm">สรุปการคำนวณภาษีหัก ณ ที่จ่าย</div>
                <div className="p-4 space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">ยอดก่อนหัก</span><span className="font-medium">฿{fmt(calculations.whtBase)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">อัตราหัก ณ ที่จ่าย</span><span className="font-medium">{whtRate}%</span></div>
                    <hr />
                    <div className="flex justify-between text-orange-700 font-semibold text-base">
                        <span>ภาษีหัก ณ ที่จ่าย</span>
                        <span>{whtRate > 0 ? `-฿${fmt(calculations.whtAmount)}` : '฿0.00'}</span>
                    </div>
                    <div className="flex justify-between text-blue-800 font-bold text-lg pt-2 border-t">
                        <span>ยอดจ่ายสุทธิ</span>
                        <span>฿{fmt(calculations.netTotal)}</span>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderNoteAttachment = () => (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center"><Paperclip className="w-5 h-5 text-indigo-600" /></div>
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">Note & Attachment</h3>
                    <p className="text-sm text-gray-500">บันทึกหมายเหตุเพิ่มเติมและแนบเอกสาร</p>
                </div>
            </div>

            {/* Notes */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><FileText className="w-4 h-4" /> หมายเหตุเพิ่มเติม</h4>
                <textarea
                    rows={5}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                    placeholder="ระบุหมายเหตุ เงื่อนไข หรือข้อความอื่นๆ ที่ต้องการแจ้งผู้อนุมัติ..."
                />
            </div>

            {/* Attachments */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Upload className="w-4 h-4" /> แนบเอกสาร</h4>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors">
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-1">ลากไฟล์มาวางที่นี่ หรือกดเลือกไฟล์</p>
                    <p className="text-xs text-gray-400 mb-4">รองรับ: JPG, PNG, PDF (ไม่เกิน 5MB ต่อไฟล์)</p>
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-indigo-700 transition-colors">
                        <Paperclip className="w-4 h-4" /> เลือกไฟล์
                        <input
                            type="file"
                            multiple
                            accept="image/*,.pdf"
                            onChange={e => setAttachments(e.target.files)}
                            className="hidden"
                        />
                    </label>
                </div>
                {attachments && attachments.length > 0 && (
                    <div className="space-y-2 pt-2">
                        <p className="text-xs font-medium text-gray-500">ไฟล์ที่เลือกแล้ว ({attachments.length} ไฟล์):</p>
                        {Array.from(attachments).map((f, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-md px-3 py-2">
                                <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                                <span className="truncate">{f.name}</span>
                                <span className="text-xs text-gray-400 shrink-0">({(f.size / 1024).toFixed(1)} KB)</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const renderPostGL = () => (
        <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-gray-400 text-xl font-bold">GL</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Post GL (General Ledger)</h3>
            <p className="text-gray-500 max-w-sm">
                การลงบัญชี GL ต้องมีการตั้งค่าผังบัญชีก่อน ฟีเจอร์นี้จะเปิดใช้งานเมื่อระบบพร้อม
            </p>
            <button onClick={() => setActiveTab('Basic Data')} className="mt-6 px-4 py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-md transition-colors">
                กลับไปหน้า Basic Data
            </button>
        </div>
    );

    const renderTabContent = () => {
        switch (activeTab) {
            case 'Basic Data': return renderBasicData();
            case 'VAT': return renderVAT();
            case 'WHT': return renderWHT();
            case 'Post GL': return renderPostGL();
            case 'Note & Attachment': return renderNoteAttachment();
            default: return renderBasicData();
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b border-gray-200 pb-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push('/petty-cash')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800">New Petty Cash Payment</h1>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button type="button" className="flex-1 md:flex-none px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2 text-sm font-medium transition-colors">
                        <Eye className="w-4 h-4" /> Preview
                    </button>
                    <button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 md:flex-none px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 flex items-center justify-center gap-2 text-sm font-medium transition-colors disabled:opacity-50">
                        <Save className="w-4 h-4" /> Save
                    </button>
                    <button onClick={() => router.push('/petty-cash')} className="flex-1 md:flex-none px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center justify-center gap-2 text-sm font-medium transition-colors">
                        <X className="w-4 h-4" /> Close
                    </button>
                </div>
            </div>

            {/* Main Form Area */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-gray-200 overflow-x-auto">
                    {['Basic Data', 'VAT', 'WHT', 'Post GL', 'Note & Attachment'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab
                                ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/30'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <div className="p-6">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
}
