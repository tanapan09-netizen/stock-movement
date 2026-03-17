'use client';

import { useState, useEffect } from 'react';
import { Trash2, UserCheck, UserX, Plus } from 'lucide-react';
import { getLineUsers, toggleApprover, toggleLineUserActive, deleteLineUser, updateLineUserRole, updateLineUserFullName, refreshLineUserProfiles } from '@/actions/lineUserActions';

interface LineUser {
    id: number;
    line_user_id: string;
    display_name: string | null;
    full_name: string | null;
    picture_url: string | null;
    is_approver: boolean;
    role: string;
    is_active: boolean;
    last_interaction: Date | null;
    created_at: Date;
}

export default function LineUserClient() {
    const [users, setUsers] = useState<LineUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [showQRCode, setShowQRCode] = useState(false);
    const [uploadingQR, setUploadingQR] = useState(false);
    const [qrTimestamp, setQrTimestamp] = useState(Date.now());
    const [refreshing, setRefreshing] = useState(false);

    async function loadUsers() {
        setLoading(true);
        const result = await getLineUsers();
        if (result.success && result.data) {
            // @ts-ignore - Ignore type errors for full_name and role missing from generated types
            setUsers(result.data as any);
        }
        setLoading(false);
    }

    useEffect(() => {
        loadUsers();
    }, []);

    const handleRefreshPhotos = async () => {
        setRefreshing(true);
        const result = await refreshLineUserProfiles();
        if (result.success) {
            alert(result.message);
            loadUsers();
        } else {
            alert('เกิดข้อผิดพลาด: ' + result.error);
        }
        setRefreshing(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingQR(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload/qr', {
                method: 'POST',
                body: formData,
            });
            if (response.ok) {
                setQrTimestamp(Date.now());
                alert('QR Code uploaded successfully!');
            } else {
                alert('Failed to upload QR Code');
            }
        } catch (error) {
            console.error(error);
            alert('Error uploading file');
        } finally {
            setUploadingQR(false);
        }
    };

    const handleToggleApprover = async (id: number, currentStatus: boolean) => {
        const result = await toggleApprover(id, !currentStatus);
        if (result.success) {
            setUsers(prev => prev.map(u => u.id === id ? { ...u, is_approver: !currentStatus } : u));
        }
    };

    const handleToggleActive = async (id: number, currentStatus: boolean) => {
        const result = await toggleLineUserActive(id, !currentStatus);
        if (result.success) {
            setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: !currentStatus } : u));
        }
    };

    const handleUpdateRole = async (id: number, role: string) => {
        const result = await updateLineUserRole(id, role);
        if (result.success) {
            setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
        } else {
            alert('Failed to update role');
        }
    };

    const handleUpdateFullName = async (id: number, fullName: string) => {
        const result = await updateLineUserFullName(id, fullName);
        if (result.success) {
            setUsers(prev => prev.map(u => u.id === id ? { ...u, full_name: fullName } : u));
        } else {
            alert('Failed to update name');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        const result = await deleteLineUser(id);
        if (result.success) {
            setUsers(prev => prev.filter(u => u.id !== id));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">LINE User Management</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage users for LINE Messaging API notifications</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleRefreshPhotos}
                        disabled={refreshing}
                        className="flex items-center gap-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm"
                        title="ดึงรูปโปรไฟล์ใหม่จาก LINE API"
                    >
                        {refreshing ? '⏳ กำลังอัปเดต...' : '🔄 Refresh Photos'}
                    </button>
                    <button
                        onClick={() => setShowQRCode(!showQRCode)}
                        className="flex items-center gap-2 bg-[#06C755] hover:bg-[#05b34c] text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        <Plus size={20} />
                        Add Friend
                    </button>
                </div>
            </div>

            {showQRCode && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-green-100 flex flex-col items-center justify-center space-y-4 animate-in fade-in slide-in-from-top-4">
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-white">Scan to Add Official Account</h3>

                    <div className="relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={`/api/images/qr?t=${qrTimestamp}`}
                            alt="LINE Official Account QR Code"
                            className="w-48 h-48 object-cover rounded-lg border border-gray-200"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                document.getElementById('qr-placeholder')?.classList.remove('hidden');
                            }}
                            onLoad={(e) => {
                                (e.target as HTMLImageElement).style.display = 'block';
                                document.getElementById('qr-placeholder')?.classList.add('hidden');
                            }}
                        />
                        <div id="qr-placeholder" className="w-48 h-48 bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-gray-400 hidden">
                            <span className="text-sm">No QR Code</span>
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <label className={`cursor-pointer bg-[#06C755] hover:bg-[#05b34c] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors ${uploadingQR ? 'opacity-50 pointer-events-none' : ''}`}>
                            {uploadingQR ? 'Uploading...' : 'Upload QR Image'}
                            <input
                                type="file"
                                className="hidden"
                                accept="image/png, image/jpeg, image/jpg"
                                onChange={handleFileUpload}
                                disabled={uploadingQR}
                            />
                        </label>
                    </div>

                    <p className="text-sm text-gray-500 text-center max-w-md">
                        Scan this QR code with your LINE app to add the bot as a friend.
                        Once added, you will appear in the list below.
                    </p>
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-slate-700">
                            <tr>
                                <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-200">User</th>
                                <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-200">Department Role</th>
                                <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-200">Approve Limit</th>
                                <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-200">Status</th>
                                <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-200">Last Active</th>
                                <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-200">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-600">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        No LINE users found. Scan the QR code to add the bot.
                                    </td>
                                </tr>
                            ) : (
                                users.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                {user.picture_url ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={`/api/line/avatar?url=${encodeURIComponent(user.picture_url)}`}
                                                        alt={user.display_name || 'User'}
                                                        className="w-10 h-10 rounded-full object-cover"
                                                        referrerPolicy="no-referrer"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center text-gray-500 text-xs">NO IMG</div>
                                                )}
                                                <div>
                                                    <input
                                                        type="text"
                                                        placeholder="ชื่อ-นามสกุล (แทน LINE)"
                                                        defaultValue={user.full_name || ''}
                                                        onBlur={(e) => {
                                                            if (e.target.value !== (user.full_name || '')) {
                                                                handleUpdateFullName(user.id, e.target.value);
                                                            }
                                                        }}
                                                        className="font-medium text-gray-900 dark:text-white bg-transparent border-b border-dashed border-gray-300 focus:border-blue-500 focus:outline-none w-full min-w-[150px]"
                                                    />
                                                    {user.display_name && (
                                                        <div className="text-xs text-gray-500 mt-0.5">
                                                            LINE: {user.display_name}
                                                        </div>
                                                    )}
                                                    <div className="text-xs text-gray-400 font-mono truncate max-w-[150px] mt-0.5" title={user.line_user_id}>
                                                        {user.line_user_id}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <select
                                                value={user.role || 'general'}
                                                onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                                className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:text-white"
                                            >
                                                <option value="general">General (ทั่วไป)</option>
                                                <option value="employee">employee (พนักงาน)</option>
                                                <option value="technician">Technician (ช่างซ่อมบำรุง)</option>
                                                <option value="maid">Maid (แม่บ้าน)</option>
                                                <option value="driver">Driver (คนขับรถ)</option>
                                                <option value="purchasing">Purchasing (จัดซื้อ)</option>
                                                <option value="store">Store (คลังสินค้า)</option>
                                                <option value="accounting">Accounting (บัญชี)</option>
                                                <option value="manager">Manager (ผู้จัดการ)</option>
                                                <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                                            </select>
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => handleToggleApprover(user.id, user.is_approver)}
                                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${user.is_approver
                                                    ? 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200'
                                                    : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {user.is_approver ? 'Approver' : 'User'}
                                            </button>
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => handleToggleActive(user.id, user.is_active)}
                                                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${user.is_active
                                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                                                    }`}
                                            >
                                                {user.is_active ? <UserCheck size={14} /> : <UserX size={14} />}
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500">
                                            {user.last_interaction ? new Date(user.last_interaction).toLocaleString() : '-'}
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete User"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="text-sm text-gray-500 bg-blue-50 dark:bg-slate-800/50 p-4 rounded-lg border border-blue-100 dark:border-slate-700">
                <h4 className="font-semibold mb-1 text-blue-700 dark:text-blue-400">How to Setup</h4>
                <ul className="list-disc list-inside space-y-1">
                    <li>Create a LINE Official Account (Messaging API)</li>
                    <li>Set the <strong>Webhook URL</strong> in LINE Console to: <code>{typeof window !== 'undefined' ? `${window.location.origin}/api/line/webhook` : '/api/line/webhook'}</code></li>
                    <li>Enable &quot;Use Webhook&quot; in LINE Console</li>
                    <li>Scan QR code to add the bot as a friend</li>
                </ul>
            </div>
        </div>
    );
}
