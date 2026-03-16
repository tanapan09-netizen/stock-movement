'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
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
import { useSidebar } from '@/contexts/SidebarContext';
import QrScannerModal from './QrScannerModal';
import { QrCode } from 'lucide-react';


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
    const [showQrScanner, setShowQrScanner] = useState(false);
    const { collapsed, setCollapsed } = useSidebar();
    const [expandedSubMenu, setExpandedSubMenu] = useState<string | null>(
        pathname.startsWith('/admin') || pathname === '/roles' || pathname.startsWith('/settings') ? 'admin' : null
    );


    // Auto collapse on soft resize or link click on mobile
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        // Initial check
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleLinkClick = () => {
        if (isMobile && !collapsed) {
            setCollapsed(true);
        }
    };

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
            <div className={`flex flex-col h-full min-h-screen justify-between border-r border-white/5 bg-[#0f172a] text-white transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${collapsed ? 'w-20' : 'w-72 sm:w-64 md:w-72'}`}>
                {/* Luxury ambient glow */}
                <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-blue-500/10 via-purple-500/5 to-transparent blur-3xl pointer-events-none mix-blend-screen leading-none"></div>
                <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-blue-500/20 to-transparent"></div>

                <div className="overflow-y-auto relative z-10 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {/* Logo + Toggle */}
                    <div className="flex h-20 items-center justify-between border-b border-white/10 px-4">
                        {!collapsed && (
                            <div className="flex items-center gap-3 animate-in fade-in zoom-in duration-500">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30 ring-1 ring-white/20">
                                    <Package className="w-6 h-6 text-white drop-shadow-md" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent drop-shadow-sm">
                                        Stock Pro
                                    </h1>
                                    <p className="text-[10px] text-blue-200/70 uppercase tracking-widest font-medium mt-0.5">Management System</p>
                                </div>
                            </div>
                        )}
                        {collapsed && (
                            <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30 ring-1 ring-white/20 animate-in zoom-in duration-300">
                                <Package className="w-6 h-6 text-white" />
                            </div>
                        )}
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className={`group p-2 rounded-xl bg-slate-800/80 border border-slate-700/50 hover:bg-slate-700 hover:border-slate-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 active:scale-95 z-20 ${collapsed ? 'mx-auto mt-3' : ''}`}
                            title={collapsed ? 'ขยาย' : 'ย่อ'}
                        >
                            {collapsed ? <ChevronRight className="w-4 h-4 text-blue-400 group-hover:text-white transition-colors" /> : <ChevronLeft className="w-4 h-4 text-blue-400 group-hover:text-white transition-colors" />}
                        </button>
                    </div>

                    <nav className={`space-y-1 ${collapsed ? 'p-3' : 'p-4'}`}>

                        {/* ─── หน้าหลัก ─── */}
                        {can(PERMISSIONS.DASHBOARD) && (
                            <Link
                                href="/"
                                onClick={handleLinkClick}
                                className={`group flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all duration-300 ease-out hover:translate-x-1 ${isActive('/') ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/40 relative before:absolute before:inset-y-0 before:-left-3 before:w-1 before:bg-blue-400 before:rounded-r-full' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
                                title={collapsed ? 'Dashboard' : undefined}
                            >
                                <Home className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/') && 'group-hover:scale-110 group-hover:text-blue-400'}`} />
                                {!collapsed && <span className="truncate">Dashboard</span>}
                            </Link>
                        )}

                        {/* ─── เครื่องมือ ─── */}
                        <button
                            onClick={() => setShowQrScanner(true)}
                            className={`w-full group flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all duration-300 ease-out text-gray-300 hover:bg-white/10 hover:text-blue-400`}
                            title={collapsed ? 'สแกน QR' : undefined}
                        >
                            <QrCode className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 group-hover:scale-110`} />
                            {!collapsed && <span className="truncate text-left">สแกน QR ค้นหา</span>}
                        </button>

                        {/* ─── คลังสินค้า ─── */}
                        {(can(PERMISSIONS.PRODUCTS) || can(PERMISSIONS.MOVEMENTS) || can(PERMISSIONS.STOCK_ADJUST) || can(PERMISSIONS.BORROW)) && !collapsed && (
                            <div className="pt-5 pb-2 px-3 flex items-center gap-2">
                                <div className="h-px bg-gray-700 flex-1"></div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 truncate">📦 คลังสินค้า</p>
                                <div className="h-px bg-gray-700 flex-1"></div>
                            </div>
                        )}
                        {collapsed && (can(PERMISSIONS.PRODUCTS) || can(PERMISSIONS.MOVEMENTS)) && (
                            <div className="my-2 h-px bg-gray-700/60" />
                        )}

                        {can(PERMISSIONS.PRODUCTS) && (
                            <Link
                                href="/products"
                                onClick={handleLinkClick}
                                className={`group flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all duration-300 ease-out hover:translate-x-1 ${isActive('/products') ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/40 relative before:absolute before:inset-y-0 before:-left-3 before:w-1 before:bg-blue-400 before:rounded-r-full' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
                                title={collapsed ? 'รายการสินค้า' : undefined}
                            >
                                <Package className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/products') && 'group-hover:scale-110 group-hover:text-amber-400'}`} />
                                {!collapsed && <span className="truncate">รายการสินค้า</span>}
                            </Link>
                        )}

                        {can(PERMISSIONS.MOVEMENTS) && (
                            <Link
                                href="/movements"
                                onClick={handleLinkClick}
                                className={`group flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all duration-300 ease-out hover:translate-x-1 ${isActive('/movements') ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/40 relative before:absolute before:inset-y-0 before:-left-3 before:w-1 before:bg-blue-400 before:rounded-r-full' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
                                title={collapsed ? 'เคลื่อนไหวสินค้า' : undefined}
                            >
                                <ArrowRightLeft className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/movements') && 'group-hover:scale-110 group-hover:text-green-400'}`} />
                                {!collapsed && <span className="truncate">เคลื่อนไหวสินค้า</span>}
                            </Link>
                        )}

                        {can(PERMISSIONS.STOCK_ADJUST) && (
                            <Link
                                href="/stock/adjust"
                                onClick={handleLinkClick}
                                className={`group flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all duration-300 ease-out hover:translate-x-1 ${isActive('/stock/adjust') ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/40 relative before:absolute before:inset-y-0 before:-left-3 before:w-1 before:bg-blue-400 before:rounded-r-full' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
                                title={collapsed ? 'ปรับสต็อก' : undefined}
                            >
                                <FileInput className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/stock/adjust') && 'group-hover:scale-110 group-hover:text-orange-400'}`} />
                                {!collapsed && <span className="truncate">ปรับสต็อก (เข้า/ออก)</span>}
                            </Link>
                        )}

                        {can(PERMISSIONS.BORROW) && (
                            <Link
                                href="/borrow"
                                onClick={handleLinkClick}
                                className={`group flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all duration-300 ease-out hover:translate-x-1 ${isActive('/borrow') ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/40 relative before:absolute before:inset-y-0 before:-left-3 before:w-1 before:bg-blue-400 before:rounded-r-full' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
                                title={collapsed ? 'ยืม/คืน สินค้า' : undefined}
                            >
                                <Hand className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/borrow') && 'group-hover:scale-110 group-hover:text-purple-400'}`} />
                                {!collapsed && <span className="truncate">ยืม/คืน สินค้า</span>}
                            </Link>
                        )}

                        {can(PERMISSIONS.ASSETS) && (
                            <Link
                                href="/assets"
                                onClick={handleLinkClick}
                                className={`group flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all duration-300 ease-out hover:translate-x-1 ${isActive('/assets') ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/40 relative before:absolute before:inset-y-0 before:-left-3 before:w-1 before:bg-blue-400 before:rounded-r-full' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
                                title={collapsed ? 'ทะเบียนทรัพย์สิน' : undefined}
                            >
                                <Briefcase className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/assets') && 'group-hover:scale-110 group-hover:text-teal-400'}`} />
                                {!collapsed && <span className="truncate">ทะเบียนทรัพย์สิน</span>}
                            </Link>
                        )}

                        {/* ─── งานซ่อมบำรุง ─── */}
                        {(can(PERMISSIONS.MAINTENANCE) || can(PERMISSIONS.MAINTENANCE_DASHBOARD)) && !collapsed && (
                            <div className="pt-5 pb-2 px-3 flex items-center gap-2">
                                <div className="h-px bg-gray-700 flex-1"></div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 truncate">🔧 งานซ่อมบำรุง</p>
                                <div className="h-px bg-gray-700 flex-1"></div>
                            </div>
                        )}
                        {collapsed && (can(PERMISSIONS.MAINTENANCE) || can(PERMISSIONS.MAINTENANCE_DASHBOARD)) && (
                            <div className="my-2 h-px bg-gray-700/60" />
                        )}

                        {can(PERMISSIONS.MAINTENANCE) && (
                            <Link
                                href="/general-request"
                                onClick={handleLinkClick}
                                className={`group flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all duration-300 ease-out hover:translate-x-1 ${isActive('/general-request') ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/40 relative before:absolute before:inset-y-0 before:-left-3 before:w-1 before:bg-blue-400 before:rounded-r-full' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
                                title={collapsed ? 'รับแจ้งซ่อม' : undefined}
                            >
                                <svg className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/general-request') && 'group-hover:scale-110 group-hover:text-cyan-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                {!collapsed && <span className="truncate">รับเรื่อง</span>}
                            </Link>
                        )}

                        {can(PERMISSIONS.MAINTENANCE) && (
                            <Link
                                href="/maintenance"
                                onClick={handleLinkClick}
                                className={`group flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all duration-300 ease-out hover:translate-x-1 ${isActive('/maintenance') ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/40 relative before:absolute before:inset-y-0 before:-left-3 before:w-1 before:bg-blue-400 before:rounded-r-full' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
                                title={collapsed ? 'แจ้งซ่อม' : undefined}
                            >
                                <Wrench className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/maintenance') && 'group-hover:scale-110 group-hover:text-cyan-400'}`} />
                                {!collapsed && <span className="truncate">แจ้งซ่อม </span>}
                            </Link>
                        )}

                        

                        {can(PERMISSIONS.MAINTENANCE_DASHBOARD) && (
                            <Link
                                href="/maintenance/dashboard"
                                onClick={handleLinkClick}
                                className={`group flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all duration-300 ease-out hover:translate-x-1 ${isActive('/maintenance/dashboard') ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/40 relative before:absolute before:inset-y-0 before:-left-3 before:w-1 before:bg-blue-400 before:rounded-r-full' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
                                title={collapsed ? 'Technician Dashboard' : undefined}
                            >
                                <BarChart3 className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/maintenance/dashboard') && 'group-hover:scale-110 group-hover:text-blue-300'}`} />
                                {!collapsed && <span className="truncate">Technician Dashboard</span>}
                            </Link>
                        )}

                        {can(PERMISSIONS.MAINTENANCE_TECHNICIANS) && (
                            <Link
                                href="/maintenance/technicians"
                                onClick={handleLinkClick}
                                className={`group flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all duration-300 ease-out hover:translate-x-1 ${isActive('/maintenance/technicians') ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/40 relative before:absolute before:inset-y-0 before:-left-3 before:w-1 before:bg-blue-400 before:rounded-r-full' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
                                title={collapsed ? 'จัดการช่าง' : undefined}
                            >
                                <Briefcase className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/maintenance/technicians') && 'group-hover:scale-110 group-hover:text-teal-400'}`} />
                                {!collapsed && <span className="truncate">จัดการช่าง</span>}
                            </Link>
                        )}

                        {can(PERMISSIONS.MAINTENANCE_PARTS) && (
                            <Link
                                href="/maintenance/parts"
                                onClick={handleLinkClick}
                                className={`group flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all duration-300 ease-out hover:translate-x-1 ${isActive('/maintenance/parts') ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/40 relative before:absolute before:inset-y-0 before:-left-3 before:w-1 before:bg-blue-400 before:rounded-r-full' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
                                title={collapsed ? 'เบิก/คืนอะไหล่' : undefined}
                            >
                                <Package className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/maintenance/parts') && 'group-hover:scale-110 group-hover:text-amber-400'}`} />
                                {!collapsed && <span className="truncate">เบิก/คืนอะไหล่</span>}
                            </Link>
                        )}

                        {can(PERMISSIONS.MAINTENANCE_REQUESTS) && (
                            <Link
                                href="/maintenance/part-requests"
                                onClick={handleLinkClick}
                                className={`group flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all duration-300 ease-out hover:translate-x-1 ${isActive('/maintenance/part-requests') ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/40 relative before:absolute before:inset-y-0 before:-left-3 before:w-1 before:bg-blue-400 before:rounded-r-full' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
                                title={collapsed ? 'ขอซื้ออะไหล่' : undefined}
                            >
                                <FileText className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/maintenance/part-requests') && 'group-hover:scale-110 group-hover:text-rose-400'}`} />
                                {!collapsed && <span className="truncate">ขอซื้ออะไหล่</span>}
                            </Link>
                        )}

                        {can(PERMISSIONS.MAINTENANCE_REPORTS) && (
                            <Link
                                href="/reports/maintenance"
                                onClick={handleLinkClick}
                                className={`group flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all duration-300 ease-out hover:translate-x-1 ${isActive('/reports/maintenance') ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/40 relative before:absolute before:inset-y-0 before:-left-3 before:w-1 before:bg-blue-400 before:rounded-r-full' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
                                title={collapsed ? 'รายงานแจ้งซ่อม' : undefined}
                            >
                                <ClipboardList className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/reports/maintenance') && 'group-hover:scale-110 group-hover:text-emerald-400'}`} />
                                {!collapsed && <span className="truncate">รายงานแจ้งซ่อม</span>}
                            </Link>
                        )}

                        {/* ─── คำขออนุมัติ ─── */}
                        {can(PERMISSIONS.APPROVALS) && !collapsed && (
                            <div className="pt-5 pb-2 px-3 flex items-center gap-2">
                                <div className="h-px bg-gray-700 flex-1"></div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400 truncate">📝 คำขออนุมัติ</p>
                                <div className="h-px bg-gray-700 flex-1"></div>
                            </div>
                        )}
                        {can(PERMISSIONS.APPROVALS) && collapsed && (
                            <div className="my-2 h-px bg-gray-700/60" />
                        )}

                        {can(PERMISSIONS.APPROVALS) && (
                            <Link
                                href="/approvals"
                                onClick={handleLinkClick}
                                className={`group flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all duration-300 ease-out hover:translate-x-1 ${isActive('/approvals') ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-lg shadow-violet-500/40 relative before:absolute before:inset-y-0 before:-left-3 before:w-1 before:bg-violet-400 before:rounded-r-full' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
                                title={collapsed ? 'คำขอทั่วไป (OT/ลา/เบิก)' : undefined}
                            >
                                <FileText className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/approvals') && 'group-hover:scale-110 group-hover:text-violet-400'}`} />
                                {!collapsed && <span className="truncate">คำขอทั่วไป (OT/ลา/เบิก)</span>}
                            </Link>
                        )}

                        {/* ─── การเงิน & เบิกจ่าย ─── */}
                        {can(PERMISSIONS.PETTY_CASH) && !collapsed && (
                            <div className="pt-5 pb-2 px-3 flex items-center gap-2">
                                <div className="h-px bg-gray-700 flex-1"></div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 truncate">💰 การเงิน & เบิกจ่าย</p>
                                <div className="h-px bg-gray-700 flex-1"></div>
                            </div>
                        )}
                        {can(PERMISSIONS.PETTY_CASH) && collapsed && (
                            <div className="my-2 h-px bg-gray-700/60" />
                        )}

                        {can(PERMISSIONS.PETTY_CASH) && (
                            <Link
                                href="/petty-cash"
                                onClick={handleLinkClick}
                                className={`group flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all duration-300 ease-out hover:translate-x-1 ${isActive('/petty-cash') ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/40 relative before:absolute before:inset-y-0 before:-left-3 before:w-1 before:bg-emerald-400 before:rounded-r-full' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
                                title={collapsed ? 'เบิกเงินสดย่อย' : undefined}
                            >
                                <DollarSign className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/petty-cash') && 'group-hover:scale-110 group-hover:text-emerald-400 group-hover:rotate-12'}`} />
                                {!collapsed && <span className="truncate">เบิกเงินสดย่อย</span>}
                            </Link>
                        )}

                        {/* ─── การจัดการ (Admin) ─── */}
                        {(can(PERMISSIONS.ADMIN_PO) || can(PERMISSIONS.ADMIN_SUPPLIERS) || can(PERMISSIONS.ADMIN_WAREHOUSES) || can(PERMISSIONS.ADMIN_CATEGORIES)) && !collapsed && (
                            <div className="pt-5 pb-2 px-3 flex items-center gap-2">
                                <div className="h-px bg-gray-700 flex-1"></div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 truncate">🏢 การจัดการ</p>
                                <div className="h-px bg-gray-700 flex-1"></div>
                            </div>
                        )}
                        {collapsed && (can(PERMISSIONS.ADMIN_PO) || can(PERMISSIONS.ADMIN_SUPPLIERS)) && (
                            <div className="my-2 h-px bg-gray-700/60" />
                        )}

                        {can(PERMISSIONS.ADMIN_PO) && (
                            <Link href="/purchase-orders" onClick={handleLinkClick} className={`group flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all duration-300 ease-out hover:translate-x-1 ${isActive('/purchase-orders') ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/40 relative before:absolute before:inset-y-0 before:-left-3 before:w-1 before:bg-blue-400 before:rounded-r-full' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`} title={collapsed ? 'ใบสั่งซื้อ (PO)' : undefined}>
                                <FileText className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/purchase-orders') && 'group-hover:scale-110 group-hover:text-indigo-400'}`} />
                                {!collapsed && <span className="truncate">ใบสั่งซื้อ (PO)</span>}
                            </Link>
                        )}

                        {can(PERMISSIONS.ADMIN_SUPPLIERS) && (
                            <Link href="/suppliers" onClick={handleLinkClick} className={`group flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all duration-300 ease-out hover:translate-x-1 ${isActive('/suppliers') ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/40 relative before:absolute before:inset-y-0 before:-left-3 before:w-1 before:bg-blue-400 before:rounded-r-full' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`} title={collapsed ? 'จัดการผู้ขาย' : undefined}>
                                <Truck className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/suppliers') && 'group-hover:scale-110 group-hover:translate-x-1 group-hover:text-slate-400'}`} />
                                {!collapsed && <span className="truncate">จัดการผู้ขาย</span>}
                            </Link>
                        )}

                        {can(PERMISSIONS.ADMIN_WAREHOUSES) && (
                            <Link href="/warehouses" onClick={handleLinkClick} className={`group flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all duration-300 ease-out hover:translate-x-1 ${isActive('/warehouses') ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/40 relative before:absolute before:inset-y-0 before:-left-3 before:w-1 before:bg-blue-400 before:rounded-r-full' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`} title={collapsed ? 'คลังสินค้า' : undefined}>
                                <Warehouse className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/warehouses') && 'group-hover:scale-110 group-hover:text-amber-500'}`} />
                                {!collapsed && <span className="truncate">คลังสินค้า</span>}
                            </Link>
                        )}

                        {can(PERMISSIONS.ADMIN_CATEGORIES) && (
                            <Link href="/categories" onClick={handleLinkClick} className={`group flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all duration-300 ease-out hover:translate-x-1 ${isActive('/categories') ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/40 relative before:absolute before:inset-y-0 before:-left-3 before:w-1 before:bg-blue-400 before:rounded-r-full' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`} title={collapsed ? 'หมวดหมู่สินค้า' : undefined}>
                                <Tag className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/categories') && 'group-hover:scale-110 group-hover:text-pink-400 group-hover:rotate-12'}`} />
                                {!collapsed && <span className="truncate">หมวดหมู่สินค้า</span>}
                            </Link>
                        )}

                        {/* ─── รายงาน & ข้อมูล ─── */}
                        {(can(PERMISSIONS.ADMIN_REPORTS) || can(PERMISSIONS.ADMIN_AUDIT)) && !collapsed && (
                            <div className="pt-5 pb-2 px-3 flex items-center gap-2">
                                <div className="h-px bg-gray-700 flex-1"></div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-400 truncate">📊 รายงาน & ข้อมูล</p>
                                <div className="h-px bg-gray-700 flex-1"></div>
                            </div>
                        )}
                        {collapsed && (can(PERMISSIONS.ADMIN_REPORTS) || can(PERMISSIONS.ADMIN_AUDIT)) && (
                            <div className="my-2 h-px bg-gray-700/60" />
                        )}

                        {can(PERMISSIONS.ADMIN_REPORTS) && (
                            <Link href="/reports" onClick={handleLinkClick} className={`group flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all duration-300 ease-out hover:translate-x-1 ${isActive('/reports') ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/40 relative before:absolute before:inset-y-0 before:-left-3 before:w-1 before:bg-blue-400 before:rounded-r-full' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`} title={collapsed ? 'รายงานขั้นสูง' : undefined}>
                                <BarChart3 className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/reports') && 'group-hover:scale-110 group-hover:text-fuchsia-400'}`} />
                                {!collapsed && <span className="truncate">รายงานขั้นสูง</span>}
                            </Link>
                        )}

                        {can(PERMISSIONS.ADMIN_AUDIT) && (
                            <Link href="/inventory-audit" onClick={handleLinkClick} className={`group flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all duration-300 ease-out hover:translate-x-1 ${isActive('/inventory-audit') ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/40 relative before:absolute before:inset-y-0 before:-left-3 before:w-1 before:bg-blue-400 before:rounded-r-full' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`} title={collapsed ? 'ตรวจนับสินค้า' : undefined}>
                                <ClipboardList className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/inventory-audit') && 'group-hover:scale-110 group-hover:text-emerald-400'}`} />
                                {!collapsed && <span className="truncate">ตรวจนับสินค้า</span>}
                            </Link>
                        )}

                        {/* ─── ผู้ดูแลระบบ ─── */}
                        {(can(PERMISSIONS.ADMIN_ROLES) || can(PERMISSIONS.ADMIN_SETTINGS) || can(PERMISSIONS.ADMIN_SECURITY) || can(PERMISSIONS.ADMIN_ROOMS) || can(PERMISSIONS.ADMIN_LOGS)) && (
                            <>
                                {!collapsed ? (
                                    <div className="pt-5 pb-2 px-3 flex items-center gap-2">
                                        <div className="h-px bg-gray-700 flex-1"></div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate">⚙️ ระบบงาน</p>
                                        <div className="h-px bg-gray-700 flex-1"></div>
                                    </div>
                                ) : (
                                    <div className="my-2 h-px bg-gray-700/60" />
                                )}

                                {/* Collapsible Admin Group */}
                                <div>
                                    <button
                                        onClick={() => {
                                            if (collapsed) {
                                                setCollapsed(false);
                                                setExpandedSubMenu('admin');
                                            } else {
                                                setExpandedSubMenu(expandedSubMenu === 'admin' ? null : 'admin');
                                            }
                                        }}
                                        className={`w-full group flex items-center rounded-xl ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all duration-300 ease-out text-gray-300 hover:bg-white/10 hover:text-white mb-1`}
                                        title={collapsed ? 'ตั้งค่าระบบ' : undefined}
                                    >
                                        <Settings className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 group-hover:scale-110 group-hover:text-slate-300 group-hover:rotate-45`} />
                                        {!collapsed && (
                                            <>
                                                <span className="truncate flex-1 text-left">ตั้งค่าระบบ</span>
                                                <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${expandedSubMenu === 'admin' ? 'rotate-90' : ''}`} />
                                            </>
                                        )}
                                    </button>

                                    {/* Sub-menu items */}
                                    <div
                                        className={`overflow-hidden transition-all duration-300 ease-in-out ${(!collapsed && expandedSubMenu === 'admin') ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
                                    >
                                        <div className="space-y-1 mt-1">
                                            {can(PERMISSIONS.ADMIN_ROLES) && (
                                                <Link
                                                    href="/roles"
                                                    onClick={handleLinkClick}
                                                    className={`group flex items-center rounded-xl px-3 py-2 text-xs font-medium transition-all duration-300 ease-out translate-x-3 hover:translate-x-4 ${isActive('/roles') ? 'bg-white/15 text-yellow-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                                >
                                                    <Shield className={`mr-3 h-4 w-4 flex-shrink-0 transition-transform duration-300 ${!isActive('/roles') && 'group-hover:scale-110 group-hover:text-yellow-400'}`} />
                                                    <span className="truncate">จัดการบทบาท</span>
                                                </Link>
                                            )}

                                            {can(PERMISSIONS.ADMIN_ROOMS) && (
                                                <Link
                                                    href="/admin/rooms"
                                                    onClick={handleLinkClick}
                                                    className={`group flex items-center rounded-xl px-3 py-2 text-xs font-medium transition-all duration-300 ease-out translate-x-3 hover:translate-x-4 ${isActive('/admin/rooms') ? 'bg-white/15 text-blue-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                                >
                                                    <Warehouse className={`mr-3 h-4 w-4 flex-shrink-0 transition-transform duration-300 ${!isActive('/admin/rooms') && 'group-hover:scale-110 group-hover:text-slate-300'}`} />
                                                    <span className="truncate">จัดการห้อง</span>
                                                </Link>
                                            )}

                                            {can(PERMISSIONS.ADMIN_SECURITY) && (
                                                <Link
                                                    href="/admin/security"
                                                    onClick={handleLinkClick}
                                                    className={`group flex items-center rounded-xl px-3 py-2 text-xs font-medium transition-all duration-300 ease-out translate-x-3 hover:translate-x-4 ${isActive('/admin/security') ? 'bg-white/15 text-red-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                                >
                                                    <Shield className={`mr-3 h-4 w-4 flex-shrink-0 transition-transform duration-300 ${!isActive('/admin/security') && 'group-hover:scale-110 group-hover:text-red-400'}`} />
                                                    <span className="truncate">ความปลอดภัย</span>
                                                </Link>
                                            )}

                                            {can(PERMISSIONS.ADMIN_SETTINGS) && (
                                                <Link
                                                    href="/settings"
                                                    onClick={handleLinkClick}
                                                    className={`group flex items-center rounded-xl px-3 py-2 text-xs font-medium transition-all duration-300 ease-out translate-x-3 hover:translate-x-4 ${isActive('/settings') ? 'bg-white/15 text-indigo-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                                >
                                                    <Settings className={`mr-3 h-4 w-4 flex-shrink-0 transition-transform duration-300 ${!isActive('/settings') && 'group-hover:scale-110 group-hover:text-slate-300'}`} />
                                                    <span className="truncate">ตั้งค่าทั่วไป</span>
                                                </Link>
                                            )}

                                            {can(PERMISSIONS.ADMIN_LOGS) && (
                                                <Link
                                                    href="/settings/system-logs"
                                                    onClick={handleLinkClick}
                                                    className={`group flex items-center rounded-xl px-3 py-2 text-xs font-medium transition-all duration-300 ease-out translate-x-3 hover:translate-x-4 ${isActive('/settings/system-logs') ? 'bg-white/15 text-blue-300' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                                >
                                                    <ScrollText className={`mr-3 h-4 w-4 flex-shrink-0 transition-transform duration-300 ${!isActive('/settings/system-logs') && 'group-hover:scale-110 group-hover:text-blue-300'}`} />
                                                    <span className="truncate">ประวัติการใช้งาน</span>
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                    </nav>
                </div>

                <div className={`border-t border-white/5 relative z-10 bg-slate-900/50 backdrop-blur-md ${collapsed ? 'p-3' : 'p-5'}`}>
                    <div className={`flex items-center ${collapsed ? 'justify-center' : ''} mb-5 animate-in fade-in duration-500 delay-150`}>
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-lg shadow-md ring-2 ring-white/10" title={collapsed ? user?.name : undefined}>
                            {user?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        {!collapsed && (
                            <div className="ml-4 overflow-hidden">
                                <div className="text-sm font-bold text-white truncate drop-shadow-sm">{user?.name}</div>
                                <div className="text-[11px] text-blue-300/80 uppercase tracking-widest font-medium mt-0.5">{role}</div>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleLogout}
                        className={`group w-full flex items-center justify-center rounded-xl bg-gradient-to-r from-red-600/90 to-red-500/90 hover:from-red-500 hover:to-red-400 shadow-lg shadow-red-900/20 hover:shadow-red-500/30 border border-red-500/40 ${collapsed ? 'p-2.5' : 'px-4 py-2.5'} text-sm font-medium text-white transition-all duration-300 active:scale-95`}
                        title={collapsed ? 'ออกจากระบบ' : undefined}
                    >
                        <LogOut className={`${collapsed ? 'h-4 w-4' : 'mr-2 h-4 w-4'} transition-transform duration-300 group-hover:-translate-x-1`} />
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

            {/* QR Scanner Modal */}
            <QrScannerModal
                isOpen={showQrScanner}
                onClose={() => setShowQrScanner(false)}
            />
        </>
    );
}

