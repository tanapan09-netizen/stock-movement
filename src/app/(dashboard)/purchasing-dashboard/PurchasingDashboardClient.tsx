'use client';

import { 
    ShoppingCart, 
    FileText, 
    CreditCard, 
    AlertCircle, 
    Clock,
    ChevronRight,
    Package,
    Truck
} from 'lucide-react';
import Link from 'next/link';

interface RecentPR {
    request_id: number;
    request_number: string;
    status: string;
    amount: number | null | string;
    reason: string | null;
    created_at: Date | string;
    tbl_users: { username: string | null } | null;
}

interface RecentPO {
    po_id: number;
    po_number: string;
    status: string;
    total_amount: number | null | string;
    order_date: Date | string | null;
    tbl_suppliers: { s_name: string | null } | null;
}

interface PurchasingDashboardProps {
    summary: {
        pendingPRCount: number;
        approvedPRCount: number;
        monthlyPOIssuedCount: number;
        monthlyPOSpend: number;
    };
    recentPRs: RecentPR[];
    recentPOs: RecentPO[];
    userRole: string;
}

export default function PurchasingDashboardClient({
    summary,
    recentPRs,
    recentPOs
}: PurchasingDashboardProps) {
    const cards = [
        {
            title: 'คำขอซื้อรอดำเนินการ',
            value: summary.pendingPRCount.toString(),
            icon: Clock,
            color: 'text-amber-600',
            bg: 'bg-amber-100 dark:bg-amber-900/30',
            border: 'border-amber-200 dark:border-amber-800',
            link: '/approvals/purchasing'
        },
        {
            title: 'คำขอซื้อรอเปิด PO',
            value: summary.approvedPRCount.toString(),
            icon: AlertCircle,
            color: 'text-blue-600',
            bg: 'bg-blue-100 dark:bg-blue-900/30',
            border: 'border-blue-200 dark:border-blue-800',
            link: '/approvals/purchasing'
        },
        {
            title: 'ใบสั่งซื้อในเดือนนี้',
            value: summary.monthlyPOIssuedCount.toString(),
            icon: FileText,
            color: 'text-emerald-600',
            bg: 'bg-emerald-100 dark:bg-emerald-900/30',
            border: 'border-emerald-200 dark:border-emerald-800',
            link: '/purchase-orders'
        },
        {
            title: 'ยอดใช้จ่ายเดือนนี้',
            value: `฿${summary.monthlyPOSpend.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            icon: CreditCard,
            color: 'text-violet-600',
            bg: 'bg-violet-100 dark:bg-violet-900/30',
            border: 'border-violet-200 dark:border-violet-800',
            link: '/purchase-orders'
        }
    ];

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'approved':
            case 'received':
                return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200';
            case 'rejected':
            case 'cancelled':
                return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400 border-rose-200';
            case 'ordered':
                return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-blue-200';
            default:
                return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return 'รอดำเนินการ';
            case 'approved': return 'อนุมัติแล้ว';
            case 'rejected': return 'ปฏิเสธ';
            case 'draft': return 'ร่าง';
            case 'ordered': return 'สั่งซื้อแล้ว';
            case 'received': return 'รับสินค้าแล้ว';
            case 'cancelled': return 'ยกเลิก';
            default: return status;
        }
    };

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 dark:opacity-10 pointer-events-none">
                    <ShoppingCart className="w-48 h-48 -mt-12 -mr-12" />
                </div>
                <div className="flex items-start gap-4 z-10">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
                        <ShoppingCart className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Purchasing Dashboard</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            ภาพรวมงานจัดซื้อ-เบิกจ่าย, คำขอซื้อ (PR) และ ใบสั่งซื้อ (PO) ประจำเดือน
                        </p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 z-10 w-full sm:w-auto">
                    <Link 
                        href="/purchase-orders"
                        className="w-full sm:w-auto px-4 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-gray-50 hover:text-indigo-600 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                        <FileText className="w-4 h-4" /> ระบบใบสั่งซื้อ (PO)
                    </Link>
                    <Link 
                        href="/approvals/purchasing"
                        className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/30 rounded-xl transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                        <AlertCircle className="w-4 h-4" /> อนุมัติคำขอซื้อ
                    </Link>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, index) => (
                    <Link key={index} href={card.link}>
                        <div className={`group bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden h-full flex flex-col justify-between hover:-translate-y-1`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 ${card.bg} ${card.color}`}>
                                    <card.icon className="w-6 h-6" />
                                </div>
                                <div className="p-1.5 rounded-full bg-gray-50 dark:bg-slate-700/50 text-gray-400 group-hover:text-indigo-500 transition-colors">
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">{card.title}</h3>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {card.value}
                                </p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Recent Lists Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Recent PRs */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-[500px]">
                    <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600">
                                <FileText className="w-5 h-5 text-indigo-500" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">คำขอซื้อล่าสุด (PR)</h2>
                        </div>
                        <Link href="/approvals/purchasing" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1">
                            ดูทั้งหมด <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                    
                    <div className="overflow-y-auto flex-1 p-2">
                        {recentPRs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                                <p className="text-sm font-medium">ไม่มีรายการคำขอซื้อล่าสุด</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-100 dark:divide-slate-700/60">
                                {recentPRs.map((pr) => (
                                    <li key={pr.request_id} className="p-3 hover:bg-gray-50 dark:hover:bg-slate-700/30 rounded-xl transition-colors mb-1 group">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col gap-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                                        {pr.request_number}
                                                    </p>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusStyle(pr.status)} shrink-0`}>
                                                        {getStatusLabel(pr.status)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1 bg-white dark:bg-slate-800 px-2 py-1 rounded inline-block border border-gray-100 dark:border-slate-700 max-w-fit">
                                                    ผู้ขอ: {pr.tbl_users?.username || 'ไม่ระบุ'}
                                                </p>
                                                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 mt-1 font-mono bg-slate-50 dark:bg-slate-800/80 p-1.5 rounded">
                                                    {pr.reason?.split('\n')[0] || '-'}
                                                </p>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-1 ml-4 shrink-0">
                                                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">
                                                    ฿{pr.amount ? Number(pr.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '0.00'}
                                                </p>
                                                <p className="text-[10px] text-gray-400">
                                                    {new Date(pr.created_at).toLocaleDateString('th-TH')}
                                                </p>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Recent POs */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-[500px]">
                    <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600">
                                <CreditCard className="w-5 h-5 text-emerald-500" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">ใบสั่งซื้อล่าสุด (PO)</h2>
                        </div>
                        <Link href="/purchase-orders" className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center gap-1">
                            ดูทั้งหมด <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                    
                    <div className="overflow-y-auto flex-1 p-2">
                        {recentPOs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                                <p className="text-sm font-medium">ไม่มีรายการใบสั่งซื้อล่าสุด</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-100 dark:divide-slate-700/60">
                                {recentPOs.map((po) => (
                                    <li key={po.po_id} className="p-3 hover:bg-gray-50 dark:hover:bg-slate-700/30 rounded-xl transition-colors mb-1 group">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col gap-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                                        {String(po.po_number)}
                                                    </p>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusStyle(String(po.status))} shrink-0`}>
                                                        {getStatusLabel(String(po.status))}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1 bg-white dark:bg-slate-800 px-2 py-1 rounded inline-block border border-gray-100 dark:border-slate-700 max-w-fit flex items-center gap-1">
                                                    <Truck className="w-3 h-3" /> {po.tbl_suppliers?.s_name || 'ไม่ระบุผู้ขาย'}
                                                </p>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-1 ml-4 shrink-0">
                                                <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg">
                                                    ฿{po.total_amount ? Number(po.total_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '0.00'}
                                                </p>
                                                <p className="text-[10px] text-gray-400">
                                                    {new Date(String(po.order_date)).toLocaleDateString('th-TH')}
                                                </p>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
