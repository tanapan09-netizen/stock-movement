'use client';

import { useState, useEffect } from 'react';
import { getPettyCashFundStatus, replenishFund } from '@/actions/pettyCashFundActions';

interface FundStatus {
    id: number;
    fund_name: string;
    max_limit: string;
    current_balance: string;
    warning_threshold: string;
}

interface FundDisplayProps {
    isAdminOrAccounting: boolean;
}

export default function PettyCashFundDisplay({ isAdminOrAccounting }: FundDisplayProps) {
    const [fund, setFund] = useState<FundStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [isReplenishing, setIsReplenishing] = useState(false);
    const [replenishAmount, setReplenishAmount] = useState('');
    const [showReplenishModal, setShowReplenishModal] = useState(false);

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

    if (loading) return <div className="animate-pulse h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>;
    if (!fund) return null;

    const balance = Number(fund.current_balance);
    const max = Number(fund.max_limit);
    const threshold = Number(fund.warning_threshold);

    const isLow = balance <= threshold;
    const progressPercent = Math.min(100, Math.max(0, (balance / max) * 100));

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5 mb-6 hover:-translate-y-1 transition-transform">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        {fund.fund_name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        ระบบจัดการเงินสดย่อยส่วนกลาง
                    </p>
                </div>

                <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">ยอดคงเหลือปัจจุบัน</p>
                    <p className={`text-3xl font-black ${isLow ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                        ฿{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                    <div>
                        <span className={`text-xs font-semibold inline-block py-1 uppercase rounded-full ${isLow ? 'text-red-600' : 'text-blue-600'}`}>
                            {isLow ? 'เงินใกล้หมด' : 'สถานะปกติ'}
                        </span>
                    </div>
                    <div className="text-right">
                        <span className="text-xs font-semibold inline-block text-gray-600 dark:text-gray-400">
                            วงเงินอนุมัติ ฿{max.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
                    <div style={{ width: `${progressPercent}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${isLow ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                </div>
            </div>

            {isAdminOrAccounting && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                    <button
                        onClick={() => setShowReplenishModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md text-sm font-medium transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                        ตั้งเบิกชดเชย (Replenish)
                    </button>
                </div>
            )}

            {/* Replenish Modal */}
            {showReplenishModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full p-6 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">ตั้งเบิกชดเชย (Replenish Fund)</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            เติมเงินเข้าคลังเงินสดย่อยหลัก (แนะนำให้เติมจนเต็มวงเงิน ฿{max.toLocaleString()})
                        </p>

                        <form onSubmit={handleReplenish}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ยอดเงินที่ต้องการเติม (THB)</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    step="0.01"
                                    value={replenishAmount}
                                    onChange={(e) => setReplenishAmount(e.target.value)}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder={`เช่น ${max - balance}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setReplenishAmount((max - balance).toString())}
                                    className="text-xs text-blue-500 hover:text-blue-600 mt-1"
                                >
                                    หรือคลิกเพื่อเติมเต็มวงเงิน (฿{(max - balance).toLocaleString()})
                                </button>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowReplenishModal(false)}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={isReplenishing}
                                    className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 text-sm font-medium disabled:opacity-50"
                                >
                                    {isReplenishing ? 'กำลังบันทึก...' : 'ยันยืนการเติม'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
