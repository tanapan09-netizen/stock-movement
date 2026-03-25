'use client';

import { useState, useEffect } from 'react';
import { getPettyCashFundStatus, replenishFund, updateFundLimit } from '@/actions/pettyCashFundActions';

interface FundStatus {
    id: number;
    fund_name: string;
    max_limit: string;
    current_balance: string;
    warning_threshold: string;
}

interface FundDisplayProps {
    canReplenishFund: boolean;
    canUpdateFundLimit: boolean;
}

export default function PettyCashFundDisplay({
    canReplenishFund,
    canUpdateFundLimit,
}: FundDisplayProps) {
    const [fund, setFund] = useState<FundStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [isReplenishing, setIsReplenishing] = useState(false);
    const [replenishAmount, setReplenishAmount] = useState('');
    const [showReplenishModal, setShowReplenishModal] = useState(false);

    const [showLimitModal, setShowLimitModal] = useState(false);
    const [limitAmount, setLimitAmount] = useState('');
    const [isUpdatingLimit, setIsUpdatingLimit] = useState(false);

    useEffect(() => {
        loadFund();
    }, []);

    const loadFund = async () => {
        setLoading(true);
        const res = await getPettyCashFundStatus();
        if (res.success && res.data) {
            const data = res.data as any;
            setFund({
                id: data.id,
                fund_name: data.fund_name,
                max_limit: String(data.max_limit),
                current_balance: String(data.current_balance),
                warning_threshold: String(data.warning_threshold)
            });
        }
        setLoading(false);
    };

    const handleReplenish = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = Number(replenishAmount);
        if (amount <= 0) return alert('Invalid amount');

        setIsReplenishing(true);
        const res = await replenishFund(amount);
        if (res.success) {
            setShowReplenishModal(false);
            setReplenishAmount('');
            loadFund();
        } else {
            alert(res.error || 'Failed to replenish');
        }
        setIsReplenishing(false);
    };

    const handleUpdateLimit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newLimit = Number(limitAmount);
        if (newLimit <= 0) return alert('ระบุจำนวนเงินที่ไม่ถูกต้อง');

        setIsUpdatingLimit(true);
        const res = await updateFundLimit(newLimit);
        if (res.success) {
            setShowLimitModal(false);
            setLimitAmount('');
            loadFund();
        } else {
            alert(res.error || 'บันทึกวงเงินล้มเหลว');
        }
        setIsUpdatingLimit(false);
    };

    if (loading) return <div className="animate-pulse h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>;
    if (!fund) return null;

    const balance = Number(fund.current_balance);
    const max = Number(fund.max_limit);
    const threshold = Number(fund.warning_threshold);

    const isLow = balance <= threshold;
    const progressPercent = Math.min(100, Math.max(0, (balance / max) * 100));

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6 hover:shadow-md transition-shadow relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full opacity-50 blur-2xl pointer-events-none"></div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-6 relative z-10">
                <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-xl ${isLow ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}>
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                            {fund.fund_name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            ระบบจัดการเงินสดย่อยส่วนกลาง
                        </p>
                    </div>
                </div>

                <div className="text-left md:text-right bg-gray-50 py-3 px-5 rounded-xl border border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">ยอดคงเหลือปัจจุบัน</p>
                    <p className={`text-4xl font-black tracking-tight ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                        ฿{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            {/* Progress Bar Container */}
            <div className="relative pt-2 pb-4">
                <div className="flex mb-3 items-center justify-between text-sm">
                    <div className="font-medium text-gray-700 flex items-center gap-2">
                        วงเงินอนุมัติ: <span className="font-bold">฿{max.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        {canUpdateFundLimit && (
                            <button
                                onClick={() => {
                                    setLimitAmount(max.toString());
                                    setShowLimitModal(true);
                                }}
                                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1 rounded-md transition-colors"
                                title="ตั้งวงเงิน"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </button>
                        )}
                    </div>
                    <div className={`font-semibold px-3 py-1 rounded-full text-xs ${isLow ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {isLow ? 'สถานะ: เงินใกล้หมด' : 'สถานะ: ปกติ'}
                    </div>
                </div>
                <div className="overflow-hidden h-3 text-xs flex rounded-full bg-gray-100 border border-gray-200 shadow-inner">
                    <div style={{ width: `${progressPercent}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-1000 ease-out ${isLow ? 'bg-gradient-to-r from-red-500 to-red-400' : 'bg-gradient-to-r from-blue-600 to-blue-400'}`}></div>
                </div>
            </div>

            {canReplenishFund && (
                <div className="mt-4 pt-5 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={() => setShowReplenishModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-emerald-500/20 transition-all hover:-translate-y-0.5"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                        ตั้งเบิกชดเชยเงินสดย่อย (Replenish)
                    </button>
                </div>
            )}

            {/* Replenish Modal */}
            {showReplenishModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowReplenishModal(false)}></div>

                    {/* Modal Content */}
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative z-10 animate-fade-in border border-gray-100">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        </div>

                        <h3 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">ตั้งเบิกชดเชย (Replenish)</h3>
                        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                            เติมเงินเข้าคลังเงินสดย่อยส่วนกลาง เพื่อให้มีเงินหมุนเวียนพร้อมใช้งาน (แนะนำให้เติมจนเต็มวงเงิน <strong>฿{max.toLocaleString()}</strong>)
                        </p>

                        <form onSubmit={handleReplenish}>
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">ระบุยอดเงินที่ต้องการเติม (THB)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <span className="text-gray-500 font-medium">฿</span>
                                    </div>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        step="0.01"
                                        value={replenishAmount}
                                        onChange={(e) => setReplenishAmount(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-gray-900 font-semibold text-lg transition-all"
                                        placeholder={`ยอดแนะนำ: ${max - balance}`}
                                    />
                                </div>
                                <div className="mt-3 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setReplenishAmount((max - balance).toString())}
                                        className="text-sm text-emerald-600 hover:text-emerald-700 font-medium bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                                        เติมเต็มวงเงิน (฿{(max - balance).toLocaleString()})
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowReplenishModal(false)}
                                    className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-semibold transition-colors"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={isReplenishing}
                                    className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm font-semibold shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                >
                                    {isReplenishing ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            กำลังดำเนินการ...
                                        </>
                                    ) : (
                                        'ยืนยันการเติมเงิน'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Adjust Limit Modal */}
            {showLimitModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowLimitModal(false)}></div>

                    {/* Modal Content */}
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative z-10 animate-fade-in border border-gray-100">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        </div>

                        <h3 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">ตั้งวงเงินอนุมัติ</h3>
                        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                            เปลี่ยนวงเงินสูงสุดของคลังเงินสดย่อยหลัก
                        </p>

                        <form onSubmit={handleUpdateLimit}>
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">ระบุวงเงินใหม่ (THB)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <span className="text-gray-500 font-medium">฿</span>
                                    </div>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        step="0.01"
                                        value={limitAmount}
                                        onChange={(e) => setLimitAmount(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-gray-900 font-semibold text-lg transition-all"
                                        placeholder={`เช่น 20000`}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowLimitModal(false)}
                                    className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-semibold transition-colors"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdatingLimit}
                                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-semibold shadow-lg shadow-blue-600/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                >
                                    {isUpdatingLimit ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            กำลังบันทึก...
                                        </>
                                    ) : (
                                        'บันทึกวงเงิน'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
