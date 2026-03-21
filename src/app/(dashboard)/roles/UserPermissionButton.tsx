'use client';

import { useState } from 'react';
import { Key, Save, X } from 'lucide-react';
import { PERMISSION_LIST, RolePermissions, DEFAULT_PERMISSIONS } from '@/lib/permissions';
import { updateUserPermissions } from '@/actions/userActions';

interface Props {
    user: {
        p_id: number;
        username: string;
        role: string;
        custom_permissions: string | null;
    };
    dbRolePermissions?: string | null; // For database-defined role permissions if any
}

function formatPermissionLabel(label: string): string {
    if (label.includes('/approvals/purchasing')) {
        return label
            .replace('/approvals/purchasing', 'อนุมัติรายการ / จัดซื้อ')
            .replace('/approvals', 'อนุมัติรายการ');
    }

    if (label.includes('/purchase-request')) {
        return label.replace('/purchase-request', 'ส่งคำขอซื้อ');
    }

    return label;
}

export default function UserPermissionButton({ user, dbRolePermissions }: Props) {
    const [isOpen, setIsOpen] = useState(false);

    // Determine the base role permissions
    // If we passed dbRolePermissions, try parsing it, else fallback to DEFAULT_PERMISSIONS
    let basePerms: RolePermissions = DEFAULT_PERMISSIONS[user.role] || {};
    if (dbRolePermissions) {
        try {
            basePerms = JSON.parse(dbRolePermissions);
        } catch {
            // ignore
        }
    }

    // Determine specific user permissions
    let userPerms: RolePermissions = {};
    if (user.custom_permissions) {
        try {
            userPerms = JSON.parse(user.custom_permissions);
        } catch {
            // ignore
        }
    }

    // The form state that stores overrides ONLY
    // Since we only save custom_permissions. We want to show the net effect but allow editing the override.
    // Let's make the form state explicitly show "what is selected right now" (merged).
    // And when saving, we just save the full object as their new custom permissions.
    // Wait, if we save the full object as custom permissions, any future updates to the Role's base permissions
    // will be OVERRIDDEN/ignored by their custom permissions for those keys.
    // The user's request: "เลือกแก้สิทธิ์ (Permissions) รายบุคคลได้เลย".
    // Usually it's simplest to just save the customized checkboxes entirely inside custom_permissions.
    // So we initialize state to merge(base, custom):
    const [permissions, setPermissions] = useState<RolePermissions>({ ...basePerms, ...userPerms });
    const [isSaving, setIsSaving] = useState(false);

    const handleOpen = () => {
        setPermissions({ ...basePerms, ...userPerms });
        setIsOpen(true);
    };

    const handleToggle = (key: string, value: boolean) => {
        setPermissions(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        // Save the new permissions as custom_permissions
        // Optimization: We could filter out things that match baseRole, but storing the full merged set is easier and more robust if we view it as an "override".
        // Let's store only the overrides or the whole thing? 
        // Let's store the whole selected set.
        const res = await updateUserPermissions(user.p_id, permissions);
        setIsSaving(false);
        if (res.success) {
            setIsOpen(false);
        } else {
            alert(res.error || 'Failed to update permissions');
        }
    };

    const categories = Array.from(new Set(PERMISSION_LIST.map(p => p.category)));

    return (
        <>
            <button
                onClick={handleOpen}
                className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-full transition"
                title="กำหนดสิทธิ์รายบุคคล"
            >
                <Key className="w-5 h-5" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/50 overflow-y-auto pt-20 pb-10">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 relative">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <h2 className="text-xl font-bold text-gray-900 mb-2">กำหนดสิทธิ์รายบุคคล: {user.username}</h2>
                        <p className="text-sm text-gray-500 mb-6">
                            สิทธิ์พื้นฐานมาจากกลุ่ม <b>{user.role.toUpperCase()}</b><br />
                            คุณสามารถเปิด/ปิดสิทธิ์เฉพาะตัองของ {user.username} ได้ที่นี่ การเปลี่ยนที่นี่จะไปทับซ้อน (Override) สิทธิ์ของกลุ่ม
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[60vh] overflow-y-auto px-2">
                            {categories.map(category => (
                                <div key={category} className="space-y-3">
                                    <h3 className="font-semibold text-gray-800 border-b pb-2">{category}</h3>
                                    <div className="space-y-2">
                                        {PERMISSION_LIST.filter(p => p.category === category).map(perm => (
                                            <label key={perm.key} className="flex items-start space-x-3 cursor-pointer group">
                                                <div className="flex bg-gray-100 rounded-md border border-gray-200">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!permissions[perm.key]}
                                                        onChange={(e) => handleToggle(perm.key, e.target.checked)}
                                                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 my-auto ml-1"
                                                    />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{formatPermissionLabel(perm.label)}</span>
                                                    <span className="text-xs text-gray-500">{perm.description}</span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 flex justify-end space-x-3 pt-4 border-t">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                            >
                                {isSaving ? 'กำลังบันทึก...' : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
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
