import { getLowStockItems } from '@/actions/productActions';
import { prisma } from '@/lib/prisma';
import {
    Activity,
    AlertTriangle,
    ArrowDownRight,
    ArrowRight,
    ArrowUpRight,
    ClipboardCheck,
    Clock,
    Package,
    ShieldCheck,
    TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

type StatCardProps = {
    title: string;
    value: number;
    subtitle?: string;
    icon: React.ComponentType<{ className?: string }>;
    color: 'emerald' | 'blue' | 'purple' | 'orange' | 'rose';
    link?: string;
};

type StoreTaskCardProps = {
    title: string;
    value: number;
    description: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    tone: 'orange' | 'blue';
};

type LowStockItem = {
    p_id: string;
    p_name: string;
    p_count: number;
    safety_stock: number | null;
};

const colorMap = {
    emerald: {
        style: 'bg-white dark:bg-slate-800 border-emerald-100/50 dark:border-slate-700',
        iconBg: 'bg-emerald-50 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400',
        text: 'text-gray-900 dark:text-white',
        subtext: 'text-gray-500 dark:text-gray-400',
        linkBg: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    },
    blue: {
        style: 'bg-white dark:bg-slate-800 border-blue-100/50 dark:border-slate-700',
        iconBg: 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400',
        text: 'text-gray-900 dark:text-white',
        subtext: 'text-gray-500 dark:text-gray-400',
        linkBg: 'hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    },
    purple: {
        style: 'bg-white dark:bg-slate-800 border-purple-100/50 dark:border-slate-700',
        iconBg: 'bg-purple-50 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400',
        text: 'text-gray-900 dark:text-white',
        subtext: 'text-gray-500 dark:text-gray-400',
        linkBg: 'hover:bg-purple-50 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    },
    orange: {
        style: 'bg-white dark:bg-slate-800 border-orange-100/50 dark:border-slate-700',
        iconBg: 'bg-orange-50 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400',
        text: 'text-gray-900 dark:text-white',
        subtext: 'text-gray-500 dark:text-gray-400',
        linkBg: 'hover:bg-orange-50 dark:hover:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    },
    rose: {
        style: 'bg-white dark:bg-slate-800 border-rose-100/50 dark:border-slate-700',
        iconBg: 'bg-rose-50 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400',
        text: 'text-gray-900 dark:text-white',
        subtext: 'text-gray-500 dark:text-gray-400',
        linkBg: 'hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400',
    },
} satisfies Record<StatCardProps['color'], { style: string; iconBg: string; text: string; subtext: string; linkBg: string }>;

function StatCard({ title, value, subtitle, icon: Icon, color, link }: StatCardProps) {
    const theme = colorMap[color];

    const content = (
        <div className={`${theme.style} h-full rounded-2xl border p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}>
            <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                    <p className={`${theme.subtext} mb-1 text-sm font-semibold`}>{title}</p>
                    <h3 className={`text-3xl font-bold tracking-tight ${theme.text}`}>{value}</h3>
                </div>
                <div className={`rounded-xl p-3 ${theme.iconBg}`}>
                    <Icon className="h-6 w-6" />
                </div>
            </div>
            {(subtitle || link) && (
                <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-slate-700">
                    {subtitle && <span className={`text-xs font-medium ${theme.subtext}`}>{subtitle}</span>}
                    {link && (
                        <span className={`flex items-center rounded px-2 py-1 text-xs font-medium transition-colors ${theme.linkBg}`}>
                            ดูรายละเอียด <ArrowRight className="ml-1 h-3 w-3" />
                        </span>
                    )}
                </div>
            )}
        </div>
    );

    if (!link) {
        return content;
    }

    return (
        <Link href={link} className="group block h-full">
            {content}
        </Link>
    );
}

function StoreTaskCard({ title, value, description, href, icon: Icon, tone }: StoreTaskCardProps) {
    const toneMap = {
        orange: {
            border: 'border-orange-100 dark:border-orange-900/40',
            bg: 'from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800',
            icon: 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-300',
            text: 'text-orange-700 dark:text-orange-300',
        },
        blue: {
            border: 'border-blue-100 dark:border-blue-900/40',
            bg: 'from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800',
            icon: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300',
            text: 'text-blue-700 dark:text-blue-300',
        },
    } as const;

    const theme = toneMap[tone];

    return (
        <Link
            href={href}
            className={`group rounded-2xl border bg-gradient-to-br p-5 transition-all hover:shadow-md ${theme.border} ${theme.bg}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className={`text-sm font-semibold ${theme.text}`}>{title}</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{description}</p>
                </div>
                <div className={`rounded-xl p-3 ${theme.icon}`}>
                    <Icon className="h-6 w-6" />
                </div>
            </div>
            <div className={`mt-4 flex items-center text-sm font-medium ${theme.text}`}>
                เปิดรายการ <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
        </Link>
    );
}

export default async function StoreDashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
        totalProducts,
        recentMovements,
        todayMovements,
        lowStockResult,
        pendingVerificationCount,
        pendingPartRequestCount,
    ] = await Promise.all([
        prisma.tbl_products.count({ where: { active: true } }),
        prisma.tbl_product_movements.findMany({
            take: 5,
            orderBy: { movement_time: 'desc' },
        }),
        prisma.tbl_product_movements.count({
            where: { movement_time: { gte: today } },
        }),
        getLowStockItems(),
        prisma.tbl_maintenance_parts.count({
            where: { status: 'pending_verification' },
        }),
        prisma.tbl_part_requests.count({
            where: { status: 'pending' },
        }),
    ]);

    const lowStockList: LowStockItem[] = lowStockResult.success ? ((lowStockResult.data as LowStockItem[]) || []) : [];
    const outOfStock = lowStockList.filter((product) => product.p_count <= 0).length;

    const productIds = recentMovements.map((movement) => movement.p_id);
    const products = productIds.length
        ? await prisma.tbl_products.findMany({
            where: { p_id: { in: productIds } },
            select: { p_id: true, p_name: true },
        })
        : [];
    const productNameMap = new Map(products.map((product) => [product.p_id, product.p_name]));

    return (
        <div className="mx-auto max-w-[1600px] space-y-8">
            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 md:flex-row md:items-center">
                <div>
                    <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white">
                        <span className="rounded-lg bg-indigo-600 p-2 text-white">
                            <Package className="h-6 w-6" />
                        </span>
                        Store Dashboard
                    </h1>
                    <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                        ภาพรวมงานคลังสินค้า การรับเข้า การเบิก และรายการที่ต้องติดตาม
                    </p>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 dark:border-slate-600 dark:bg-slate-700">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {new Date().toLocaleDateString('th-TH', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="สินค้าทั้งหมด"
                    value={totalProducts}
                    icon={Package}
                    color="blue"
                    link="/products"
                    subtitle="รายการที่ยัง Active"
                />
                <StatCard
                    title="ความเคลื่อนไหววันนี้"
                    value={todayMovements}
                    icon={Activity}
                    color="purple"
                    link="/movements"
                    subtitle="รับเข้าและเบิกออกวันนี้"
                />
                <StatCard
                    title="สินค้าใกล้หมด"
                    value={lowStockList.length}
                    icon={AlertTriangle}
                    color={lowStockList.length > 0 ? 'rose' : 'emerald'}
                    subtitle={outOfStock > 0 ? `หมดสต็อก ${outOfStock} รายการ` : 'ควรติดตามการเติมสต็อก'}
                />
                <StatCard
                    title="รอตรวจรับ/ยืนยัน"
                    value={pendingVerificationCount}
                    icon={ShieldCheck}
                    color={pendingVerificationCount > 0 ? 'orange' : 'emerald'}
                    link="/maintenance/parts"
                    subtitle="อะไหล่ที่รอคลังตรวจนับ"
                />
            </div>

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
                <div className="space-y-8 xl:col-span-2">
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                        <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-800 dark:text-white">
                            <span className="h-6 w-1 rounded-full bg-indigo-500"></span>
                            เมนูด่วน
                        </h3>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                            <Link href="/stock/adjust" className="group rounded-xl border border-gray-100 bg-gray-50 p-4 text-center transition-all hover:border-blue-200 hover:bg-blue-50">
                                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 transition-transform group-hover:scale-110">
                                    <TrendingUp className="h-5 w-5" />
                                </div>
                                <div className="font-semibold text-gray-700 group-hover:text-blue-700">ปรับสต็อก</div>
                            </Link>
                            <Link href="/products/new" className="group rounded-xl border border-gray-100 bg-gray-50 p-4 text-center transition-all hover:border-green-200 hover:bg-green-50">
                                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600 transition-transform group-hover:scale-110">
                                    <Package className="h-5 w-5" />
                                </div>
                                <div className="font-semibold text-gray-700 group-hover:text-green-700">เพิ่มสินค้าใหม่</div>
                            </Link>
                            <Link href="/purchase-orders" className="group rounded-xl border border-gray-100 bg-gray-50 p-4 text-center transition-all hover:border-purple-200 hover:bg-purple-50">
                                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600 transition-transform group-hover:scale-110">
                                    <ArrowDownRight className="h-5 w-5" />
                                </div>
                                <div className="font-semibold text-gray-700 group-hover:text-purple-700">รับสินค้าเข้า (PO)</div>
                            </Link>
                            <Link href="/borrow" className="group rounded-xl border border-gray-100 bg-gray-50 p-4 text-center transition-all hover:border-orange-200 hover:bg-orange-50">
                                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-600 transition-transform group-hover:scale-110">
                                    <Clock className="h-5 w-5" />
                                </div>
                                <div className="font-semibold text-gray-700 group-hover:text-orange-700">ยืม-คืนอุปกรณ์</div>
                            </Link>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                        <div className="mb-5 flex items-center justify-between">
                            <h3 className="flex items-center gap-2 font-bold text-gray-800 dark:text-white">
                                <span className="h-6 w-1 rounded-full bg-emerald-500"></span>
                                งานที่ต้องทำของคลัง
                            </h3>
                            <Link href="/store-dashboard" className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                มุมมองคลังสินค้า
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <StoreTaskCard
                                title="รอตรวจรับอะไหล่"
                                value={pendingVerificationCount}
                                description="รายการอะไหล่ที่ต้องตรวจนับและยืนยันรับเข้า"
                                href="/maintenance/parts"
                                icon={ClipboardCheck}
                                tone="orange"
                            />
                            <StoreTaskCard
                                title="คำขอเบิกอะไหล่รอดำเนินการ"
                                value={pendingPartRequestCount}
                                description="รายการที่รอคลังตรวจสอบและจัดเตรียมสินค้า"
                                href="/maintenance/part-requests"
                                icon={ShieldCheck}
                                tone="blue"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-red-50 to-white p-5 dark:border-slate-700 dark:from-red-900/30 dark:to-slate-800">
                            <h3 className="flex items-center gap-2 font-bold text-gray-800 dark:text-white">
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                                สินค้าต้องเติม
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">{lowStockList.length}</span>
                            </h3>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto bg-white dark:bg-slate-800">
                            {lowStockList.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    <Package className="mx-auto mb-2 h-12 w-12 opacity-20" />
                                    <p>สต็อกเพียงพอทุกรายการ</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50 dark:divide-slate-700">
                                    {lowStockList.map((product) => (
                                        <div key={product.p_id} className="p-4 transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/40">
                                            <div className="mb-1 flex items-start justify-between gap-3">
                                                <span className="line-clamp-1 text-sm font-medium text-gray-800 dark:text-gray-200">{product.p_name}</span>
                                                <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${product.p_count <= 0 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                                                    {product.p_count <= 0 ? 'หมด' : `เหลือ ${product.p_count}`}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                                <span>ขั้นต่ำ: {product.safety_stock}</span>
                                                <Link href={`/stock/adjust?id=${product.p_id}`} className="text-blue-600 hover:underline dark:text-blue-400">
                                                    เติมของ
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                        <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-slate-700">
                            <h3 className="flex items-center gap-2 font-bold text-gray-800 dark:text-white">
                                <Activity className="h-5 w-5 text-gray-500" />
                                ความเคลื่อนไหวล่าสุด
                            </h3>
                            <Link href="/movements" className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                                ดูทั้งหมด
                            </Link>
                        </div>
                        <div className="divide-y divide-gray-50 dark:divide-slate-700">
                            {recentMovements.map((movement) => {
                                const isInbound = movement.movement_type === 'รับเข้า';

                                return (
                                    <div key={movement.movement_id} className="flex items-center gap-3 p-4 transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/40">
                                        <div className={`shrink-0 rounded-lg p-2 ${isInbound ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300'}`}>
                                            {isInbound ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                                {productNameMap.get(movement.p_id) || `Item #${movement.p_id}`}
                                            </p>
                                            <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                {new Date(movement.movement_time).toLocaleTimeString('th-TH', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                                <span>โดย</span>
                                                {movement.remarks || 'ไม่มีบันทึก'}
                                            </p>
                                        </div>
                                        <div className={`text-sm font-bold ${isInbound ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'}`}>
                                            {isInbound ? '+' : '-'}
                                            {movement.quantity}
                                        </div>
                                    </div>
                                );
                            })}
                            {recentMovements.length === 0 && (
                                <div className="p-6 text-center text-sm text-gray-400">
                                    ยังไม่มีความเคลื่อนไหว
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
