'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Key, Lock, Save, X } from 'lucide-react';

import { updateUserPermissions } from '@/actions/userActions';
import { DEFAULT_PERMISSIONS, PERMISSION_LIST, RolePermissions } from '@/lib/permissions';
import { getRoleDisplayName } from '@/lib/roles';

interface Props {
    user: {
        p_id: number;
        username: string;
        role: string;
        custom_permissions: string | null;
    };
    dbRolePermissions?: string | null;
    isLocked?: boolean;
}

function formatPermissionLabel(label: string): string {
    return label;
}

export default function UserPermissionButton({ user, dbRolePermissions, isLocked = false }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    const basePerms: RolePermissions = useMemo(() => {
        let resolved = DEFAULT_PERMISSIONS[user.role] || {};
        if (dbRolePermissions) {
            try {
                resolved = JSON.parse(dbRolePermissions);
            } catch {
                resolved = DEFAULT_PERMISSIONS[user.role] || {};
            }
        }
        return resolved;
    }, [dbRolePermissions, user.role]);

    const userPerms: RolePermissions = useMemo(() => {
        if (!user.custom_permissions) return {};
        try {
            return JSON.parse(user.custom_permissions);
        } catch {
            return {};
        }
    }, [user.custom_permissions]);

    const [permissions, setPermissions] = useState<RolePermissions>({ ...basePerms, ...userPerms });

    const categories = useMemo(
        () => Array.from(new Set(PERMISSION_LIST.map((permission) => permission.category))),
        [],
    );

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        setPermissions({ ...basePerms, ...userPerms });
    }, [basePerms, userPerms]);

    useEffect(() => {
        if (!isOpen) {
            document.body.style.removeProperty('overflow');
            return;
        }

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    const handleOpen = () => {
        if (isLocked) return;
        setPermissions({ ...basePerms, ...userPerms });
        setIsOpen(true);
    };

    const handleToggle = (key: string, value: boolean) => {
        setPermissions((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        const res = await updateUserPermissions(user.p_id, permissions);
        setIsSaving(false);

        if (res.success) {
            setIsOpen(false);
            return;
        }

        alert(res.error || 'ไม่สามารถบันทึกสิทธิ์ได้');
    };

    return (
        <>
            <button
                onClick={handleOpen}
                disabled={isLocked}
                className="rounded-full p-2 text-gray-400 transition hover:bg-amber-50 hover:text-amber-600 disabled:cursor-not-allowed disabled:bg-amber-50 disabled:text-amber-500"
                title={isLocked ? 'ผู้ใช้ที่เป็น admin จะถูกบังคับให้มีสิทธิ์ครบเสมอ' : 'กำหนดสิทธิ์รายบุคคล'}
            >
                {isLocked ? <Lock className="h-5 w-5" /> : <Key className="h-5 w-5" />}
            </button>

            {isMounted && isOpen && createPortal(
                <div className="fixed inset-0 z-[120] bg-slate-950/55 backdrop-blur-sm">
                    <div className="flex h-full w-full items-center justify-center p-3 sm:p-4 lg:p-6">
                        <div className="relative flex h-[calc(100vh-1.5rem)] w-full max-w-[1500px] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.35)] sm:h-[calc(100vh-2rem)]">
                            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-4 sm:px-6">
                                <div className="min-w-0">
                                    <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                                        กำหนดสิทธิ์รายบุคคล: {user.username}
                                    </h2>
                                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                                        สิทธิ์พื้นฐานอ้างอิงจาก role{' '}
                                        <span className="font-semibold text-slate-900">{getRoleDisplayName(user.role)}</span>
                                        {' '}และค่าที่บันทึกในหน้านี้จะเป็นการ override เฉพาะผู้ใช้งานรายนี้
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="rounded-full border border-slate-200 bg-white p-2 text-slate-400 transition hover:border-slate-300 hover:text-slate-700"
                                    title="ปิด"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-5 py-3 sm:px-6">
                                <div className="text-sm text-slate-500">
                                    {categories.length} หมวดสิทธิ์ โดย {PERMISSION_LIST.length} รายการ
                                </div>
                                <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                                    การตั้งค่านี้มีผลเฉพาะผู้ใช้งานรายนี้
                                </div>
                            </div>

                            <div className="min-h-0 flex-1 overflow-hidden">
                                <div className="grid h-full grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
                                    <aside className="hidden border-r border-slate-200 bg-slate-50/70 lg:block">
                                        <div className="h-full overflow-y-auto px-4 py-5">
                                            <div className="space-y-2">
                                                {categories.map((category) => (
                                                    <div key={category} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                                                        <p className="text-sm font-semibold text-slate-900">{category}</p>
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            {PERMISSION_LIST.filter((permission) => permission.category === category).length} รายการ
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </aside>

                                    <div className="h-full overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                                        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 2xl:grid-cols-3">
                                            {categories.map((category) => (
                                                <section
                                                    key={category}
                                                    className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60"
                                                >
                                                    <div className="border-b border-slate-100 pb-3">
                                                        <h3 className="text-base font-semibold text-slate-900">{category}</h3>
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            {PERMISSION_LIST.filter((permission) => permission.category === category).length} สิทธิ์ในหมวดนี้
                                                        </p>
                                                    </div>

                                                    <div className="mt-4 space-y-3">
                                                        {PERMISSION_LIST.filter((permission) => permission.category === category).map((permission) => (
                                                            <label
                                                                key={permission.key}
                                                                className="group flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 transition hover:border-blue-200 hover:bg-blue-50/40"
                                                            >
                                                                <div className="mt-0.5 flex h-5 w-5 items-center justify-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={!!permissions[permission.key]}
                                                                        onChange={(e) => handleToggle(permission.key, e.target.checked)}
                                                                        className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                                    />
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="text-sm font-medium text-slate-800 group-hover:text-slate-950">
                                                                        {formatPermissionLabel(permission.label)}
                                                                    </div>
                                                                    <div className="mt-1 text-xs leading-5 text-slate-500">{permission.description}</div>
                                                                </div>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </section>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
                                <div className="text-sm text-slate-500">
                                    กด <span className="font-medium text-slate-700">บันทึกสิทธิ์รายบุคคล</span> เพื่อยืนยันการ override
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {isSaving ? 'กำลังบันทึก...' : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                บันทึกสิทธิ์รายบุคคล
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
}