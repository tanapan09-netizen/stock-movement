import Link from 'next/link';
import type { ComponentType } from 'react';
import {
    Activity,
    AlertTriangle,
    ArrowRight,
    BriefcaseBusiness,
    CheckCircle2,
    ClipboardCheck,
    Clock3,
    FileCheck2,
    ReceiptText,
    ShoppingCart,
    UserRound,
    Wrench,
} from 'lucide-react';

import { prisma } from '@/lib/prisma';

type SummaryCard = {
    title: string;
    value: number;
    description: string;
    href: string;
    icon: ComponentType<{ className?: string }>;
};

const formatDateTime = (value?: Date | null) =>
    value
        ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(value)
        : '-';

const formatCurrency = (value?: number | null) =>
    value
        ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 2 }).format(value)
        : '-';

const getApprovalTypeLabel = (type?: string | null) => {
    switch ((type || '').toLowerCase()) {
        case 'purchase': return 'คำขอซื้อ';
        case 'expense': return 'เบิกค่าใช้จ่าย';
        case 'leave': return 'ลางาน';
        case 'ot': return 'โอที';
        default: return 'คำขอทั่วไป';
    }
};

const getMaintenanceStatusLabel = (status?: string | null) => {
    switch ((status || '').toLowerCase()) {
        case 'pending': return 'รอรับงาน';
        case 'confirmed': return 'ยืนยันแล้ว';
        case 'in_progress': return 'กำลังดำเนินการ';
        case 'wait_for_parts': return 'รออะไหล่';
        case 'wait_for_order': return 'รอสั่งซื้อ';
        default: return status || '-';
    }
};

export default async function ManagerDashboard() {
    const [
        pendingGeneralApprovals,
        pendingPurchaseApprovals,
        pendingPettyCash,
        pendingPartRequests,
        activeMaintenance,
        unassignedMaintenance,
        recentGeneralApprovals,
        recentPurchaseApprovals,
        recentPettyCashRows,
        recentMaintenanceRows,
    ] = await Promise.all([
        prisma.tbl_approval_requests.count({ where: { status: 'pending', request_type: { not: 'purchase' } } }),
        prisma.tbl_approval_requests.count({ where: { status: 'pending', request_type: 'purchase' } }),
        prisma.tbl_petty_cash.count({ where: { status: 'pending' } }),
        prisma.tbl_part_requests.count({ where: { status: 'pending' } }),
        prisma.tbl_maintenance_requests.count({ where: { status: { notIn: ['completed', 'cancelled'] } } }),
        prisma.tbl_maintenance_requests.count({
            where: {
                status: { notIn: ['completed', 'cancelled'] },
                OR: [{ assigned_to: null }, { assigned_to: '' }],
            },
        }),
        prisma.tbl_approval_requests.findMany({
            where: { status: 'pending', request_type: { not: 'purchase' } },
            include: { tbl_users: { select: { username: true } }, tbl_approver: { select: { username: true } } },
            orderBy: { created_at: 'desc' },
            take: 6,
        }),
        prisma.tbl_approval_requests.findMany({
            where: { status: 'pending', request_type: 'purchase' },
            include: { tbl_users: { select: { username: true } }, tbl_approver: { select: { username: true } } },
            orderBy: { created_at: 'desc' },
            take: 6,
        }),
        prisma.tbl_petty_cash.findMany({
            where: { status: 'pending' },
            orderBy: { created_at: 'desc' },
            take: 6,
        }),
        prisma.tbl_maintenance_requests.findMany({
            where: { status: { notIn: ['completed', 'cancelled'] } },
            orderBy: { updated_at: 'desc' },
            take: 8,
        }),
    ]);

    const summaryCards: SummaryCard[] = [
        { title: 'งานซ่อมที่ยังไม่จบ', value: activeMaintenance, description: `ยังไม่มอบหมาย ${unassignedMaintenance} งาน`, href: '/maintenance', icon: Wrench },
        { title: 'คำขออนุมัติทั่วไป', value: pendingGeneralApprovals, description: 'OT, ลา, เบิกค่าใช้จ่าย', href: '/approvals', icon: FileCheck2 },
        { title: 'คำขอซื้อรอจัดซื้อ', value: pendingPurchaseApprovals, description: 'ตรวจว่าต้องอนุมัติหรือไม่', href: '/approvals/purchasing', icon: ShoppingCart },
        { title: 'เงินสดย่อยรออนุมัติ', value: pendingPettyCash, description: 'รายการที่ผู้จัดการต้องตาม', href: '/petty-cash', icon: ReceiptText },
        { title: 'คำขอเบิกอะไหล่', value: pendingPartRequests, description: 'เช็กสถานะสายอนุมัติ', href: '/maintenance/part-requests', icon: ClipboardCheck },
    ];

    const decisionQueue = [
        ...recentGeneralApprovals.map((item) => ({
            id: `general-${item.request_id}`,
            module: getApprovalTypeLabel(item.request_type),
            number: item.request_number,
            title: item.reason,
            requester: item.tbl_users?.username || `User #${item.requested_by}`,
            owner: item.tbl_approver?.username || 'Manager/Approver',
            status: item.status,
            amount: item.amount ? Number(item.amount) : null,
            href: '/approvals',
            createdAt: item.created_at,
        })),
        ...recentPurchaseApprovals.map((item) => ({
            id: `purchase-${item.request_id}`,
            module: 'คำขอซื้อ',
            number: item.request_number,
            title: item.reason,
            requester: item.tbl_users?.username || `User #${item.requested_by}`,
            owner: item.tbl_approver?.username || 'Purchasing',
            status: item.status,
            amount: item.amount ? Number(item.amount) : null,
            href: '/approvals/purchasing',
            createdAt: item.created_at,
        })),
        ...recentPettyCashRows.map((item) => ({
            id: `petty-${item.id}`,
            module: 'เงินสดย่อย',
            number: item.request_number,
            title: item.purpose,
            requester: item.requested_by,
            owner: 'Accounting / Manager',
            status: item.status,
            amount: Number(item.requested_amount),
            href: '/petty-cash',
            createdAt: item.created_at,
        })),
    ].sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)).slice(0, 10);

    const workMonitor = [
        ...recentMaintenanceRows.map((item) => ({
            id: `maint-${item.request_id}`,
            module: 'งานซ่อม',
            number: item.request_number,
            title: item.title,
            owner: item.assigned_to || 'ยังไม่มอบหมาย',
            status: getMaintenanceStatusLabel(item.status),
            approval: item.status === 'wait_for_order' ? 'รออนุมัติ/สั่งซื้อ' : 'ติดตามงาน',
            updatedAt: item.updated_at,
            href: '/maintenance',
        })),
        ...recentPurchaseApprovals.map((item) => ({
            id: `monitor-${item.request_id}`,
            module: 'คำขอซื้อ',
            number: item.request_number,
            title: item.reason,
            owner: item.tbl_approver?.username || 'Purchasing',
            status: item.status,
            approval: 'ต้องอนุมัติ/ไม่อนุมัติ',
            updatedAt: item.updated_at,
            href: '/approvals/purchasing',
        })),
    ].sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0)).slice(0, 10);

    return (
        <div className="mx-auto max-w-[1680px] space-y-8">
            <section className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-sm">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-slate-200">
                            <Activity className="h-3.5 w-3.5" />
                            Manager Monitor
                        </div>
                        <h1 className="mt-4 text-3xl font-black tracking-tight">แดชบอร์ดติดตามงานและการอนุมัติ</h1>
                        <p className="mt-2 max-w-3xl text-sm text-slate-300">ดูภาพรวมข้ามแผนก ว่างานอยู่ที่ใคร อะไรยัง pending และมีรายการใดต้องตัดสินใจทันที</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Link href="/approvals" className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 transition hover:bg-white/15"><p className="text-xs text-slate-300">อนุมัติทั่วไป</p><p className="mt-1 text-lg font-bold">{pendingGeneralApprovals}</p></Link>
                        <Link href="/approvals/purchasing" className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 transition hover:bg-white/15"><p className="text-xs text-slate-300">จัดซื้อ</p><p className="mt-1 text-lg font-bold">{pendingPurchaseApprovals}</p></Link>
                        <Link href="/maintenance" className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 transition hover:bg-white/15"><p className="text-xs text-slate-300">งานซ่อมค้าง</p><p className="mt-1 text-lg font-bold">{activeMaintenance}</p></Link>
                        <Link href="/audit-log" className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 transition hover:bg-white/15"><p className="text-xs text-slate-300">Audit Log</p><p className="mt-1 text-lg font-bold">Open</p></Link>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                {summaryCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <Link key={card.title} href={card.href} className="group rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                            <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                                <Icon className="h-5 w-5 text-slate-700" />
                            </div>
                            <div className="mt-4 flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">{card.title}</p>
                                    <p className="mt-2 text-3xl font-black text-slate-900">{card.value}</p>
                                    <p className="mt-2 text-sm text-slate-500">{card.description}</p>
                                </div>
                                <ArrowRight className="mt-1 h-5 w-5 text-slate-300 transition group-hover:text-slate-600" />
                            </div>
                        </Link>
                    );
                })}
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">คิวงานที่รออนุมัติ</h2>
                            <p className="text-sm text-slate-500">ดูว่ารายการไหนค้างตัดสินใจ และตอนนี้อยู่ที่ใคร</p>
                        </div>
                        <Link href="/approvals" className="text-sm font-semibold text-slate-600 transition hover:text-slate-900">เปิดหน้ารวม</Link>
                    </div>

                    <div className="space-y-3">
                        {decisionQueue.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">ไม่มีรายการรออนุมัติในตอนนี้</div>
                        ) : decisionQueue.map((item) => (
                            <Link key={item.id} href={item.href} className="block rounded-2xl border border-slate-200 px-4 py-4 transition hover:border-slate-300 hover:bg-slate-50">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">{item.module}</span>
                                            <span className="text-xs font-semibold text-slate-500">{item.number}</span>
                                        </div>
                                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                            <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />ผู้ขอ: {item.requester}</span>
                                            <span className="inline-flex items-center gap-1"><BriefcaseBusiness className="h-3.5 w-3.5" />ตอนนี้อยู่ที่: {item.owner}</span>
                                            <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{formatDateTime(item.createdAt)}</span>
                                        </div>
                                    </div>
                                    <div className="min-w-[220px] space-y-2 rounded-2xl bg-slate-50 p-3 text-xs">
                                        <div className="flex items-center justify-between"><span className="text-slate-500">สถานะ</span><span className="font-semibold text-amber-600">{item.status}</span></div>
                                        <div className="flex items-center justify-between"><span className="text-slate-500">การตัดสินใจ</span><span className="font-semibold text-rose-600">ต้องอนุมัติ/ไม่อนุมัติ</span></div>
                                        <div className="flex items-center justify-between"><span className="text-slate-500">วงเงิน</span><span className="font-semibold text-slate-900">{formatCurrency(item.amount)}</span></div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">สัญญาณเตือนผู้จัดการ</h2>
                            <p className="text-sm text-slate-500">จุดที่ควรเข้าไปเช็กก่อน เพื่อไม่ให้งานค้าง</p>
                        </div>
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="space-y-3">
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-900">งานซ่อมยังไม่มอบหมาย</p><p className="mt-1 text-3xl font-black text-amber-700">{unassignedMaintenance}</p><p className="mt-2 text-sm text-amber-800">ควรระบุ owner ให้ชัด เพื่อไม่ให้งานค้างโดยไม่มีผู้รับผิดชอบ</p></div>
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4"><p className="text-sm font-semibold text-rose-900">รายการรออนุมัติรวม</p><p className="mt-1 text-3xl font-black text-rose-700">{pendingGeneralApprovals + pendingPurchaseApprovals + pendingPettyCash + pendingPartRequests}</p><p className="mt-2 text-sm text-rose-800">รวมงานที่ผู้บริหารควรเช็กและตัดสินใจ</p></div>
                        <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4"><p className="text-sm font-semibold text-cyan-900">งานซ่อมที่ยังเดินอยู่</p><p className="mt-1 text-3xl font-black text-cyan-700">{activeMaintenance}</p><p className="mt-2 text-sm text-cyan-800">ใช้เช็กว่าทีมซ่อมกำลังติดคอขวดหรือไม่</p></div>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-6">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">ติดตามว่างานอยู่ที่ใคร</h2>
                            <p className="text-sm text-slate-500">รวมงานล่าสุดจากซ่อมและจัดซื้อ</p>
                        </div>
                        <CheckCircle2 className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead><tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500"><th className="pb-3 pr-4 font-semibold">โมดูล</th><th className="pb-3 pr-4 font-semibold">รายการ</th><th className="pb-3 pr-4 font-semibold">ตอนนี้อยู่ที่</th><th className="pb-3 pr-4 font-semibold">สถานะ</th><th className="pb-3 pr-4 font-semibold">การอนุมัติ</th><th className="pb-3 font-semibold">อัปเดตล่าสุด</th></tr></thead>
                            <tbody>
                                {workMonitor.map((item) => (
                                    <tr key={item.id} className="border-b border-slate-100 transition hover:bg-slate-50 last:border-b-0">
                                        <td className="py-3 pr-4 align-top">
                                            <Link href={item.href} className="block">
                                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{item.module}</span>
                                            </Link>
                                        </td>
                                        <td className="py-3 pr-4 align-top">
                                            <Link href={item.href} className="block">
                                                <span className="font-semibold text-slate-900 hover:text-slate-700">{item.number}</span>
                                                <p className="mt-1 text-xs text-slate-500">{item.title}</p>
                                            </Link>
                                        </td>
                                        <td className="py-3 pr-4 align-top text-slate-700">
                                            <Link href={item.href} className="block">{item.owner}</Link>
                                        </td>
                                        <td className="py-3 pr-4 align-top text-slate-700">
                                            <Link href={item.href} className="block">{item.status}</Link>
                                        </td>
                                        <td className="py-3 pr-4 align-top">
                                            <Link href={item.href} className="block">
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{item.approval}</span>
                                            </Link>
                                        </td>
                                        <td className="py-3 align-top text-xs text-slate-500">
                                            <Link href={item.href} className="block">{formatDateTime(item.updatedAt)}</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>
    );
}
