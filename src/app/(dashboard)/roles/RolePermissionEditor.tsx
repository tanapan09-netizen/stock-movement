'use client';

import { useState, Fragment } from 'react';
import { PERMISSION_LIST, PermissionItem } from '@/lib/permissions';
import { updateRolePermissions } from '@/actions/roleActions';
import { Check, Loader2, Save } from 'lucide-react';

interface Role {
    role_id: number;
    role_name: string;
    permissions: string | null; // JSON string
}

interface Props {
    roles: Role[];
}

export default function RolePermissionEditor({ roles }: Props) {
    // Parse initial permissions
    const allPermissionKeys = Object.fromEntries(
        PERMISSION_LIST.map((permission) => [permission.key, false])
    ) as Record<string, boolean>;

    const initialPermissions = roles.reduce((acc, role) => {
        try {
            const parsed = JSON.parse(role.permissions || '{}');
            acc[role.role_id] = {
                ...allPermissionKeys,
                ...parsed
            };
        } catch {
            acc[role.role_id] = { ...allPermissionKeys };
        }
        return acc;
    }, {} as Record<number, Record<string, boolean>>);

    const [permissions, setPermissions] = useState(initialPermissions);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleToggle = (roleId: number, key: string) => {
        setPermissions(prev => ({
            ...prev,
            [roleId]: {
                ...prev[roleId],
                [key]: !prev[roleId]?.[key]
            }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            // Save each role's permissions
            const promises = Object.entries(permissions).map(([roleId, perms]) =>
                updateRolePermissions(parseInt(roleId), perms)
            );

            await Promise.all(promises);
            setMessage({ type: 'success', text: 'บันทึกสิทธิ์เรียบร้อยแล้ว' });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการบันทึก' });
        } finally {
            setSaving(false);
        }
    };

    // Group permissions by category
    const groupedPermissions = PERMISSION_LIST.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {} as Record<string, PermissionItem[]>);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                <div>
                    <h2 className="font-semibold text-gray-800">ตารางกำหนดสิทธิ์ (Permissions)</h2>
                    <p className="text-sm text-gray-500">เลือกเมนูที่ต้องการให้แต่ละ Role มองเห็น</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    บันทึกการเปลี่ยนแปลง
                </button>
            </div>

            {message && (
                <div className={`p-3 text-sm text-center ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            <div className="overflow-auto max-h-[70vh]">
                <table className="w-full text-sm text-left relative border-collapse">
                    <thead className="bg-gray-50 text-gray-700 uppercase font-medium text-xs sticky top-0 z-20 shadow-sm">
                        <tr>
                            <th className="px-6 py-4 sticky left-0 top-0 bg-gray-50 z-30 w-64 shadow-sm border-b">เมนูใช้งาน</th>
                            {roles.map(role => (
                                <th key={role.role_id} className="px-6 py-4 text-center min-w-[100px] bg-gray-50 border-b">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className={`px-2 py-0.5 rounded text-[10px] text-white uppercase font-semibold
                                            ${role.role_name === 'admin' ? 'bg-purple-600' :
                                                role.role_name === 'manager' ? 'bg-blue-500' :
                                                    role.role_name === 'technician' ? 'bg-orange-500' :
                                                        role.role_name === 'operation' ? 'bg-teal-500' :
                                                            role.role_name === 'general' ? 'bg-gray-500' :
                                                                role.role_name === 'maid' ? 'bg-pink-500' :
                                                                    role.role_name === 'driver' ? 'bg-indigo-500' :
                                                                        role.role_name === 'purchasing' ? 'bg-amber-600' :
                                                                            role.role_name === 'accounting' ? 'bg-cyan-600' :
                                                                                role.role_name === 'employee' ? 'bg-green-500' : 'bg-gray-400'}`
                                        }>
                                            {role.role_name}
                                        </span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {Object.entries(groupedPermissions).map(([category, items]) => (
                            <Fragment key={category}>
                                <tr key={category} className="bg-gray-50/50">
                                    <td colSpan={roles.length + 1} className="px-6 py-2 font-semibold text-gray-600 text-xs tracking-wider">
                                        {category}
                                    </td>
                                </tr>
                                {items.map(perm => (
                                    <tr key={perm.key} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-3 sticky left-0 bg-white z-10 font-medium text-gray-900 border-r border-gray-100">
                                            {perm.label}
                                            <p className="text-xs text-gray-400 font-normal mt-0.5">{perm.description}</p>
                                        </td>
                                        {roles.map(role => {
                                            const isChecked = permissions[role.role_id]?.[perm.key] || false;
                                            const isAdmin = role.role_name === 'admin';
                                            return (
                                                <td key={role.role_id} className="px-6 py-3 text-center">
                                                    <label className={`inline-flex items-center justify-center p-2 rounded-lg cursor-pointer transition-colors
                                                        ${isChecked ? 'bg-blue-50 text-blue-600' : 'text-gray-300 hover:bg-gray-100'}
                                                    `}>
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only"
                                                            checked={isChecked}
                                                            onChange={() => handleToggle(role.role_id, perm.key)}
                                                        // disabled={isAdmin} // Admin always has full access (optional safeguard)
                                                        />
                                                        <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors
                                                            ${isChecked ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}
                                                        `}>
                                                            {isChecked && <Check className="w-3 h-3 text-white" />}
                                                        </div>
                                                    </label>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
