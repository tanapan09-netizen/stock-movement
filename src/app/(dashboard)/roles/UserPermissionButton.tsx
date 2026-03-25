'use client';

import { updateUserPermissions } from '@/actions/userActions';
import { DEFAULT_PERMISSIONS, PERMISSION_LIST, RolePermissions } from '@/lib/permissions';
import { getRoleDisplayName } from '@/lib/roles';
import { Key, Lock, Save, X } from 'lucide-react';
import { useState } from 'react';

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
    let basePerms: RolePermissions = DEFAULT_PERMISSIONS[user.role] || {};

    if (dbRolePermissions) {
        try {
            basePerms = JSON.parse(dbRolePermissions);
        } catch {
            basePerms = DEFAULT_PERMISSIONS[user.role] || {};
        }
    }

    let userPerms: RolePermissions = {};
    if (user.custom_permissions) {
        try {
            userPerms = JSON.parse(user.custom_permissions);
        } catch {
            userPerms = {};
        }
    }

    const [permissions, setPermissions] = useState<RolePermissions>({ ...basePerms, ...userPerms });
    const [isSaving, setIsSaving] = useState(false);

    const handleOpen = () => {
        if (isLocked) {
            return;
        }
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

    const categories = Array.from(new Set(PERMISSION_LIST.map((permission) => permission.category)));

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

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 pb-10 pt-20">
                    <div className="relative w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute right-4 top-4 text-gray-400 transition hover:text-gray-700"
                        >
                            <X className="h-6 w-6" />
                        </button>

                        <h2 className="mb-2 text-xl font-bold text-gray-900">
                            กำหนดสิทธิ์รายบุคคล: {user.username}
                        </h2>
                        <p className="mb-6 text-sm text-gray-500">
                            สิทธิ์พื้นฐานอ้างอิงจาก role <b>{getRoleDisplayName(user.role)}</b>
                            <br />
                            ค่าที่บันทึกในหน้านี้จะเป็นการ override สิทธิ์เฉพาะของผู้ใช้รายนี้
                        </p>

                        <div className="grid max-h-[60vh] grid-cols-1 gap-6 overflow-y-auto px-2 md:grid-cols-2 lg:grid-cols-3">
                            {categories.map((category) => (
                                <div key={category} className="space-y-3">
                                    <h3 className="border-b pb-2 font-semibold text-gray-800">{category}</h3>
                                    <div className="space-y-2">
                                        {PERMISSION_LIST.filter((permission) => permission.category === category).map((permission) => (
                                            <label key={permission.key} className="group flex cursor-pointer items-start space-x-3">
                                                <div className="flex rounded-md border border-gray-200 bg-gray-100">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!permissions[permission.key]}
                                                        onChange={(e) => handleToggle(permission.key, e.target.checked)}
                                                        className="my-auto ml-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                                                        {formatPermissionLabel(permission.label)}
                                                    </span>
                                                    <span className="text-xs text-gray-500">{permission.description}</span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 flex justify-end space-x-3 border-t pt-4">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 transition hover:bg-gray-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 disabled:opacity-50"
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
            )}
        </>
    );
}
