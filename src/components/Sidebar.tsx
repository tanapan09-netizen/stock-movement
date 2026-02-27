'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
    Home,
    Package,
    ArrowRightLeft,
    FileInput,
    Hand,
    Truck,
    Tag,
    Shield,
    DollarSign,
    FileText,
    Warehouse,
    ClipboardList,
    Settings,
    LogOut,
    Briefcase,
    BarChart3,
    AlertTriangle,
    Wrench,
    ChevronLeft,
    ChevronRight,
    ScrollText
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { PERMISSIONS, RolePermissions } from '@/lib/permissions';

interface SidebarProps {
    permissions?: RolePermissions;
}

export default function Sidebar(props: SidebarProps) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const user = session?.user as any;
    const role = user?.role || 'user';

    // Default to empty permissions if not provided (will be fixed by layout)
    const permissions = props.permissions || {};

    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    const isActive = (path: string) => pathname === path;
    const can = (key: string) => !!permissions[key];

    const handleLogout = () => {
        setShowLogoutConfirm(true);
    };

    const confirmLogout = () => {
        signOut({ callbackUrl: '/login' });
    };

    return (
        <>
            <div className={`flex h-screen flex-col justify-between border-r border-gray-800/50 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
                <div className="overflow-y-auto">
                    {/* Logo + Toggle */}
                    <div className="flex h-20 items-center justify-between border-b border-gray-700/50 px-3">
                        {!collapsed && (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                                    <Package className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                        Stock Pro
                                    </h1>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Management System</p>
                                </div>
                            </div>
                        )}
                        {collapsed && (
                            <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                                <Package className="w-6 h-6 text-white" />
                            </div>
                        )}
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className={`p-1.5 rounded-lg hover:bg-gray-700 transition ${collapsed ? 'mx-auto mt-2' : ''}`}
                            title={collapsed ? 'ขยาย' : 'ย่อ'}
                        >
                            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                        </button>
                    </div>

                    <nav className={`space-y-0.5 ${collapsed ? 'p-2' : 'p-3'}`}>

                        {/* ─── หน้าหลัก ─── */}
                        {can(PERMISSIONS.DASHBOARD) && (
                            <Link
                                href="/"
                                className={`flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all ${isActive('/') ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                                title={collapsed ? 'Dashboard' : undefined}
                            >
                                <Home className={collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} />
                                {!collapsed && 'Dashboard'}
                            </Link>
                        )}

                        {/* ─── คลังสินค้า ─── */}
                        {(can(PERMISSIONS.PRODUCTS) || can(PERMISSIONS.MOVEMENTS) || can(PERMISSIONS.STOCK_ADJUST) || can(PERMISSIONS.BORROW)) && !collapsed && (
                            <div className="pt-5 pb-1.5 px-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">📦 คลังสินค้า</p>
                            </div>
                        )}
                        {collapsed && (can(PERMISSIONS.PRODUCTS) || can(PERMISSIONS.MOVEMENTS)) && (
                            <div className="my-2 h-px bg-gray-700/60" />
                        )}

                        {can(PERMISSIONS.PRODUCTS) && (
                            <Link
                                href="/products"
                                className={`flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all ${isActive('/products') ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                                title={collapsed ? 'รายการสินค้า' : undefined}
                            >
                                <Package className={collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} />
                                {!collapsed && 'รายการสินค้า'}
                            </Link>
                        )}

                        {can(PERMISSIONS.MOVEMENTS) && (
                            <Link
                                href="/movements"
                                className={`flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all ${isActive('/movements') ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                                title={collapsed ? 'เคลื่อนไหวสินค้า' : undefined}
                            >
                                <ArrowRightLeft className={collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} />
                                {!collapsed && 'เคลื่อนไหวสินค้า'}
                            </Link>
                        )}

                        {can(PERMISSIONS.STOCK_ADJUST) && (
                            <Link
                                href="/stock/adjust"
                                className={`flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all ${isActive('/stock/adjust') ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                                title={collapsed ? 'ปรับสต็อก' : undefined}
                            >
                                <FileInput className={collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} />
                                {!collapsed && 'ปรับสต็อก (เข้า/ออก)'}
                            </Link>
                        )}

                        {can(PERMISSIONS.BORROW) && (
                            <Link
                                href="/borrow"
                                className={`flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all ${isActive('/borrow') ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                                title={collapsed ? 'ยืม/คืน สินค้า' : undefined}
                            >
                                <Hand className={collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} />
                                {!collapsed && 'ยืม/คืน สินค้า'}
                            </Link>
                        )}

                        {can(PERMISSIONS.ASSETS) && (
                            <Link
                                href="/assets"
                                className={`flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all ${isActive('/assets') ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                                title={collapsed ? 'ทะเบียนทรัพย์สิน' : undefined}
                            >
                                <Briefcase className={collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} />
                                {!collapsed && 'ทะเบียนทรัพย์สิน'}
                            </Link>
                        )}

                        {/* ─── งานซ่อมบำรุง ─── */}
                        {(can(PERMISSIONS.MAINTENANCE) || can(PERMISSIONS.MAINTENANCE_DASHBOARD)) && !collapsed && (
                            <div className="pt-5 pb-1.5 px-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">🔧 งานซ่อมบำรุง</p>
                            </div>
                        )}
                        {collapsed && (can(PERMISSIONS.MAINTENANCE) || can(PERMISSIONS.MAINTENANCE_DASHBOARD)) && (
                            <div className="my-2 h-px bg-gray-700/60" />
                        )}

                        {can(PERMISSIONS.MAINTENANCE) && (
                            <Link
                                href="/maintenance"
                                className={`flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all ${isActive('/maintenance') ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                                title={collapsed ? 'แจ้งซ่อม' : undefined}
                            >
                                <Wrench className={collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} />
                                {!collapsed && 'แจ้งซ่อม'}
                            </Link>
                        )}

                        {can(PERMISSIONS.MAINTENANCE_DASHBOARD) && (
                            <Link
                                href="/maintenance/dashboard"
                                className={`flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all ${isActive('/maintenance/dashboard') ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                                title={collapsed ? 'Dashboard งานซ่อม' : undefined}
                            >
                                <BarChart3 className={collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} />
                                {!collapsed && 'Dashboard งานซ่อม'}
                            </Link>
                        )}

                        {can(PERMISSIONS.MAINTENANCE_TECHNICIANS) && (
                            <Link
                                href="/maintenance/technicians"
                                className={`flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all ${isActive('/maintenance/technicians') ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                                title={collapsed ? 'จัดการช่าง' : undefined}
                            >
                                <Briefcase className={collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} />
                                {!collapsed && 'จัดการช่าง'}
                            </Link>
                        )}

                        {can(PERMISSIONS.MAINTENANCE_PARTS) && (
                            <Link
                                href="/maintenance/parts"
                                className={`flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all ${isActive('/maintenance/parts') ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                                title={collapsed ? 'เบิก/คืนอะไหล่' : undefined}
                            >
                                <Package className={collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} />
                                {!collapsed && 'เบิก/คืนอะไหล่'}
                            </Link>
                        )}

                        {can(PERMISSIONS.MAINTENANCE_REQUESTS) && (
                            <Link
                                href="/maintenance/part-requests"
                                className={`flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all ${isActive('/maintenance/part-requests') ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                                title={collapsed ? 'ขอซื้ออะไหล่' : undefined}
                            >
                                <FileText className={collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} />
                                {!collapsed && 'ขอซื้ออะไหล่'}
                            </Link>
                        )}

                        {can(PERMISSIONS.MAINTENANCE_REPORTS) && (
                            <Link
                                href="/reports/maintenance"
                                className={`flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all ${isActive('/reports/maintenance') ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                                title={collapsed ? 'รายงานแจ้งซ่อม' : undefined}
                            >
                                <ClipboardList className={collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} />
                                {!collapsed && 'รายงานแจ้งซ่อม'}
                            </Link>
                        )}

                        {/* ─── การเงิน & เบิกจ่าย ─── */}
                        {can(PERMISSIONS.PETTY_CASH) && !collapsed && (
                            <div className="pt-5 pb-1.5 px-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">💰 การเงิน & เบิกจ่าย</p>
                            </div>
                        )}
                        {can(PERMISSIONS.PETTY_CASH) && collapsed && (
                            <div className="my-2 h-px bg-gray-700/60" />
                        )}

                        {can(PERMISSIONS.PETTY_CASH) && (
                            <Link
                                href="/petty-cash"
                                className={`flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all ${isActive('/petty-cash') ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                                title={collapsed ? 'เบิกเงินสดย่อย' : undefined}
                            >
                                <DollarSign className={collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} />
                                {!collapsed && 'เบิกเงินสดย่อย (Petty Cash)'}
                            </Link>
                        )}

                        {/* ─── การจัดการ (Admin) ─── */}
                        {(can(PERMISSIONS.ADMIN_PO) || can(PERMISSIONS.ADMIN_SUPPLIERS) || can(PERMISSIONS.ADMIN_WAREHOUSES) || can(PERMISSIONS.ADMIN_CATEGORIES)) && !collapsed && (
                            <div className="pt-5 pb-1.5 px-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">🏢 การจัดการ</p>
                            </div>
                        )}
                        {collapsed && (can(PERMISSIONS.ADMIN_PO) || can(PERMISSIONS.ADMIN_SUPPLIERS)) && (
                            <div className="my-2 h-px bg-gray-700/60" />
                        )}

                        {can(PERMISSIONS.ADMIN_PO) && (
                            <Link href="/purchase-orders" className={`flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all text-gray-300 hover:bg-white/5 hover:text-white`} title={collapsed ? 'ใบสั่งซื้อ (PO)' : undefined}>
                                <FileText className={collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} />
                                {!collapsed && 'ใบสั่งซื้อ (PO)'}
                            </Link>
                        )}

                        {can(PERMISSIONS.ADMIN_SUPPLIERS) && (
                            <Link href="/suppliers" className={`flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all text-gray-300 hover:bg-white/5 hover:text-white`} title={collapsed ? 'จัดการผู้ขาย' : undefined}>
                                <Truck className={collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} />
                                {!collapsed && 'จัดการผู้ขาย'}
                            </Link>
                        )}

                        {can(PERMISSIONS.ADMIN_WAREHOUSES) && (
                            <Link href="/warehouses" className={`flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all text-gray-300 hover:bg-white/5 hover:text-white`} title={collapsed ? 'คลังสินค้า' : undefined}>
                                <Warehouse className={collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} />
                                {!collapsed && 'คลังสินค้า'}
                            </Link>
                        )}

                        {can(PERMISSIONS.ADMIN_CATEGORIES) && (
                            <Link href="/categories" className={`flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all text-gray-300 hover:bg-white/5 hover:text-white`} title={collapsed ? 'หมวดหมู่สินค้า' : undefined}>
                                <Tag className={collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} />
                                {!collapsed && 'หมวดหมู่สินค้า'}
                            </Link>
                        )}

                        {/* ─── รายงาน & ข้อมูล ─── */}
                        {(can(PERMISSIONS.ADMIN_REPORTS) || can(PERMISSIONS.ADMIN_AUDIT)) && !collapsed && (
                            <div className="pt-5 pb-1.5 px-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">📊 รายงาน & ข้อมูล</p>
                            </div>
                        )}
                        {collapsed && (can(PERMISSIONS.ADMIN_REPORTS) || can(PERMISSIONS.ADMIN_AUDIT)) && (
                            <div className="my-2 h-px bg-gray-700/60" />
                        )}

                        {can(PERMISSIONS.ADMIN_REPORTS) && (
                            <Link href="/reports" className={`flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all text-gray-300 hover:bg-white/5 hover:text-white`} title={collapsed ? 'รายงานขั้นสูง' : undefined}>
                                <BarChart3 className={collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} />
                                {!collapsed && 'รายงานขั้นสูง'}
                            </Link>
                        )}

                        {can(PERMISSIONS.ADMIN_AUDIT) && (
                            <Link href="/inventory-audit" className={`flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all text-gray-300 hover:bg-white/5 hover:text-white`} title={collapsed ? 'ตรวจนับสินค้า' : undefined}>
                                <ClipboardList className={collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} />
                                {!collapsed && 'ตรวจนับสินค้า'}
                            </Link>
                        )}

                        {/* ─── ผู้ดูแลระบบ ─── */}
                        {(can(PERMISSIONS.ADMIN_ROLES) || can(PERMISSIONS.ADMIN_SETTINGS) || can(PERMISSIONS.ADMIN_SECURITY) || can(PERMISSIONS.ADMIN_ROOMS) || can(PERMISSIONS.ADMIN_LOGS)) && !collapsed && (
                            <div className="pt-5 pb-1.5 px-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">⚙️ ผู้ดูแลระบบ</p>
                            </div>
                        )}
                        {collapsed && (can(PERMISSIONS.ADMIN_ROLES) || can(PERMISSIONS.ADMIN_SETTINGS)) && (
                            <div className="my-2 h-px bg-gray-700/60" />
                        )}

                        {can(PERMISSIONS.ADMIN_ROLES) && (
                            <Link href="/roles" className={`flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all text-gray-300 hover:bg-white/5 hover:text-white`} title={collapsed ? 'จัดการบทบาท' : undefined}>
                                <Shield className={collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} />
                                {!collapsed && 'จัดการบทบาท'}
                            </Link>
                        )}

                        {can(PERMISSIONS.ADMIN_ROOMS) && (
                            <Link href="/admin/rooms" className={`flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all text-gray-300 hover:bg-white/5 hover:text-white`} title={collapsed ? 'จัดการห้อง' : undefined}>
                                <Warehouse className={collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} />
                                {!collapsed && 'จัดการห้อง'}
                            </Link>
                        )}

                        {can(PERMISSIONS.ADMIN_SECURITY) && (
                            <Link href="/admin/security" className={`flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all text-gray-300 hover:bg-white/5 hover:text-white`} title={collapsed ? 'ความปลอดภัย' : undefined}>
                                <Shield className={collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} />
                                {!collapsed && 'ความปลอดภัย'}
                            </Link>
                        )}

                        {can(PERMISSIONS.ADMIN_SETTINGS) && (
                            <Link href="/settings" className={`flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all text-gray-300 hover:bg-white/5 hover:text-white`} title={collapsed ? 'ตั้งค่าระบบ' : undefined}>
                                <Settings className={collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} />
                                {!collapsed && 'ตั้งค่าระบบ'}
                            </Link>
                        )}

                        {can(PERMISSIONS.ADMIN_LOGS) && (
                            <Link href="/settings/system-logs" className={`flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all text-gray-300 hover:bg-white/5 hover:text-white`} title={collapsed ? 'ประวัติการใช้งาน' : undefined}>
                                <ScrollText className={collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} />
                                {!collapsed && 'ประวัติการใช้งาน'}
                            </Link>
                        )}
                    </nav>
                </div>

                <div className={`border-t border-gray-800 ${collapsed ? 'p-2' : 'p-4'}`}>
                    <div className={`flex items-center ${collapsed ? 'justify-center' : ''} mb-4`}>
                        <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center font-bold" title={collapsed ? user?.name : undefined}>
                            {user?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        {!collapsed && (
                            <div className="ml-3">
                                <div className="text-sm font-medium text-white">{user?.name}</div>
                                <div className="text-xs text-gray-400">{role}</div>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center justify-center rounded-lg bg-red-600 ${collapsed ? 'p-2' : 'px-4 py-2'} text-sm font-medium text-white hover:bg-red-700`}
                        title={collapsed ? 'ออกจากระบบ' : undefined}
                    >
                        <LogOut className={collapsed ? 'h-4 w-4' : 'mr-2 h-4 w-4'} />
                        {!collapsed && 'ออกจากระบบ'}
                    </button>
                </div>
            </div>

            {/* Logout Confirmation Dialog */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 bg-red-500 text-center">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                <AlertTriangle className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white">ยืนยันออกจากระบบ</h3>
                        </div>

                        {/* Content */}
                        <div className="p-6 text-center">
                            <p className="text-gray-600">คุณต้องการออกจากระบบหรือไม่?</p>
                            <p className="text-sm text-gray-400 mt-2">คุณจะถูกนำไปยังหน้าเข้าสู่ระบบ</p>
                        </div>

                        {/* Actions */}
                        <div className="p-4 border-t bg-gray-50 flex gap-3">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl transition"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={confirmLogout}
                                className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition"
                            >
                                ออกจากระบบ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

