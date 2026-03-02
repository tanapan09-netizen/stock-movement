'use client';

import React, { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { getPettyCashRequestById, savePettyCashSignatures } from '@/actions/pettyCashActions';
import { getSystemSettings } from '@/actions/settingActions';
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
    const [companyName, setCompanyName] = useState<string>("บริษัท ตัวอย่าง จำกัด");

    // Canvas References for 2 Roles based on new layout reference
    const payeeSigRef = useRef<SignatureCanvas>(null);
    const payerSigRef = useRef<SignatureCanvas>(null);

    const [savedPayeeSig, setSavedPayeeSig] = useState<string | null>(null);
    const [savedPayerSig, setSavedPayerSig] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        Promise.all([
            getPettyCashRequestById(requestId),
            getSystemSettings()
        ]).then(([pettyCashRes, settingsRes]) => {
            if (pettyCashRes.success && pettyCashRes.data) {
                setData(pettyCashRes.data);
                setSavedPayeeSig(pettyCashRes.data.payee_signature || null);
                setSavedPayerSig(pettyCashRes.data.payer_signature || null);
            }
            if (settingsRes.success && settingsRes.data) {
                if (settingsRes.data.company_name) {
                    setCompanyName(settingsRes.data.company_name);
                }
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
            showToast('บันทึกลายเซ็นลงฐานข้อมูลเรียบร้อยแล้ว', 'success');
        } else {
            showToast(res.error || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
        }
        setIsSaving(false);
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500 text-lg">กำลังโหลดข้อมูล...</div>;
    if (!data) return <div className="min-h-screen flex items-center justify-center text-red-500 text-lg">ไม่พบข้อมูลคำขอเบิกเงินสดย่อย</div>;

    // Filter valid lines
    const descriptionLines = data.purpose.split('\n').filter((l: string) => l.trim() !== '' && !l.includes('฿0.00'));

    return (
        <div className="min-h-screen bg-gray-100 py-10 print:bg-white print:py-0 text-black font-sans">
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
            <div id="print-area" className="bg-white w-full max-w-4xl mx-auto min-h-[297mm] px-16 py-12 shadow-xl print:shadow-none print:p-0 print:m-0 text-[16px]">

                {/* Header section matching the minimalist photo */}
                <div className="text-center mb-8">
                    <h1 className="text-[26px] font-bold text-black mb-2 tracking-wide">{companyName}</h1>
                    <h2 className="text-[22px] font-bold mb-4">ใบเบิกเงินสดย่อย</h2>
                    <div className="flex justify-end pr-16">
                        <span className="font-semibold text-lg">วันที่</span>
                        <span className="border-b border-dotted border-black px-4 inline-block w-40 text-center">
                            {new Date(data.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                        </span>
                    </div>
                </div>

                {/* Minimalist 3-Column Table */}
                <div className="border-[1.5px] border-black mt-10">
                    <table className="w-full text-center border-collapse">
                        <thead>
                            <tr className="border-b-[1.5px] border-black">
                                <th className="py-3 px-2 border-r-[1.5px] border-black w-24 font-normal text-lg">ลำดับที่</th>
                                <th className="py-3 px-4 border-r-[1.5px] border-black font-normal text-lg">รายการ</th>
                                <th className="py-3 px-4 w-48 font-normal text-lg">จำนวนเงิน</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="align-top border-b border-black h-[400px]">
                                <td className="py-4 border-r-[1.5px] border-black font-medium text-center">
                                    {descriptionLines.map((_: any, idx: number) => (
                                        <div key={idx} className="mb-2 leading-[1.8]">{idx + 1}</div>
                                    ))}
                                </td>

                                <td className="py-4 px-6 border-r-[1.5px] border-black text-left">
                                    {descriptionLines.map((line: string, idx: number) => (
                                        <div key={idx} className="mb-2 leading-[1.8]">
                                            {line.split(/(\*\*.*?\*\*)/g).map((part, i) => {
                                                if (part.startsWith('**') && part.endsWith('**')) {
                                                    return <span key={i} className="font-semibold">{part.slice(2, -2)}</span>;
                                                }
                                                return <span key={i}>{part}</span>;
                                            })}
                                        </div>
                                    ))}
                                </td>

                                <td className="py-4 px-4 text-right">
                                    {descriptionLines.map((_: any, idx: number) => {
                                        // Divide equally for aesthetic rows if single breakdown, otherwise just show on first line
                                        const val = ((data.dispensed_amount || data.requested_amount) / (descriptionLines.length || 1)).toLocaleString('th-TH', { minimumFractionDigits: 2 });
                                        return <div key={idx} className="mb-2 leading-[1.8]">{val}</div>;
                                    })}
                                </td>
                            </tr>

                            {/* Simple Totals Row */}
                            <tr className="font-medium text-lg border-b-[1.5px] border-black bg-white">
                                <td className="border-r-[1.5px] border-black py-4"></td>
                                <td className="border-r-[1.5px] border-black py-4 px-6 text-center font-bold">รวมเป็นเงิน</td>
                                <td className="text-right px-4 py-4 font-bold">
                                    {(data.dispensed_amount || data.requested_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>

                        </tbody>
                    </table>
                </div>

                {/* 2 Bottom Signatures - Down Left & Down Right */}
                <div className="flex justify-between items-start mt-20 px-8 text-lg">

                    <div className="flex flex-col relative w-64 items-center">
                        <div className="flex items-end mb-2 w-full gap-2">
                            <span>ลงชื่อ</span>
                            <div className="flex-1 border-b border-dotted border-black relative h-10 group flex justify-center items-end pb-1">
                                {savedPayeeSig ? (
                                    <>
                                        <img src={savedPayeeSig} className="absolute bottom-1 max-h-16 max-w-full object-contain" />
                                        <button onClick={() => setSavedPayeeSig(null)} className="absolute -top-4 -right-4 text-xs bg-red-500 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">ลบ</button>
                                    </>
                                ) : (
                                    <div className="absolute bottom-0 w-full h-16 bg-blue-50/50 print:bg-transparent">
                                        <SignatureCanvas ref={payeeSigRef} penColor="black" canvasProps={{ className: 'w-full h-full cursor-crosshair' }} />
                                        <button onClick={() => payeeSigRef.current?.clear()} className="absolute -top-4 -right-4 text-[10px] text-gray-500 hover:text-red-500 print:hidden">เคลียร์</button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="text-center w-full mt-2">ผู้เบิกเงิน</div>
                    </div>

                    <div className="flex flex-col relative w-64 items-center">
                        <div className="flex items-end mb-2 w-full gap-2">
                            <span>ลงชื่อ</span>
                            <div className="flex-1 border-b border-dotted border-black relative h-10 group flex justify-center items-end pb-1">
                                {savedPayerSig ? (
                                    <>
                                        <img src={savedPayerSig} className="absolute bottom-1 max-h-16 max-w-full object-contain" />
                                        <button onClick={() => setSavedPayerSig(null)} className="absolute -top-4 -right-4 text-xs bg-red-500 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">ลบ</button>
                                    </>
                                ) : (
                                    <div className="absolute bottom-0 w-full h-16 bg-blue-50/50 print:bg-transparent">
                                        <SignatureCanvas ref={payerSigRef} penColor="black" canvasProps={{ className: 'w-full h-full cursor-crosshair' }} />
                                        <button onClick={() => payerSigRef.current?.clear()} className="absolute -top-4 -right-4 text-[10px] text-gray-500 hover:text-red-500 print:hidden">เคลียร์</button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="text-center w-full mt-2">ผู้จ่ายเงิน</div>
                    </div>

                </div>

            </div>

            {/* Print CSS */}
            <style jsx global>{`
                @media print {
                    @page { margin: 15mm; }
                    body {
                        background-color: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
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
                        padding: 0;
                        box-shadow: none;
                        border: none;
                        border-radius: 0;
                    }
                }
            `}</style>
        </div>
    );
}
