'use client';

import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { savePettyCashSignatures } from '@/actions/pettyCashActions';
import { useToast } from '@/components/ToastProvider';
import { Printer, Save, RefreshCcw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface PettyCashPrintClientProps {
    data: any;
    currentUserRole: string;
}

export default function PettyCashPrintClient({ data, currentUserRole }: PettyCashPrintClientProps) {
    const { showToast } = useToast();

    // Canvas References for logic interaction
    const payeeSigRef = useRef<SignatureCanvas>(null);
    const payerSigRef = useRef<SignatureCanvas>(null);

    // Track state of signatures to change layout or UI display
    const [savedPayeeSig, setSavedPayeeSig] = useState<string | null>(data.payee_signature || null);
    const [savedPayerSig, setSavedPayerSig] = useState<string | null>(data.payer_signature || null);

    const [isSaving, setIsSaving] = useState(false);

    // Save signatures
    const handleSaveSignatures = async () => {
        setIsSaving(true);
        let newPayeeSig = undefined;
        let newPayerSig = undefined;

        // Check if Payee box was drawn on
        if (payeeSigRef.current && !payeeSigRef.current.isEmpty()) {
            newPayeeSig = payeeSigRef.current.getTrimmedCanvas().toDataURL('image/png');
        }

        // Check if Payer box was drawn on
        if (payerSigRef.current && !payerSigRef.current.isEmpty()) {
            newPayerSig = payerSigRef.current.getTrimmedCanvas().toDataURL('image/png');
        }

        if (!newPayeeSig && !newPayerSig) {
            showToast('ไม่มีลายเซ็นใหม่ให้บันทึก', 'warning');
            setIsSaving(false);
            return;
        }

        const res = await savePettyCashSignatures(data.id, newPayeeSig, newPayerSig);

        if (res.success) {
            if (newPayeeSig) setSavedPayeeSig(newPayeeSig);
            if (newPayerSig) setSavedPayerSig(newPayerSig);
            showToast('บันทึกลายเซ็นเรียบร้อยแล้ว', 'success');
        } else {
            showToast(res.error || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
        }
        setIsSaving(false);
    };

    const clearPayeeCanvas = () => {
        if (payeeSigRef.current) payeeSigRef.current.clear();
    };

    const clearPayerCanvas = () => {
        if (payerSigRef.current) payerSigRef.current.clear();
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 print:bg-white print:py-0">
            {/* Action Bar - Hidden in Print mode */}
            <div className="w-full max-w-4xl bg-white shadow-sm p-4 rounded-xl mb-6 flex items-center justify-between print:hidden">
                <div className="flex gap-4">
                    <Link href="/petty-cash" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg font-medium transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                        กลับหน้าเดิม
                    </Link>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleSaveSignatures}
                        disabled={isSaving}
                        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 shadow-md transition-all font-medium disabled:opacity-50"
                    >
                        <Save className="w-5 h-5" />
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึกลายเซ็น'}
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 shadow-md transition-all font-medium"
                    >
                        <Printer className="w-5 h-5" />
                        พิมพ์เอกสาร
                    </button>
                </div>
            </div>

            {/* Print A4 Container */}
            <div className="bg-white w-full max-w-[210mm] min-h-[297mm] p-12 shadow-xl border border-gray-200 rounded-sm print:shadow-none print:border-none print:p-0 print:m-0 mx-auto relative content-layout text-black">

                {/* Document Header */}
                <div className="flex justify-between items-start mb-8 border-b-2 border-slate-800 pb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">ใบสำคัญจ่ายเงินสดย่อย</h1>
                        <p className="text-sm text-slate-500 mt-2 tracking-widest uppercase">Petty Cash Voucher</p>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center justify-end gap-2 mb-1">
                            <span className="font-bold text-slate-600">เลขที่เอกสาร:</span>
                            <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded font-mono text-lg border border-slate-200">{data.request_number}</span>
                        </div>
                        <div className="flex items-center justify-end gap-2 text-sm text-slate-600">
                            <span className="font-semibold">วันที่:</span>
                            <span>{new Date(data.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                    </div>
                </div>

                {/* Sender/Receiver Info Row */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg">
                        <p className="text-sm font-semibold text-slate-500 mb-1">จ่ายให้แก่ (Payee)</p>
                        <p className="text-lg font-bold text-slate-800 border-b border-dotted border-slate-300 pb-1">{data.requested_by}</p>
                    </div>
                    <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg">
                        <p className="text-sm font-semibold text-slate-500 mb-1">แผนก / ผู้ขอเบิก (Department)</p>
                        <p className="text-lg font-bold text-slate-800 border-b border-dotted border-slate-300 pb-1">{data.category || '-'}</p>
                    </div>
                </div>

                {/* Details Table */}
                <div className="mb-10 rounded-lg border-2 border-slate-800 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-800 text-white">
                            <tr>
                                <th className="py-4 px-6 font-semibold w-16 text-center border-r border-slate-700">#</th>
                                <th className="py-4 px-6 font-semibold border-r border-slate-700">รายการ (Description)</th>
                                <th className="py-4 px-6 font-semibold w-48 text-right">จำนวนเงิน (Amount)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            <tr className="border-b border-slate-200">
                                <td className="py-6 px-6 text-center text-slate-600 border-r border-slate-200 font-mono">1</td>
                                <td className="py-6 px-6 text-slate-800 font-medium border-r border-slate-200">
                                    {data.purpose}
                                </td>
                                <td className="py-6 px-6 text-right font-mono text-lg font-bold text-slate-800">
                                    {data.dispensed_amount ? data.dispensed_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : data.requested_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>

                            {/* Empty padding rows for layout aesthetics */}
                            <tr className="border-b border-slate-200"><td className="py-5 px-6 border-r border-slate-200"></td><td className="py-5 px-6 border-r border-slate-200"></td><td></td></tr>
                            <tr className="border-b border-slate-200"><td className="py-5 px-6 border-r border-slate-200"></td><td className="py-5 px-6 border-r border-slate-200"></td><td></td></tr>

                            {/* Totals Row */}
                            <tr className="bg-slate-100">
                                <td colSpan={2} className="py-5 px-6 text-right font-bold text-slate-800 border-r border-slate-200 uppercase tracking-widest text-sm">
                                    รวมเงิน (Total Amount)
                                </td>
                                <td className="py-4 px-6 text-right font-mono text-xl font-bold text-blue-700 border-t-2 border-slate-800">
                                    ฿ {data.dispensed_amount ? data.dispensed_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : data.requested_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>

                            {data.actual_spent && data.change_returned !== null && (
                                <tr className="bg-slate-50">
                                    <td colSpan={2} className="py-3 px-6 text-right font-medium text-slate-600 border-r border-slate-200 text-sm">
                                        เงินทอน (Change Returned)
                                    </td>
                                    <td className="py-3 px-6 text-right font-mono text-md font-bold text-emerald-600 border-t border-slate-300">
                                        + ฿ {data.change_returned.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Additional Notes Box */}
                {data.notes && (
                    <div className="mb-12 border border-slate-300 p-4 rounded-lg bg-slate-50 italic text-slate-600">
                        <span className="font-bold mr-2 not-italic text-slate-800">หมายเหตุ:</span> {data.notes}
                    </div>
                )}

                {/* Signatures Area */}
                <div className="mt-16 pt-8 border-t-2 border-dashed border-slate-300 grid grid-cols-2 gap-12">

                    {/* Payee Signature (ผู้รับเงิน) */}
                    <div className="flex flex-col items-center">
                        <p className="text-sm font-semibold text-slate-500 mb-4 tracking-wide">ผู้รับเงิน (Receiver)</p>

                        {savedPayeeSig ? (
                            <div className="border border-slate-200 rounded-lg p-2 bg-white w-full max-w-[280px] h-[120px] flex items-center justify-center relative group">
                                <img src={savedPayeeSig} alt="Payee Signature" className="max-w-full max-h-full object-contain" />
                                <button
                                    onClick={() => setSavedPayeeSig(null)}
                                    className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity print:hidden"
                                    title="ลบลายเซ็น"
                                >
                                    <RefreshCcw className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="w-full max-w-[280px] border-2 border-slate-300 rounded-lg bg-slate-50 relative print:border-solid print:border-gray-800">
                                <SignatureCanvas
                                    ref={payeeSigRef}
                                    penColor="blue"
                                    canvasProps={{ className: 'w-full h-[120px] rounded-lg cursor-crosshair' }}
                                />
                                <div className="absolute bottom-2 right-2 flex gap-2 print:hidden">
                                    <button onClick={clearPayeeCanvas} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded shadow hover:bg-gray-300 transition-colors">
                                        ล้าง (Clear)
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="text-center w-full max-w-[280px] mt-4">
                            <div className="border-b border-slate-800 mb-2"></div>
                            <p className="text-slate-800 font-medium">({data.requested_by})</p>
                            <p className="text-slate-500 text-sm mt-1">วันที่ _______/_______/_______</p>
                        </div>
                    </div>

                    {/* Payer/Accounting Signature (ผู้จ่ายเงิน) */}
                    <div className="flex flex-col items-center">
                        <p className="text-sm font-semibold text-slate-500 mb-4 tracking-wide">ผู้จ่ายเงิน (Payer)</p>

                        {savedPayerSig ? (
                            <div className="border border-slate-200 rounded-lg p-2 bg-white w-full max-w-[280px] h-[120px] flex items-center justify-center relative group">
                                <img src={savedPayerSig} alt="Payer Signature" className="max-w-full max-h-full object-contain" />
                                <button
                                    onClick={() => setSavedPayerSig(null)}
                                    className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity print:hidden"
                                    title="ลบลายเซ็น"
                                >
                                    <RefreshCcw className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="w-full max-w-[280px] border-2 border-slate-300 rounded-lg bg-slate-50 relative print:border-solid print:border-gray-800">
                                <SignatureCanvas
                                    ref={payerSigRef}
                                    penColor="blue"
                                    canvasProps={{ className: 'w-full h-[120px] rounded-lg cursor-crosshair' }}
                                />
                                <div className="absolute bottom-2 right-2 flex gap-2 print:hidden">
                                    <button onClick={clearPayerCanvas} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded shadow hover:bg-gray-300 transition-colors">
                                        ล้าง (Clear)
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="text-center w-full max-w-[280px] mt-4">
                            <div className="border-b border-slate-800 mb-2"></div>
                            <p className="text-slate-800 font-medium">({data.dispensed_by || 'เจ้าหน้าที่บัญชี'})</p>
                            <p className="text-slate-500 text-sm mt-1">วันที่ _______/_______/_______</p>
                        </div>
                    </div>

                </div>

            </div> {/* End of A4 Print View */}
        </div>
    );
}
