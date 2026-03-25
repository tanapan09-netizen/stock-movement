import { prisma } from '@/lib/prisma';
import { Wrench, Clock, FileText, ArrowRight, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/auth';
import { canAccessDashboardPage } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';

interface QuickActionItem {
    href: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    cardClass: string;
    iconClass: string;
    titleClass: string;
    allowed: boolean;
}

export default async function GeneralDashboard() {
    const session = await auth();
    const userName = session?.user?.name || '';
    const permissionContext = await getUserPermissionContext(session?.user as PermissionSessionUser | undefined);
    const { role, isApprover, permissions } = permissionContext;
    const canAccessPage = (route: string) =>
        canAccessDashboardPage(role, permissions, route, { isApprover });

    const quickActions: QuickActionItem[] = [
        {
            href: '/maintenance',
            title: 'แจ้งซ่อม (Maintenance)',
            description: 'แจ้งปัญหางานซ่อมต่างๆ',
            icon: <Wrench className="w-6 h-6" />,
            cardClass:
                'group p-6 rounded-xl border border-gray-100 hover:border-blue-200 bg-gray-50 hover:bg-blue-50 transition-all text-center flex flex-col items-center',
            iconClass:
                'w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform',
            titleClass: 'font-semibold text-gray-700 group-hover:text-blue-700',
            allowed: canAccessPage('/maintenance'),
        },
        {
            href: '/borrow',
            title: 'ยืม-คืน (Borrow/Return)',
            description: 'ทำรายการยืมคืนอุปกรณ์',
            icon: <Clock className="w-6 h-6" />,
            cardClass:
                'group p-6 rounded-xl border border-gray-100 hover:border-orange-200 bg-gray-50 hover:bg-orange-50 transition-all text-center flex flex-col items-center',
            iconClass:
                'w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform',
            titleClass: 'font-semibold text-gray-700 group-hover:text-orange-700',
            allowed: canAccessPage('/borrow'),
        },
        {
            href: '/purchase-request',
            title: 'ส่งคำขอซื้อ',
            description: 'ส่งคำขอซื้อหรือเบิกค่าใช้จ่ายให้ฝ่ายจัดซื้อ',
            icon: <ShoppingCart className="w-6 h-6" />,
            cardClass:
                'group p-6 rounded-xl border border-gray-100 hover:border-emerald-200 bg-gray-50 hover:bg-emerald-50 transition-all text-center flex flex-col items-center',
            iconClass:
                'w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform',
            titleClass: 'font-semibold text-gray-700 group-hover:text-emerald-700',
            allowed: canAccessPage('/purchase-request'),
        },
    ];

    const visibleQuickActions = quickActions.filter((action) => action.allowed);

    // Fetch recent maintenance requests submitted by this user
    const recentRequests = await prisma.tbl_maintenance_requests.findMany({
        where: {
            reported_by: userName,
        },
        orderBy: {
            created_at: 'desc',
        },
        take: 5,
        include: {
            tbl_rooms: true,
        },
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                        รอดำเนินการ
                    </span>
                );
            case 'in_progress':
                return (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        กำลังดำเนินการ
                    </span>
                );
            case 'wait_for_parts':
                return (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">
                        รออะไหล่
                    </span>
                );
            case 'wait_for_order':
                return (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                        รอขอสั่งซื้ออะไหล่
                    </span>
                );
            case 'completed':
                return (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                        เสร็จสิ้น
                    </span>
                );
            case 'cancelled':
                return (
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                        ยกเลิก
                    </span>
                );
            default:
                return (
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                        {status}
                    </span>
                );
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <span className="bg-teal-600 text-white p-2 rounded-lg">
                            <FileText className="w-6 h-6" />
                        </span>
                        Welcome
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm font-medium">
                        ยินดีต้อนรับเข้าสู่ระบบ, {userName}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Quick Actions */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                            <span className="w-1 h-6 bg-teal-500 rounded-full"></span>
                            เมนูด่วน (Quick Actions)
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {visibleQuickActions.map((action) => (
                                <Link
                                    key={action.href}
                                    href={action.href}
                                    className={action.cardClass}
                                >
                                    <div className={action.iconClass}>{action.icon}</div>
                                    <div className={action.titleClass}>{action.title}</div>
                                    <p className="text-xs text-gray-500 mt-1">{action.description}</p>
                                </Link>
                            ))}

                            {visibleQuickActions.length === 0 && (
                                <div className="sm:col-span-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-5 text-center text-sm text-gray-500">
                                    ไม่มีเมนูด่วนที่คุณมีสิทธิ์ใช้งาน
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Recent Requests */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <Wrench className="w-5 h-5 text-gray-500" />
                            รายการแจ้งซ่อมล่าสุดของคุณ
                        </h3>
                        <Link href="/maintenance" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                            ดูทั้งหมด <ArrowRight className="inline w-3 h-3" />
                        </Link>
                    </div>
                    <div className="divide-y divide-gray-50 dark:divide-gray-100">
                        {recentRequests.map((req) => (
                            <div key={req.request_id} className="p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-semibold text-gray-900 text-sm">{req.request_number}</span>
                                    {getStatusBadge(req.status)}
                                </div>
                                <div className="text-gray-700 text-sm mb-2 line-clamp-2">
                                    {req.title} {req.description && `- ${req.description}`}
                                </div>
                                <div className="flex justify-between items-center text-xs text-gray-500">
                                    <span>สถานที่: {req.tbl_rooms?.room_name || '-'}</span>
                                    <span>{new Date(req.created_at).toLocaleDateString('th-TH')}</span>
                                </div>
                            </div>
                        ))}
                        {recentRequests.length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>ยังไม่มีรายการแจ้งซ่อม</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
