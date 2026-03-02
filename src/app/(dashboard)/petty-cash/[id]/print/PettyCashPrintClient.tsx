'use client';

import React, { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { getPettyCashRequestById, savePettyCashSignatures } from '@/actions/pettyCashActions';
import { useToast } from '@/components/ToastProvider';
import { Printer, Save, RefreshCcw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface PettyCashPrintClientProps {
    requestId: number;
}

export default function PettyCashPrintClient({ requestId }: PettyCashPrintClientProps) {
    const { showToast } = useToast();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Canvas References
    const payeeSigRef = useRef<SignatureCanvas>(null);
    const payerSigRef = useRef<SignatureCanvas>(null);

    const [savedPayeeSig, setSavedPayeeSig] = useState<string | null>(null);
    const [savedPayerSig, setSavedPayerSig] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        getPettyCashRequestById(requestId).then((res) => {
            if (res.success && res.data) {
                setData(res.data);
                setSavedPayeeSig(res.data.payee_signature || null);
                setSavedPayerSig(res.data.payer_signature || null);
            }
            setLoading(false);
        });
    }, [requestId]);

    const handleSaveSignatures = async () => {
        setIsSaving(true);
        let newPayeeSig: string | undefined = undefined;
        let newPayerSig: string | undefined = undefined;

        if (payeeSigRef.current && !payeeSigRef.current.isEmpty()) {
            newPayeeSig = payeeSigRef.current.getTrimmedCanvas().toDataURL('image/png');
        }
        if (payerSigRef.current && !payerSigRef.current.isEmpty()) {
            newPayerSig = payerSigRef.current.getTrimmedCanvas().toDataURL('image/png');
        }

        if (!newPayeeSig && !newPayerSig) {
            showToast('ไม่มีลายเซ็นใหม่ให้บันทึก', 'warning');
            setIsSaving(false);
            return;
        }

        const res = await savePettyCashSignatures(requestId, newPayeeSig, newPayerSig);
        if (res.success) {
            if (newPayeeSig) setSavedPayeeSig(newPayeeSig);
            if (newPayerSig) setSavedPayerSig(newPayerSig);
            showToast('บันทึกลายเซ็นเรียบร้อยแล้ว', 'success');
        } else {
            showToast(res.error || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
        }
        setIsSaving(false);
    };

    const clearPayeeCanvas = () => { payeeSigRef.current?.clear(); };
    const clearPayerCanvas = () => { payerSigRef.current?.clear(); };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500 text-lg">กำลังโหลดข้อมูล...</div>;
    if (!data) return <div className="min-h-screen flex items-center justify-center text-red-500 text-lg">ไม่พบข้อมูลคำขอเบิกเงินสดย่อย</div>;

    return (
        <div className="min-h-screen bg-gray-100 py-10 print:bg-white print:py-0 text-black">
            {/* Action Bar - Hidden in Print mode */}
            <div className="w-full max-w-4xl mx-auto bg-white shadow-sm p-4 rounded-xl mb-6 flex items-center justify-between print:hidden">
                <Link href="/petty-cash" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg font-medium transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                    กลับหน้าเดิม
                </Link>
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
            <div id="print-area" className="bg-white w-full max-w-4xl mx-auto min-h-[297mm] p-10 shadow-xl border border-gray-200 rounded-sm print:shadow-none print:border-none print:p-6 print:m-0">

                {/* Document Header */}
                <div className="flex justify-between items-start mb-8 border-b-2 border-gray-800 pb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">ใบสำคัญจ่ายเงินสดย่อย</h1>
                        <p className="text-sm text-gray-500 mt-2 tracking-widest uppercase">Petty Cash Voucher</p>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center justify-end gap-2 mb-1">
                            <span className="font-bold text-gray-600">เลขที่:</span>
                            <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded font-mono text-lg border border-gray-200">{data.request_number}</span>
                        </div>
                        <div className="flex items-center justify-end gap-2 text-sm text-gray-600">
                            <span className="font-semibold">วันที่:</span>
                            <span>{new Date(data.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                    </div>
                </div>

                {/* Sender/Receiver Info Row */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg">
                        <p className="text-sm font-semibold text-gray-500 mb-1">จ่ายให้แก่ (Payee)</p>
                        <p className="text-lg font-bold text-gray-800 border-b border-dotted border-gray-300 pb-1">{data.requested_by}</p>
                    </div>
                    <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg">
                        <p className="text-sm font-semibold text-gray-500 mb-1">แผนก / หมวดหมู่ (Category)</p>
                        <p className="text-lg font-bold text-gray-800 border-b border-dotted border-gray-300 pb-1">{data.category || '-'}</p>
                    </div>
                </div>

                {/* Details Table */}
                <div className="mb-10 rounded-lg border-2 border-gray-800 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-800 text-white">
                            <tr>
                                <th className="py-4 px-6 font-semibold w-16 text-center border-r border-gray-700">#</th>
                                <th className="py-4 px-6 font-semibold border-r border-gray-700">รายการ (Description)</th>
                                <th className="py-4 px-6 font-semibold w-48 text-right">จำนวนเงิน (Amount)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            <tr className="border-b border-gray-200">
                                <td className="py-6 px-6 text-center text-gray-600 border-r border-gray-200 font-mono">1</td>
                                <td className="py-2 px-6 text-gray-800 font-medium border-r border-gray-200">
                                    {data.purpose.split('\n').map((line: string, idx: number) => {
                                        // Hide any line that is exactly "฿0.00" value for tax or WHT
                                        if (line.includes('฿0.00')) return null;

                                        const parts = line.split(/(\*\*.*?\*\*)/g);
                                        return (
                                            <div key={idx} className={`${line.trim() === '' ? 'h-1' : 'min-h-[1.25rem]'} ${line.startsWith('**รายการค่าใช้จ่าย:**') ? 'mt-3 mb-1 text-gray-800' : ''}`}>
                                                {parts.map((part, i) => {
                                                    if (part.startsWith('**') && part.endsWith('**')) {
                                                        return <strong key={i} className="text-gray-900">{part.slice(2, -2)}</strong>;
                                                    }
                                                    return <span key={i}>{part}</span>;
                                                })}
                                            </div>
                                        );
                                    })}
                                </td>
                                <td className="py-6 px-6 text-right font-mono text-lg font-bold text-gray-800">
                                    {(data.dispensed_amount || data.requested_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>

                            {/* Empty padding rows */}
                            <tr className="border-b border-gray-200"><td className="py-5 px-6 border-r border-gray-200"></td><td className="py-5 px-6 border-r border-gray-200"></td><td></td></tr>
                            <tr className="border-b border-gray-200"><td className="py-5 px-6 border-r border-gray-200"></td><td className="py-5 px-6 border-r border-gray-200"></td><td></td></tr>

                            {/* Totals */}
                            <tr className="bg-gray-100">
                                <td colSpan={2} className="py-5 px-6 text-right font-bold text-gray-800 border-r border-gray-200 uppercase tracking-widest text-sm">
                                    รวมเงิน (Total Amount)
                                </td>
                                <td className="py-4 px-6 text-right font-mono text-xl font-bold text-blue-700 border-t-2 border-gray-800">
                                    ฿ {(data.dispensed_amount || data.requested_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>

                            {data.actual_spent != null && data.change_returned != null && (
                                <tr className="bg-gray-50">
                                    <td colSpan={2} className="py-3 px-6 text-right font-medium text-gray-600 border-r border-gray-200 text-sm">
                                        เงินทอน (Change Returned)
                                    </td>
                                    <td className="py-3 px-6 text-right font-mono font-bold text-emerald-600 border-t border-gray-300">
                                        + ฿ {Number(data.change_returned).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Notes */}
                {data.notes && (
                    <div className="mb-12 border border-gray-300 p-4 rounded-lg bg-gray-50 italic text-gray-600">
                        <span className="font-bold mr-2 not-italic text-gray-800">หมายเหตุ:</span> {data.notes}
                    </div>
                )}

                {/* Signatures Area */}
                <div className="mt-16 pt-8 border-t-2 border-dashed border-gray-300 grid grid-cols-2 gap-12">

                    {/* Payee Signature (ผู้รับเงิน) */}
                    <div className="flex flex-col items-center">
                        <p className="text-sm font-semibold text-gray-500 mb-4 tracking-wide">ผู้รับเงิน (Receiver)</p>

                        {savedPayeeSig ? (
                            <div className="border border-gray-200 rounded-lg p-2 bg-white w-full max-w-[280px] h-[120px] flex items-center justify-center relative group">
                                <img src={savedPayeeSig} alt="Payee Signature" className="max-w-full max-h-full object-contain" />
                                <button
                                    onClick={() => setSavedPayeeSig(null)}
                                    className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity print:hidden"
                                    title="ลบลายเซ็นเพื่อเซ็นใหม่"
                                >
                                    <RefreshCcw className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="w-full max-w-[280px] border-2 border-gray-300 rounded-lg bg-gray-50 relative print:bg-white print:border-gray-800">
                                <SignatureCanvas
                                    ref={payeeSigRef}
                                    penColor="blue"
                                    canvasProps={{ className: 'w-full h-[120px] rounded-lg cursor-crosshair' }}
                                />
                                <div className="absolute bottom-2 right-2 flex gap-2 print:hidden">
                                    <button onClick={clearPayeeCanvas} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded shadow hover:bg-gray-300 transition-colors">
                                        ล้าง
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="text-center w-full max-w-[280px] mt-4">
                            <div className="border-b border-gray-800 mb-2"></div>
                            <p className="text-gray-800 font-medium">({data.requested_by})</p>
                            <p className="text-gray-500 text-sm mt-1">วันที่ _______/_______/_______</p>
                        </div>
                    </div>

                    {/* Payer/Accounting Signature (ผู้จ่ายเงิน) */}
                    <div className="flex flex-col items-center">
                        <p className="text-sm font-semibold text-gray-500 mb-4 tracking-wide">ผู้จ่ายเงิน (Payer)</p>

                        {savedPayerSig ? (
                            <div className="border border-gray-200 rounded-lg p-2 bg-white w-full max-w-[280px] h-[120px] flex items-center justify-center relative group">
                                <img src={savedPayerSig} alt="Payer Signature" className="max-w-full max-h-full object-contain" />
                                <button
                                    onClick={() => setSavedPayerSig(null)}
                                    className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity print:hidden"
                                    title="ลบลายเซ็นเพื่อเซ็นใหม่"
                                >
                                    <RefreshCcw className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="w-full max-w-[280px] border-2 border-gray-300 rounded-lg bg-gray-50 relative print:bg-white print:border-gray-800">
                                <SignatureCanvas
                                    ref={payerSigRef}
                                    penColor="blue"
                                    canvasProps={{ className: 'w-full h-[120px] rounded-lg cursor-crosshair' }}
                                />
                                <div className="absolute bottom-2 right-2 flex gap-2 print:hidden">
                                    <button onClick={clearPayerCanvas} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded shadow hover:bg-gray-300 transition-colors">
                                        ล้าง
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="text-center w-full max-w-[280px] mt-4">
                            <div className="border-b border-gray-800 mb-2"></div>
                            <p className="text-gray-800 font-medium">({data.dispensed_by || 'เจ้าหน้าที่บัญชี'})</p>
                            <p className="text-gray-500 text-sm mt-1">วันที่ _______/_______/_______</p>
                        </div>
                    </div>

                </div>
            </div>

            {/* Print CSS */}
            <style jsx global>{`
                @media print {
                    @page { margin: 10mm; }
                    body * {
                        visibility: hidden;
                    }
                    #print-area, #print-area * {
                        visibility: visible;
                    }
                    #print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 20px;
                        box-shadow: none;
                        border: none;
                        border-radius: 0;
                    }
                }
            `}</style>
        </div>
    );
}
