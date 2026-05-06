'use client';

import React, { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { getPettyCashRequestById, savePettyCashSignatures } from '@/actions/pettyCashActions';
import { getSystemSettings } from '@/actions/settingActions';
import { useToast } from '@/components/ToastProvider';
import { getPettyCashSignatureRoleLabel, type PettyCashSignatureRole } from '@/lib/pettyCash';
import { Printer, Save, ArrowLeft, PenTool, X } from 'lucide-react';
import Link from 'next/link';

interface PettyCashPrintClientProps {
    requestId: number;
}

export default function PettyCashPrintClient({ requestId }: PettyCashPrintClientProps) {
    const { showToast } = useToast();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [companyName, setCompanyName] = useState<string>("บริษัท ตัวอย่าง จำกัด");

    const [savedPayeeSig, setSavedPayeeSig] = useState<string | null>(null);
    const [savedPayerSig, setSavedPayerSig] = useState<string | null>(null);
    const [payeeDirty, setPayeeDirty] = useState(false);
    const [payerDirty, setPayerDirty] = useState(false);

    const [activeSignatureRole, setActiveSignatureRole] = useState<PettyCashSignatureRole | null>(null);
    const signatureModalRef = useRef<SignatureCanvas>(null);
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

    const handleConfirmSignature = () => {
        if (!signatureModalRef.current || signatureModalRef.current.isEmpty()) {
            showToast('กรุณาเซ็นชื่อก่อนกดยืนยัน', 'warning');
            return;
        }
        const dataUrl = signatureModalRef.current.getTrimmedCanvas().toDataURL('image/png');
        if (activeSignatureRole === 'payee') {
            setSavedPayeeSig(dataUrl);
            setPayeeDirty(true);
        } else if (activeSignatureRole === 'payer') {
            setSavedPayerSig(dataUrl);
            setPayerDirty(true);
        }
        setActiveSignatureRole(null);
    };

    const handleDeleteSignature = (role: PettyCashSignatureRole) => {
        switch (role) {
            case 'payee':
                setSavedPayeeSig(null);
                setPayeeDirty(true);
                break;
            case 'payer':
                setSavedPayerSig(null);
                setPayerDirty(true);
                break;
        }
    };

    const handleSaveSignatures = async () => {
        setIsSaving(true);

        const newPayee = payeeDirty ? (savedPayeeSig || "") : undefined;
        const newPayer = payerDirty ? (savedPayerSig || "") : undefined;

        if (newPayee === undefined && newPayer === undefined) {
            showToast('ไม่มีการเปลี่ยนแปลงลายเซ็น', 'warning');
            setIsSaving(false);
            return;
        }

        const res = await savePettyCashSignatures(requestId, newPayee, newPayer);
        if (res.success) {
            setPayeeDirty(false);
            setPayerDirty(false);
            showToast('บันทึกลายเซ็นลงฐานข้อมูลเรียบร้อยแล้ว', 'success');
        } else {
            showToast(res.error || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
        }
        setIsSaving(false);
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500 text-lg">กำลังโหลดข้อมูล...</div>;
    if (!data) return <div className="min-h-screen flex items-center justify-center text-red-500 text-lg">ไม่พบข้อมูลคำขอเบิกเงินสดย่อย</div>;

    let department = '';
    let payee = '';
    let description = '';
    const items: { id: number, name: string, amount: string }[] = [];
    const summaries: { label: string, value: string }[] = [];
    let notes = '';

    if (data.purpose) {
        const lines = data.purpose.split('\n');
        let currentSection = 'header';

        lines.forEach((line: string) => {
            if (!line.trim()) return;

            if (line.includes('**รายการค่าใช้จ่าย:**')) {
                currentSection = 'items';
                return;
            } else if (line.includes('**ยอดรวม:**') || line.includes('**ยอดสุทธิ:**')) {
                currentSection = 'summary';
            } else if (line.includes('**หมายเหตุ:**')) {
                currentSection = 'notes';
            }

            if (currentSection === 'header') {
                if (line.startsWith('**แผนก/โครงการ:**')) department = line.replace('**แผนก/โครงการ:**', '').trim();
                else if (line.startsWith('**ผู้รับเงิน:**')) payee = line.replace('**ผู้รับเงิน:**', '').trim();
                else if (line.startsWith('**รายละเอียด:**')) description = line.replace('**รายละเอียด:**', '').trim();
            } else if (currentSection === 'items') {
                if (!line.includes('**รายการค่าใช้จ่าย:**')) {
                    const bhtIndex = line.indexOf('฿');
                    if (bhtIndex !== -1) {
                        const namePart = line.substring(0, bhtIndex).replace(/^\d+\.\s+/, '').replace(/\s*-\s*$/, '').trim();
                        const amountPartWithRest = line.substring(bhtIndex + 1);
                        const numMatch = amountPartWithRest.match(/^([\d,.]+)(.*)/);
                        if (numMatch) {
                            items.push({
                                id: items.length + 1,
                                name: namePart + (numMatch[2] ? ` ${numMatch[2].trim()}` : ''),
                                amount: numMatch[1]
                            });
                        } else {
                            items.push({ id: items.length + 1, name: line.replace(/^\d+\.\s+/, ''), amount: '' });
                        }
                    } else {
                        items.push({ id: items.length + 1, name: line.replace(/^\d+\.\s+/, ''), amount: '' });
                    }
                }
            } else if (currentSection === 'summary') {
                if (!line.includes('**ยอดรวม:**') && !line.includes('**ยอดสุทธิ:**')) {
                    const plainLine = line.replace(/\*\*/g, '').trim();
                    const match = plainLine.match(/^(.*?):\s*฿?(-?[\d,.]+)/);
                    if (match) {
                        const valFloat = parseFloat(match[2].replace(/,/g, ''));
                        if (Math.abs(valFloat) > 0) {
                            const formattedValue = valFloat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            summaries.push({ label: match[1].trim(), value: formattedValue });
                        }
                    }
                }
            } else if (currentSection === 'notes') {
                notes += line.replace('**หมายเหตุ:**', '').trim() + ' ';
            }
        });
    }

    if (items.length === 0 && data.purpose) {
        items.push({
            id: 1,
            name: data.purpose,
            amount: (data.dispensed_amount || data.requested_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })
        });
    }

    return (
        <div className="min-h-screen bg-gray-50 md:bg-gray-100 py-4 md:py-10 print:bg-white print:py-0 text-black font-sans">
            {/* Signature Modal */}
            {activeSignatureRole && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 print:hidden">
                    <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-800">
                                เซ็นชื่อ ({getPettyCashSignatureRoleLabel(activeSignatureRole)})
                            </h3>
                            <button onClick={() => setActiveSignatureRole(null)} className="text-gray-500 hover:text-gray-800 p-2">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="bg-white p-4">
                            <div className="border-[2px] border-dashed border-gray-300 rounded-xl bg-blue-50/20 overflow-hidden h-64 md:h-80 w-full relative">
                                <SignatureCanvas
                                    ref={signatureModalRef}
                                    penColor="black"
                                    canvasProps={{ className: 'w-full h-full cursor-crosshair touch-none absolute inset-0' }}
                                />
                            </div>
                            <p className="text-center text-sm text-gray-500 mt-3">ใช้นิ้วหรือเมาส์วาดลายเซ็นของคุณลงในกรอบ</p>
                        </div>
                        <div className="p-4 border-t flex justify-end gap-3 bg-gray-50">
                            <button onClick={() => signatureModalRef.current?.clear()} className="px-5 py-2.5 border rounded-xl text-gray-700 bg-white hover:bg-gray-50 font-medium transition-colors shadow-sm">ล้างลายเซ็น</button>
                            <button onClick={handleConfirmSignature} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium transition-colors shadow-sm">ยืนยันลายเซ็น</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Bar - Hidden in Print mode */}
            <div className="w-full max-w-4xl mx-auto bg-white shadow-sm p-4 rounded-xl mb-6 flex flex-wrap md:flex-nowrap items-center justify-between gap-4 print:hidden">
                <Link href="/petty-cash" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg font-medium transition-colors text-sm md:text-base">
                    <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                    กลับ
                </Link>
                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
                    <button
                        onClick={handleSaveSignatures}
                        disabled={isSaving || (!payeeDirty && !payerDirty)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-4 md:px-5 py-2 rounded-lg hover:bg-blue-700 shadow-md transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm md:text-base"
                    >
                        <Save className="w-4 h-4 md:w-5 md:h-5" />
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึกลายเซ็น'}
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 md:px-6 py-2 rounded-lg hover:bg-emerald-700 shadow-md transition-all font-medium whitespace-nowrap text-sm md:text-base"
                    >
                        <Printer className="w-4 h-4 md:w-5 md:h-5" />
                        พิมพ์
                    </button>
                </div>
            </div>

            {/* Print A4 Container */}
            <div id="print-area" className="bg-white w-full max-w-4xl mx-auto min-h-[297mm] px-4 py-6 sm:px-8 sm:py-8 md:px-16 md:py-12 shadow-xl print:shadow-none print:p-0 print:m-0 text-[14px] sm:text-[16px] xl:rounded-xl">

                {/* Header section matching the minimalist photo */}
                <div className="text-center mb-6 md:mb-8">
                    <h1 className="text-xl sm:text-[26px] font-bold text-black mb-1 sm:mb-2 tracking-wide break-words">{companyName}</h1>
                    <h2 className="text-lg sm:text-[22px] font-bold mb-4">ใบเบิกเงินสดย่อย</h2>
                    <div className="flex justify-end pr-0 md:pr-16">
                        <span className="font-semibold text-base sm:text-lg">วันที่</span>
                        <span className="border-b border-dotted border-black px-2 sm:px-4 inline-block w-32 sm:w-40 text-center">
                            {new Date(data.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                        </span>
                    </div>
                </div>

                {/* Extracted Metadata Headers */}
                <div className="flex flex-col gap-1 sm:gap-2 mb-4 px-1 sm:px-2 text-sm sm:text-[17px]">
                    {payee && (
                        <div className="flex">
                            <span className="font-semibold w-24 sm:w-32 shrink-0">ผู้รับเงิน :</span>
                            <span className="break-words">{payee}</span>
                        </div>
                    )}
                    {department && (
                        <div className="flex">
                            <span className="font-semibold w-24 sm:w-32 shrink-0">แผนก :</span>
                            <span className="break-words">{department}</span>
                        </div>
                    )}
                    {description && (
                        <div className="flex">
                            <span className="font-semibold w-24 sm:w-32 shrink-0">รายละเอียด :</span>
                            <span className="break-words font-medium">{description}</span>
                        </div>
                    )}
                </div>

                {/* Minimalist 3-Column Table */}
                <div className="border-[1.5px] border-black mt-4 overflow-hidden">
                    <table className="w-full text-center border-collapse">
                        <thead>
                            <tr className="border-b-[1.5px] border-black bg-gray-50/50">
                                <th className="py-2 sm:py-3 px-1 sm:px-2 border-r-[1.5px] border-black w-14 sm:w-24 font-normal text-xs sm:text-lg">ลำดับที่</th>
                                <th className="py-2 sm:py-3 px-2 sm:px-4 border-r-[1.5px] border-black font-normal text-sm sm:text-lg">รายการ</th>
                                <th className="py-2 sm:py-3 px-2 sm:px-4 w-28 sm:w-48 font-normal text-sm sm:text-lg">จำนวนเงิน</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => (
                                <tr key={item.id} className="align-top leading-relaxed">
                                    <td className="py-2 sm:py-3 border-r-[1.5px] border-black font-medium text-center text-xs sm:text-base">{idx + 1}</td>
                                    <td className="py-2 sm:py-3 px-2 sm:px-6 border-r-[1.5px] border-black text-left text-sm sm:text-base break-words">{item.name}</td>
                                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-sm sm:text-base">{item.amount || '-'}</td>
                                </tr>
                            ))}

                            {/* Filler Space for Layout Stretching */}
                            <tr className="align-top h-[150px] sm:h-[250px]">
                                <td className="border-r-[1.5px] border-black text-center"></td>
                                <td className="px-2 sm:px-6 border-r-[1.5px] border-black text-left"></td>
                                <td className="px-2 sm:px-4 text-right"></td>
                            </tr>

                            {/* Summaries Rows */}
                            {summaries.map((s, idx) => (
                                <tr key={`summary-${idx}`} className="align-top leading-relaxed text-gray-600 text-xs sm:text-sm">
                                    <td className="py-1 sm:py-2 border-r-[1.5px] border-black text-center"></td>
                                    <td className="py-1 sm:py-2 px-2 sm:px-6 border-r-[1.5px] border-black text-left">{s.label}</td>
                                    <td className="py-1 sm:py-2 px-2 sm:px-4 text-right">{s.value}</td>
                                </tr>
                            ))}

                            {/* Note Row if exists */}
                            {notes && (
                                <tr className="align-top">
                                    <td className="py-1 sm:py-2 border-r-[1.5px] border-black text-center"></td>
                                    <td className="py-2 sm:py-3 px-2 sm:px-6 border-r-[1.5px] border-black text-left text-xs sm:text-sm text-gray-600 italic">
                                        หมายเหตุ: {notes}
                                    </td>
                                    <td className="py-1 sm:py-2 px-2 sm:px-4 text-right"></td>
                                </tr>
                            )}

                            {/* Bottom border spacer before totals */}
                            <tr className="border-b border-black">
                                <td className="py-1 border-r-[1.5px] border-black"></td>
                                <td className="py-1 border-r-[1.5px] border-black"></td>
                                <td className="py-1"></td>
                            </tr>

                            {/* Simple Totals Row */}
                            <tr className="font-medium text-[15px] sm:text-lg border-b-[1.5px] border-black bg-white">
                                <td className="border-r-[1.5px] border-black py-3 sm:py-4"></td>
                                <td className="border-r-[1.5px] border-black py-3 sm:py-4 px-2 sm:px-6 text-center font-bold">รวมเป็นเงิน</td>
                                <td className="text-right px-2 sm:px-4 py-3 sm:py-4 font-bold">
                                    {(data.dispensed_amount || data.requested_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* 2 Bottom Signatures - Down Left & Down Right */}
                <div className="flex justify-between items-start mt-12 sm:mt-20 px-2 sm:px-8 text-sm sm:text-lg">

                    <div className="flex flex-col relative w-32 sm:w-64 items-center">
                        <div className="flex items-end mb-2 w-full gap-1 sm:gap-2">
                            <span>ลงชื่อ</span>
                            <div className="flex-1 border-b border-dotted border-black relative h-10 sm:h-12 group flex justify-center items-end pb-1 w-full shrink">
                                {savedPayeeSig ? (
                                    <>
                                        <img src={savedPayeeSig} className="absolute bottom-1 max-h-12 sm:max-h-16 max-w-full object-contain" />
                                        <button onClick={() => handleDeleteSignature('payee')} className="absolute -top-4 -right-2 text-[10px] sm:text-xs bg-red-500 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">ลบ</button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setActiveSignatureRole('payee')}
                                        className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-blue-50/50 hover:bg-blue-100/60 transition-colors print:bg-transparent rounded-t ring-1 ring-inset ring-blue-100/50 print:ring-0 print:hidden text-gray-500"
                                    >
                                        <div className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-blue-600 bg-white/80 px-1.5 py-0.5 rounded shadow-sm">
                                            <PenTool className="w-3 h-3" />
                                            <span className="hidden sm:inline">แตะเพื่อ</span>เซ็น
                                        </div>
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="text-center w-full mt-1 sm:mt-2">ผู้เบิกเงิน</div>
                    </div>

                    <div className="flex flex-col relative w-32 sm:w-64 items-center">
                        <div className="flex items-end mb-2 w-full gap-1 sm:gap-2">
                            <span>ลงชื่อ</span>
                            <div className="flex-1 border-b border-dotted border-black relative h-10 sm:h-12 group flex justify-center items-end pb-1 w-full shrink">
                                {savedPayerSig ? (
                                    <>
                                        <img src={savedPayerSig} className="absolute bottom-1 max-h-12 sm:max-h-16 max-w-full object-contain" />
                                        <button onClick={() => handleDeleteSignature('payer')} className="absolute -top-4 -right-2 text-[10px] sm:text-xs bg-red-500 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">ลบ</button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setActiveSignatureRole('payer')}
                                        className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-blue-50/50 hover:bg-blue-100/60 transition-colors print:bg-transparent rounded-t ring-1 ring-inset ring-blue-100/50 print:ring-0 print:hidden text-gray-500"
                                    >
                                        <div className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-blue-600 bg-white/80 px-1.5 py-0.5 rounded shadow-sm">
                                            <PenTool className="w-3 h-3" />
                                            <span className="hidden sm:inline">แตะเพื่อ</span>เซ็น
                                        </div>
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="text-center w-full mt-1 sm:mt-2">ผู้จ่ายเงิน</div>
                    </div>

                </div>

            </div>

            {/* Print CSS & Custom Scrollbar Hiding */}
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
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;  /* IE and Edge */
                    scrollbar-width: none;  /* Firefox */
                }
            `}</style>
        </div>
    );
}
