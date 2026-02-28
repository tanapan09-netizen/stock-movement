import { prisma } from '@/lib/prisma';
import { Package, AlertTriangle, DollarSign, Activity, TrendingUp, TrendingDown, Briefcase, ArrowRight, BarChart3, Clock, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import Link from 'next/link';
import DashboardCharts from '@/components/DashboardCharts';
import { getLowStockItems } from '@/actions/productActions';

const StatCard = ({ title, value, subtitle, icon: Icon, color, link }: any) => {
    // Force "Light" style (White Card) for both modes as requested
    // "เปลี่ยนการ์ดสีเข้มให้เป็นสีอ่อน" -> User wants light/white cards.
    const colorMap: any = {
        emerald: {
            style: 'bg-white dark:bg-slate-800 border-emerald-100/50 dark:border-slate-700',
            iconBg: 'bg-emerald-50 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400',
            text: 'text-gray-900 dark:text-white',
            subtext: 'text-gray-500 dark:text-gray-400',
            linkBg: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
        },
        blue: {
            style: 'bg-white dark:bg-slate-800 border-blue-100/50 dark:border-slate-700',
            iconBg: 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400',
            text: 'text-gray-900 dark:text-white',
            subtext: 'text-gray-500 dark:text-gray-400',
            linkBg: 'hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400'
        },
        purple: {
            style: 'bg-white dark:bg-slate-800 border-purple-100/50 dark:border-slate-700',
            iconBg: 'bg-purple-50 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400',
            text: 'text-gray-900 dark:text-white',
            subtext: 'text-gray-500 dark:text-gray-400',
            linkBg: 'hover:bg-purple-50 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-400'
        },
        orange: {
            style: 'bg-white dark:bg-slate-800 border-orange-100/50 dark:border-slate-700',
            iconBg: 'bg-orange-50 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400',
            text: 'text-gray-900 dark:text-white',
            subtext: 'text-gray-500 dark:text-gray-400',
            linkBg: 'hover:bg-orange-50 dark:hover:bg-orange-900/30 text-orange-600 dark:text-orange-400'
        }
    };

    const theme = colorMap[color] || colorMap.blue;

    const content = (
        <div className={`${theme.style} border rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full`}>
            <div className="flex items-start justify-between mb-4">
                <div>
                    <p className={`${theme.subtext} text-sm font-semibold mb-1`}>{title}</p>
                    <h3 className={`text-3xl font-bold tracking-tight ${theme.text}`}>{value}</h3>
                </div>
                <div className={`p-3 rounded-xl ${theme.iconBg} backdrop-blur-sm transition-colors`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
            {(subtitle || link) && (
                <div className={`flex items-center justify-between pt-3 border-t border-gray-100 mt-2`}>
                    {subtitle && <span className={`text-xs font-medium ${theme.subtext}`}>{subtitle}</span>}
                    {link && (
                        <span className={`text-xs font-medium flex items-center px-2 py-1 rounded transition-colors ${theme.linkBg}`}>
                            คลิกเพื่อดูรายละเอียด <ArrowRight className="w-3 h-3 ml-1" />
                        </span>
                    )}
                </div>
            )}
        </div>
    );

    if (link) {
        return (
            <Link href={link} className="block h-full group">
                {content}
            </Link>
        );
    }

    return content;
};

export default async function AdminDashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
        totalProducts,
        allProducts,
        recentMovements,
        todayMovements,
        totalAssets,
        lowStockResult
    ] = await Promise.all([
        prisma.tbl_products.count({ where: { active: true } }),
        prisma.tbl_products.findMany({
            select: { p_id: true, p_name: true, p_count: true, price_unit: true, safety_stock: true, main_category: true },
            where: { active: true }
        }),
        prisma.tbl_product_movements.findMany({
            take: 5,
            orderBy: { movement_time: 'desc' },
        }),
        prisma.tbl_product_movements.count({
            where: { movement_time: { gte: today } }
        }),
        prisma.tbl_assets.count(),
        getLowStockItems()
    ]);

    // Calculate stats
    const totalValue = allProducts.reduce((sum, p) => sum + (p.p_count * Number(p.price_unit || 0)), 0);
    const lowStockList = lowStockResult.success ? (lowStockResult.data || []) : [];
    const outOfStock = lowStockList.filter((p: any) => p.p_count <= 0).length;

    // Get product names for movements
    const pIds = recentMovements.map(m => m.p_id);
    const productsMap = await prisma.tbl_products.findMany({
        where: { p_id: { in: pIds } },
        select: { p_id: true, p_name: true }
    });
    const pMap = new Map(productsMap.map(p => [p.p_id, p.p_name]));

    return (
        <div className="max-w-[1600px] mx-auto space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <span className="bg-blue-600 text-white p-2 rounded-lg">
                            <BarChart3 className="w-6 h-6" />
                        </span>
                        Overview Dashboard
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm font-medium">
                        ภาพรวมระบบบริหารจัดการคลังสินค้าและบัญชีทรัพย์สิน (Admin)
                    </p>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-700 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="มูลค่าสต็อกรวม"
                    value={<>{totalValue.toLocaleString()} <span className="text-lg font-normal opacity-70">฿</span></>}
                    icon={Wallet}
                    color="emerald"
                    subtitle="คำนวณจากสินค้าคงเหลือทั้งหมด"
                />

                <StatCard
                    title="สินค้าทั้งหมด"
                    value={totalProducts}
                    icon={Package}
                    color="blue"
                    link="/products"
                    subtitle="รายการสินค้าที่ Active"
                />

                <StatCard
                    title="เคลื่อนไหววันนี้"
                    value={todayMovements}
                    icon={Activity}
                    color="purple"
                    subtitle="รายการ รับ/เบิก วันนี้"
                />

                <StatCard
                    title="ทรัพย์สินถาวร"
                    value={totalAssets}
                    icon={Briefcase}
                    color="orange"
                    link="/assets"
                    subtitle="ครุภัณฑ์และอุปกรณ์"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* Left Column: Charts (Span 2) */}
                <div className="xl:col-span-2 space-y-8">
                    {/* Charts Component */}
                    <DashboardCharts />

                    {/* Quick Actions */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                            <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
                            เมนูด่วน (Quick Actions)
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Link href="/stock/adjust" className="group p-4 rounded-xl border border-gray-100 hover:border-blue-200 bg-gray-50 hover:bg-blue-50 transition-all text-center">
                                <div className="w-10 h-10 mx-auto bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                                <div className="font-semibold text-gray-700 group-hover:text-blue-700">ปรับ/เบิก</div>
                            </Link>
                            <Link href="/products/new" className="group p-4 rounded-xl border border-gray-100 hover:border-green-200 bg-gray-50 hover:bg-green-50 transition-all text-center">
                                <div className="w-10 h-10 mx-auto bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                    <Package className="w-5 h-5" />
                                </div>
                                <div className="font-semibold text-gray-700 group-hover:text-green-700">สินค้าใหม่</div>
                            </Link>
                            <Link href="/borrow/new" className="group p-4 rounded-xl border border-gray-100 hover:border-orange-200 bg-gray-50 hover:bg-orange-50 transition-all text-center">
                                <div className="w-10 h-10 mx-auto bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div className="font-semibold text-gray-700 group-hover:text-orange-700">ยืม-คืน</div>
                            </Link>
                            <Link href="/purchase-orders/new" className="group p-4 rounded-xl border border-gray-100 hover:border-purple-200 bg-gray-50 hover:bg-purple-50 transition-all text-center">
                                <div className="w-10 h-10 mx-auto bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                                <div className="font-semibold text-gray-700 group-hover:text-purple-700">สั่งซื้อ (PO)</div>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Right Column: Alerts and Recent Activity */}
                <div className="space-y-8">

                    {/* Low Stock Alert */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                        <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-red-50 to-white dark:from-red-900/30 dark:to-slate-800">
                            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-500" />
                                สินค้าต้องเติม
                                <span className="bg-red-100 dark:bg-red-100 text-red-600 dark:text-red-600 text-xs px-2 py-0.5 rounded-full">{lowStockList.length}</span>
                            </h3>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto bg-white dark:bg-slate-800">
                            {lowStockList.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    <Package className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                    <p>สต็อกเพียงพอทุกรายการ</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50 dark:divide-gray-100">
                                    {lowStockList.map(p => (
                                        <div key={p.p_id} className="p-4 hover:bg-gray-50 transition-colors">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-medium text-gray-800 dark:text-gray-200 text-sm line-clamp-1">{p.p_name}</span>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${p.p_count <= 0 ? 'bg-red-100 dark:bg-red-100 text-red-600 dark:text-red-600' : 'bg-orange-100 dark:bg-orange-100 text-orange-600 dark:text-orange-600'}`}>
                                                    {p.p_count <= 0 ? 'หมด' : `เหลือ ${p.p_count}`}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                                                <span>ขั้นต่ำ: {p.safety_stock}</span>
                                                <Link href={`/stock/adjust?id=${p.p_id}`} className="text-blue-600 dark:text-blue-600 hover:underline">
                                                    เติมของ
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                        <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Activity className="w-5 h-5 text-gray-500" />
                                ความเคลื่อนไหวล่าสุด
                            </h3>
                            <Link href="/movements" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                                ดูทั้งหมด
                            </Link>
                        </div>
                        <div className="divide-y divide-gray-50 dark:divide-gray-100">
                            {recentMovements.map(m => (
                                <div key={m.movement_id} className="p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                                    <div className={`p-2 rounded-lg shrink-0 ${m.movement_type === 'รับเข้า' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                        {m.movement_type === 'รับเข้า' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{pMap.get(m.p_id) || `Item #${m.p_id}`}</p>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            {new Date(m.movement_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                            <span>•</span>
                                            {m.remarks || 'ไม่มีบันทึก'}
                                        </p>
                                    </div>
                                    <div className={`font-bold text-sm ${m.movement_type === 'รับเข้า' ? 'text-green-600' : 'text-red-600'}`}>
                                        {m.movement_type === 'รับเข้า' ? '+' : '-'}{m.quantity}
                                    </div>
                                </div>
                            ))}
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
