'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
    ShoppingCart,
    Wrench,
    Users,
    ChevronLeft,
    ChevronRight,
    ScrollText
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { PERMISSIONS, RolePermissions } from '@/lib/permissions';
import { useSidebar } from '@/contexts/SidebarContext';
import QrScannerModal from './QrScannerModal';
import { QrCode } from 'lucide-react';
import { getRoleDisplayName, isAdminRole, isDepartmentRole, isManagerRole } from '@/lib/roles';
import { canAccessDashboardPage } from '@/lib/rbac';


interface SidebarProps {
    permissions?: RolePermissions;
}
export default function Sidebar(props: SidebarProps) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const user = session?.user as { role?: string; name?: string | null; is_approver?: boolean } | undefined;
    const role = user?.role || 'user';
    const normalizedRole = String(role).toLowerCase();
    const isPurchasingTeam = isDepartmentRole(normalizedRole, 'purchasing');
    const isAccountingTeam = isDepartmentRole(normalizedRole, 'accounting');
    const isStoreTeam = isDepartmentRole(normalizedRole, 'store');
    const isOperationTeam = isDepartmentRole(normalizedRole, 'operation');
    const isAdminTeam = isAdminRole(normalizedRole);
    const isManagerTeam = isManagerRole(normalizedRole);
    const isApprover = Boolean(user?.is_approver);

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
    const canAccessPage = (route: string) =>
        canAccessDashboardPage(normalizedRole, permissions, route, { isApprover });
    const canGeneralRequestPage = canAccessPage('/general-request');
    const canMaintenancePage = canAccessPage('/maintenance');
    const canPurchaseRequestManagePage = canAccessPage('/purchase-request/manage');
    const canAccountingDashboardPage = canAccessPage('/accounting-dashboard');
    const canPurchasingDashboardPage = canAccessPage('/purchasing-dashboard');
    const canManagerDashboardPage = canAccessPage('/manager-dashboard');
    const canStoreDashboardPage = canAccessPage('/store-dashboard');
    const showStoreSection =
        canStoreDashboardPage ||
        can(PERMISSIONS.PRODUCTS) ||
        can(PERMISSIONS.MOVEMENTS) ||
        can(PERMISSIONS.STOCK_ADJUST) ||
        can(PERMISSIONS.BORROW) ||
        can(PERMISSIONS.ASSETS);
    const showGeneralApprovalSection =
        (can(PERMISSIONS.APPROVALS) && !isPurchasingTeam) ||
        can(PERMISSIONS.PETTY_CASH);
    const showPurchasingSection =
        canAccessPage('/purchase-request') ||
        canPurchaseRequestManagePage ||
        canPurchasingDashboardPage ||
        can(PERMISSIONS.ADMIN_PO) ||
        can(PERMISSIONS.ADMIN_SUPPLIERS);
    const baseNavItemClass = `group relative flex items-center rounded-2xl ${
        collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'
    } text-sm font-medium transition-all duration-200 ease-out select-none border`;
    const getNavItemClass = (active: boolean) =>
        `${baseNavItemClass} ${
            active
                ? 'border-slate-400/30 bg-slate-700/80 text-white before:absolute before:-right-3 before:top-[-12px] before:h-7 before:w-7 before:rounded-full before:bg-[#0b1222] after:absolute after:-right-3 after:bottom-[-12px] after:h-7 after:w-7 after:rounded-full after:bg-[#0b1222] md:hover:translate-x-0.5 active:scale-[0.99]'
                : 'border-transparent text-slate-300 hover:border-slate-500/30 hover:bg-slate-800/70 hover:text-white hover:translate-x-0.5 active:scale-[0.98]'
        }`;

    const handleLogout = () => {
        setShowLogoutConfirm(true);
    };

    const confirmLogout = () => {
        signOut({ callbackUrl: '/login' });
    };

    const renderSectionHeader = (show: boolean, title: string, colorClass: string) => {
        if (!show) return null;

        if (collapsed) {
            return <div className="my-2 h-px bg-gray-700/60" />;
        }

        return (
            <div className="flex items-center gap-2 px-3 pb-2 pt-5">
                <div className="h-px flex-1 bg-gray-700"></div>
                <p className={`truncate text-[10px] font-bold uppercase tracking-widest ${colorClass}`}>{title}</p>
                <div className="h-px flex-1 bg-gray-700"></div>
            </div>
        );
    };

    return (
        <>
            <div className={`relative flex flex-col h-full min-h-screen justify-between border-r border-slate-700/70 bg-[#0b1222] text-white transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${collapsed ? 'w-20' : 'w-72 sm:w-64 md:w-72'}`}>
                <div className="absolute inset-y-0 right-0 w-px bg-slate-700/60"></div>

                <div className="overflow-y-auto relative z-10 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {/* Logo + Toggle */}
                    <div className="flex h-20 items-center justify-between border-b border-slate-700/70 bg-slate-900/40 px-4">
                        {!collapsed && (
                            <div className="flex items-center gap-3 animate-in fade-in zoom-in duration-500">
                                <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center ring-1 ring-slate-500/40">
                                    <Package className="w-6 h-6 text-white drop-shadow-md" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-slate-100">
                                        Stock Pro
                                    </h1>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mt-0.5">Management System</p>
                                </div>
                            </div>
                        )}
                        {collapsed && (
                            <div className="w-10 h-10 mx-auto rounded-xl bg-slate-700 flex items-center justify-center ring-1 ring-slate-500/40 animate-in zoom-in duration-300">
                                <Package className="w-6 h-6 text-white" />
                            </div>
                        )}
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className={`group p-2 rounded-xl bg-slate-800/80 border border-slate-600/40 hover:bg-slate-700 hover:border-slate-500 transition-all duration-200 active:scale-95 z-20 ${collapsed ? 'mx-auto mt-3' : ''}`}
                            title={collapsed ? 'ขยาย' : 'ย่อ'}
                        >
                            {collapsed ? <ChevronRight className="w-4 h-4 text-blue-400 group-hover:text-white transition-colors" /> : <ChevronLeft className="w-4 h-4 text-blue-400 group-hover:text-white transition-colors" />}
                        </button>
                    </div>

                    <nav className={`space-y-1 overflow-visible ${collapsed ? 'p-3' : 'p-4'}`}>

                        {/* ─── หน้าหลัก ─── */}
                        {can(PERMISSIONS.DASHBOARD) && (
                            <Link
                                href="/"
                                onClick={handleLinkClick}
                                className={getNavItemClass(isActive('/'))}
                                title={collapsed ? 'Dashboard' : undefined}
                            >
                                <Home className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/') && 'group-hover:scale-110 group-hover:text-blue-400'}`} />
                                {!collapsed && <span className="truncate">Dashboard</span>}
                            </Link>
                        )}

                        {isManagerTeam && canManagerDashboardPage && (
                            <Link
                                href="/manager-dashboard"
                                onClick={handleLinkClick}
                                className={getNavItemClass(isActive('/manager-dashboard'))}
                                title={collapsed ? 'Manager Dashboard' : undefined}
                            >
                                <ScrollText className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/manager-dashboard') && 'group-hover:scale-110 group-hover:text-sky-400'}`} />
                                {!collapsed && <span className="truncate">Manager Dashboard</span>}
                            </Link>
                        )}

                        {(isAdminTeam || isManagerTeam || isDepartmentRole(normalizedRole, 'accounting')) && canAccountingDashboardPage && (
                            <Link
                                href="/accounting-dashboard"
                                onClick={handleLinkClick}
                                className={getNavItemClass(isActive('/accounting-dashboard'))}
                                title={collapsed ? 'Accounting Dashboard' : undefined}
                            >
                                <DollarSign className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/accounting-dashboard') && 'group-hover:scale-110 group-hover:text-emerald-400'}`} />
                                {!collapsed && <span className="truncate">Accounting Dashboard</span>}
                            </Link>
                        )}

                        {/* ─── เครื่องมือ ─── */}
                        <button
                            onClick={() => setShowQrScanner(true)}
                            className={`w-full group flex items-center rounded-2xl border border-transparent ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'} text-sm font-medium transition-all duration-200 ease-out text-slate-300 hover:border-slate-500/30 hover:bg-slate-800/70 hover:text-white`}
                            title={collapsed ? 'สแกน QR' : undefined}
                        >
                            <QrCode className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 group-hover:scale-110`} />
                            {!collapsed && <span className="truncate text-left">สแกน QR ค้นหา</span>}
                        </button>

                        {/* ─── คลังสินค้า ─── */}
                        {false && (can(PERMISSIONS.PRODUCTS) || can(PERMISSIONS.MOVEMENTS) || can(PERMISSIONS.STOCK_ADJUST) || can(PERMISSIONS.BORROW)) && !collapsed && (
                            <div className="pt-5 pb-2 px-3 flex items-center gap-2">
                                <div className="h-px bg-gray-700 flex-1"></div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 truncate">📦 คลังสินค้า</p>
                                <div className="h-px bg-gray-700 flex-1"></div>
                            </div>
                        )}
                        {false && collapsed && (can(PERMISSIONS.PRODUCTS) || can(PERMISSIONS.MOVEMENTS)) && (
                            <div className="my-2 h-px bg-gray-700/60" />
                        )}

                        {renderSectionHeader(showStoreSection, 'คลังสินค้าและสโตร์', 'text-blue-400')}

                        {(isAdminTeam || isManagerTeam || isStoreTeam || isOperationTeam) && canStoreDashboardPage && (
                            <Link
                                href="/store-dashboard"
                                onClick={handleLinkClick}
                                className={getNavItemClass(isActive('/store-dashboard'))}
                                title={collapsed ? 'Store Dashboard' : undefined}
                            >
                                <Package className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/store-dashboard') && 'group-hover:scale-110 group-hover:text-emerald-400'}`} />
                                {!collapsed && <span className="truncate">Store Dashboard</span>}
                            </Link>
                        )}

                        {can(PERMISSIONS.PRODUCTS) && (
                            <Link
                                href="/products"
                                onClick={handleLinkClick}
                                className={getNavItemClass(isActive('/products'))}
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
                                className={getNavItemClass(isActive('/movements'))}
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
                                className={getNavItemClass(isActive('/stock/adjust'))}
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
                                className={getNavItemClass(isActive('/borrow'))}
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
                                className={getNavItemClass(isActive('/assets'))}
                                title={collapsed ? 'ทะเบียนทรัพย์สิน' : undefined}
                            >
                                <Briefcase className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/assets') && 'group-hover:scale-110 group-hover:text-teal-400'}`} />
                                {!collapsed && <span className="truncate">ทะเบียนทรัพย์สิน</span>}
                            </Link>
                        )}

                        {/* ─── งานซ่อมบำรุง ─── */}
                        {(canGeneralRequestPage || canMaintenancePage || can(PERMISSIONS.MAINTENANCE_DASHBOARD)) && !collapsed && (
                            <div className="pt-5 pb-2 px-3 flex items-center gap-2">
                                <div className="h-px bg-gray-700 flex-1"></div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 truncate">🔧 งานซ่อมบำรุง</p>
                                <div className="h-px bg-gray-700 flex-1"></div>
                            </div>
                        )}
                        {collapsed && (canGeneralRequestPage || canMaintenancePage || can(PERMISSIONS.MAINTENANCE_DASHBOARD)) && (
                            <div className="my-2 h-px bg-gray-700/60" />
                        )}

                        {canGeneralRequestPage && (
                            <Link
                                href="/general-request"
                                onClick={handleLinkClick}
                                className={getNavItemClass(isActive('/general-request'))}
                                title={collapsed ? 'รับแจ้งซ่อม' : undefined}
                            >
                                <svg className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/general-request') && 'group-hover:scale-110 group-hover:text-cyan-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                {!collapsed && <span className="truncate">รับเรื่อง</span>}
                            </Link>
                        )}

                        {canMaintenancePage && (
                            <Link
                                href="/maintenance"
                                onClick={handleLinkClick}
                                className={getNavItemClass(isActive('/maintenance'))}
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
                                className={getNavItemClass(isActive('/maintenance/dashboard'))}
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
                                className={getNavItemClass(isActive('/maintenance/technicians'))}
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
                                className={getNavItemClass(isActive('/maintenance/parts'))}
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
                                className={getNavItemClass(isActive('/maintenance/part-requests'))}
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
                                className={getNavItemClass(isActive('/reports/maintenance'))}
                                title={collapsed ? 'รายงานแจ้งซ่อม' : undefined}
                            >
                                <ClipboardList className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/reports/maintenance') && 'group-hover:scale-110 group-hover:text-emerald-400'}`} />
                                {!collapsed && <span className="truncate">รายงานแจ้งซ่อม</span>}
                            </Link>
                        )}

                        {/* ─── คำขออนุมัติ ─── */}
                        {false && can(PERMISSIONS.APPROVALS) && !collapsed && (
                            <div className="pt-5 pb-2 px-3 flex items-center gap-2">
                                <div className="h-px bg-gray-700 flex-1"></div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400 truncate">📝 คำขออนุมัติ</p>
                                <div className="h-px bg-gray-700 flex-1"></div>
                            </div>
                        )}
                        {false && can(PERMISSIONS.APPROVALS) && collapsed && (
                            <div className="my-2 h-px bg-gray-700/60" />
                        )}

                        {renderSectionHeader(showGeneralApprovalSection, 'งานทั่วไปและการเงิน', 'text-violet-400')}

                        {can(PERMISSIONS.APPROVALS) && !isPurchasingTeam && (
                            <Link
                                href="/approvals"
                                onClick={handleLinkClick}
                                className={getNavItemClass(isActive('/approvals'))}
                                title={collapsed ? 'คำขอทั่วไป (OT/ลา/เบิก)' : undefined}
                            >
                                <FileText className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/approvals') && 'group-hover:scale-110 group-hover:text-violet-400'}`} />
                                {!collapsed && <span className="truncate">คำขอทั่วไป (OT/ลา/เบิก)</span>}
                            </Link>
                        )}

                        {/* ─── การเงิน & เบิกจ่าย ─── */}
                        {renderSectionHeader(showPurchasingSection, 'จัดซื้อ', 'text-emerald-400')}

                        {canAccessPage('/purchase-request') && (
                            <Link
                                href="/purchase-request"
                                onClick={handleLinkClick}
                                className={getNavItemClass(isActive('/purchase-request'))}
                                title={collapsed ? 'ส่งคำขอซื้อ' : undefined}
                            >
                                <ShoppingCart className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/purchase-request') && 'group-hover:scale-110 group-hover:text-emerald-400'}`} />
                                {!collapsed && <span className="truncate">ส่งคำขอซื้อ</span>}
                            </Link>
                        )}

                        {(isPurchasingTeam || isManagerTeam || isAdminTeam || isAccountingTeam || isStoreTeam) && canPurchaseRequestManagePage && (
                            <Link
                                href="/purchase-request/manage"
                                onClick={handleLinkClick}
                                className={getNavItemClass(isActive('/purchase-request/manage'))}
                                title={collapsed ? 'จัดการระบบคำขอซื้อ' : undefined}
                            >
                                <ClipboardList className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/purchase-request/manage') && 'group-hover:scale-110 group-hover:text-cyan-400'}`} />
                                {!collapsed && <span className="truncate">จัดการระบบคำขอซื้อ</span>}
                            </Link>
                        )}

                        {/* Purchasing Dashboard Link */}
                        {(isAdminTeam || isPurchasingTeam || isManagerTeam) && (
                            <Link
                                href="/purchasing-dashboard"
                                onClick={handleLinkClick}
                                className={getNavItemClass(isActive('/purchasing-dashboard'))}
                                title={collapsed ? 'Purchasing Dashboard' : undefined}
                            >
                                <BarChart3 className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/purchasing-dashboard') && 'group-hover:scale-110 group-hover:text-indigo-400'}`} />
                                {!collapsed && <span className="truncate">Purchasing Dashboard</span>}
                            </Link>
                        )}

                        {can(PERMISSIONS.ADMIN_PO) && (
                            <Link href="/purchase-orders" onClick={handleLinkClick} className={getNavItemClass(isActive('/purchase-orders'))}>
                                <FileText className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/purchase-orders') && 'group-hover:scale-110 group-hover:text-indigo-400'}`} />
                                {!collapsed && <span className="truncate">ใบสั่งซื้อ (PO)</span>}
                            </Link>
                        )}

                        {can(PERMISSIONS.ADMIN_SUPPLIERS) && (
                            <Link href="/suppliers" onClick={handleLinkClick} className={getNavItemClass(isActive('/suppliers'))}>
                                <Truck className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/suppliers') && 'group-hover:scale-110 group-hover:translate-x-1 group-hover:text-slate-400'}`} />
                                {!collapsed && <span className="truncate">จัดการผู้ขาย</span>}
                            </Link>
                        )}

                        {false && (isAdminTeam || isManagerTeam || isStoreTeam || isOperationTeam) && canAccessPage('/store-dashboard') && (
                            <Link
                                href="/store-dashboard"
                                onClick={handleLinkClick}
                                className={getNavItemClass(isActive('/store-dashboard'))}
                                title={collapsed ? 'Store Dashboard' : undefined}
                            >
                                <Package className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/store-dashboard') && 'group-hover:scale-110 group-hover:text-emerald-400'}`} />
                                {!collapsed && <span className="truncate">Store Dashboard</span>}
                            </Link>
                        )}

                        {false && can(PERMISSIONS.PETTY_CASH) && !collapsed && (
                            <div className="pt-5 pb-2 px-3 flex items-center gap-2">
                                <div className="h-px bg-gray-700 flex-1"></div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 truncate">💰 การเงิน & เบิกจ่าย</p>
                                <div className="h-px bg-gray-700 flex-1"></div>
                            </div>
                        )}
                        {false && can(PERMISSIONS.PETTY_CASH) && collapsed && (
                            <div className="my-2 h-px bg-gray-700/60" />
                        )}

                        {can(PERMISSIONS.PETTY_CASH) && (
                            <Link
                                href="/petty-cash"
                                onClick={handleLinkClick}
                                className={getNavItemClass(isActive('/petty-cash'))}
                                title={collapsed ? 'เบิกเงินสดย่อย' : undefined}
                            >
                                <DollarSign className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/petty-cash') && 'group-hover:scale-110 group-hover:text-emerald-400 group-hover:rotate-12'}`} />
                                {!collapsed && <span className="truncate">เบิกเงินสดย่อย</span>}
                            </Link>
                        )}

                        {/* ─── การจัดการ (Admin) ─── */}
                        {false && (can(PERMISSIONS.ADMIN_PO) || can(PERMISSIONS.ADMIN_SUPPLIERS) || can(PERMISSIONS.ADMIN_WAREHOUSES) || can(PERMISSIONS.ADMIN_CATEGORIES)) && !collapsed && (
                            <div className="pt-5 pb-2 px-3 flex items-center gap-2">
                                <div className="h-px bg-gray-700 flex-1"></div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 truncate">🏢 การจัดการ</p>
                                <div className="h-px bg-gray-700 flex-1"></div>
                            </div>
                        )}
                        {false && collapsed && (can(PERMISSIONS.ADMIN_PO) || can(PERMISSIONS.ADMIN_SUPPLIERS)) && (
                            <div className="my-2 h-px bg-gray-700/60" />
                        )}

                        {false && can(PERMISSIONS.ADMIN_PO) && (
                            <Link href="/purchase-orders" onClick={handleLinkClick} className={getNavItemClass(isActive('/purchase-orders'))}>
                                <FileText className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/purchase-orders') && 'group-hover:scale-110 group-hover:text-indigo-400'}`} />
                                {!collapsed && <span className="truncate">ใบสั่งซื้อ (PO)</span>}
                            </Link>
                        )}

                        {false && can(PERMISSIONS.ADMIN_SUPPLIERS) && (
                            <Link href="/suppliers" onClick={handleLinkClick} className={getNavItemClass(isActive('/suppliers'))}>
                                <Truck className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/suppliers') && 'group-hover:scale-110 group-hover:translate-x-1 group-hover:text-slate-400'}`} />
                                {!collapsed && <span className="truncate">จัดการผู้ขาย</span>}
                            </Link>
                        )}

                        {renderSectionHeader(can(PERMISSIONS.ADMIN_WAREHOUSES) || can(PERMISSIONS.ADMIN_CATEGORIES), 'ข้อมูลหลัก', 'text-indigo-400')}

                        {can(PERMISSIONS.ADMIN_WAREHOUSES) && (
                            <Link href="/warehouses" onClick={handleLinkClick} className={getNavItemClass(isActive('/warehouses'))}>
                                <Warehouse className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/warehouses') && 'group-hover:scale-110 group-hover:text-amber-500'}`} />
                                {!collapsed && <span className="truncate">คลังสินค้า</span>}
                            </Link>
                        )}

                        {can(PERMISSIONS.ADMIN_CATEGORIES) && (
                            <Link href="/categories" onClick={handleLinkClick} className={getNavItemClass(isActive('/categories'))}>
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
                            <Link href="/reports" onClick={handleLinkClick} className={getNavItemClass(isActive('/reports'))}>
                                <BarChart3 className={`${collapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5 flex-shrink-0'} transition-transform duration-300 ${!isActive('/reports') && 'group-hover:scale-110 group-hover:text-fuchsia-400'}`} />
                                {!collapsed && <span className="truncate">รายงานขั้นสูง</span>}
                            </Link>
                        )}

                        {can(PERMISSIONS.ADMIN_AUDIT) && (
                            <Link href="/inventory-audit" onClick={handleLinkClick} className={getNavItemClass(isActive('/inventory-audit'))}>
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
                                                                                        {can(PERMISSIONS.ADMIN_SETTINGS) && (
                                                <Link
                                                    href="/settings/line-users"
                                                    onClick={handleLinkClick}
                                                    className={`group flex items-center rounded-xl px-3 py-2 text-xs font-medium transition-all duration-300 ease-out translate-x-3 hover:translate-x-4 ${isActive('/settings/line-users') ? 'bg-white/15 text-emerald-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                                >
                                                    <Users className={`mr-3 h-4 w-4 flex-shrink-0 transition-transform duration-300 ${!isActive('/settings/line-users') && 'group-hover:scale-110 group-hover:text-emerald-400'}`} />
                                                    <span className="truncate">ผู้ใช้ LINE ภายใน</span>
                                                </Link>
                                            )}

                                                                                        {can(PERMISSIONS.ADMIN_SETTINGS) && (
                                                <Link
                                                    href="/settings/line-customers"
                                                    onClick={handleLinkClick}
                                                    className={`group flex items-center rounded-xl px-3 py-2 text-xs font-medium transition-all duration-300 ease-out translate-x-3 hover:translate-x-4 ${isActive('/settings/line-customers') ? 'bg-white/15 text-lime-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                                >
                                                    <Users className={`mr-3 h-4 w-4 flex-shrink-0 transition-transform duration-300 ${!isActive('/settings/line-customers') && 'group-hover:scale-110 group-hover:text-lime-400'}`} />
                                                    <span className="truncate">ลูกค้า LINE</span>
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

                <div className={`border-t border-slate-700/70 relative z-10 bg-slate-900/40 ${collapsed ? 'p-3' : 'p-5'}`}>
                    <div className={`flex items-center rounded-2xl border border-slate-600/40 bg-slate-800/40 ${collapsed ? 'justify-center p-2' : 'p-3'} mb-4 animate-in fade-in duration-500 delay-150`}>
                        <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-lg ring-1 ring-slate-500/40" title={collapsed ? (user?.name ?? undefined) : undefined}>
                            {user?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        {!collapsed && (
                            <div className="ml-4 overflow-hidden">
                                <div className="text-sm font-bold text-white truncate drop-shadow-sm">{user?.name}</div>
                                <div className="mt-0.5 text-[11px] font-medium tracking-widest text-slate-400">{getRoleDisplayName(role)}</div>
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
            {showLogoutConfirm && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
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
                </div>,
                document.body
            )}

            {/* QR Scanner Modal */}
            <QrScannerModal
                isOpen={showQrScanner}
                onClose={() => setShowQrScanner(false)}
            />
        </>
    );
}



