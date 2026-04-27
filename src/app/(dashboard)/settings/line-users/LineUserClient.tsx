'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Trash2, UserCheck, UserX, Plus, Link2, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { LINE_USER_ROLE_OPTIONS, partitionLineUsersByAssignment } from '@/lib/line-users';
import { getRoleLabel } from '@/lib/roles';
import {
    getLineUsers,
    toggleApprover,
    toggleLineUserActive,
    deleteLineUser,
    updateLineUserRole,
    updateLineUserFullName,
    refreshLineUserProfiles,
    provisionLineUserAccount,
    syncLinkedLineUserAccount,
} from '@/actions/lineUserActions';

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
    linked_user: {
        p_id: number;
        username: string;
        role: string;
        line_user_id: string | null;
    } | null;
}

function getExpectedLinkedUsername(user: LineUser) {
    const preferredName = user.full_name?.trim() || user.display_name?.trim() || '';
    if (!preferredName) {
        return user.linked_user?.username || '';
    }

    return preferredName
        .normalize('NFKC')
        .replace(/\s+/g, '_')
        .replace(/[^\p{L}\p{N}._-]/gu, '')
        .replace(/^[_\-.]+|[_\-.]+$/g, '')
        .slice(0, 50);
}

const TABLE_HEADERS = (
    <tr>
        <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-200">User</th>
        <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-200">Department Role</th>
        <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-200">System Link</th>
        <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-200">Approve Limit</th>
        <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-200">Status</th>
        <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-200">Last Active</th>
        <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-200">Actions</th>
    </tr>
);

export default function LineUserClient() {
    const { showToast, showConfirm } = useToast();
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
            setUsers(result.data as unknown as LineUser[]);
        }
        setLoading(false);
    }

    useEffect(() => {
        loadUsers();
    }, []);

    const syncLinkedUser = async (id: number) => {
        const syncResult = await syncLinkedLineUserAccount(id);
        if (syncResult.success && syncResult.data) {
            setUsers(prev => prev.map((u) => (
                u.id === id
                    ? { ...u, linked_user: syncResult.data as LineUser['linked_user'] }
                    : u
            )));
            showToast(syncResult.message || 'System Link updated', 'success');
            return true;
        }

        showToast(syncResult.error || 'Failed to sync System Link', 'error');
        return false;
    };

    const handleRefreshPhotos = async () => {
        setRefreshing(true);
        const result = await refreshLineUserProfiles();
        if (result.success) {
            showToast(result.message || 'Refresh completed', 'success');
            loadUsers();
        } else {
            showToast('Failed to refresh photos: ' + result.error, 'error');
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
                showToast('QR Code uploaded successfully', 'success');
            } else {
                showToast('Failed to upload QR Code', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Error uploading file', 'error');
        } finally {
            setUploadingQR(false);
        }
    };

    const handleToggleApprover = async (id: number, currentStatus: boolean) => {
        const result = await toggleApprover(id, !currentStatus);
        if (result.success) {
            setUsers(prev => prev.map(u => (u.id === id ? { ...u, is_approver: !currentStatus } : u)));
        }
    };

    const handleToggleActive = async (id: number, currentStatus: boolean) => {
        const result = await toggleLineUserActive(id, !currentStatus);
        if (result.success) {
            setUsers(prev => prev.map(u => (u.id === id ? { ...u, is_active: !currentStatus } : u)));
        }
    };

    const handleUpdateRole = async (id: number, role: string) => {
        const result = await updateLineUserRole(id, role);
        if (result.success) {
            let shouldOfferSync = false;
            setUsers(prev => prev.map((u) => {
                if (u.id !== id) return u;
                shouldOfferSync = Boolean(u.linked_user && u.linked_user.role !== role);
                return { ...u, role };
            }));

            if (shouldOfferSync && await showConfirm({
                title: 'Sync System Link',
                message: 'Department Role มีการเปลี่ยนแปลง ต้องการ sync ไปที่ System Link ด้วยหรือไม่?',
                confirmText: 'Sync now',
                cancelText: 'Later',
                type: 'warning',
            })) {
                await syncLinkedUser(id);
            }
        } else {
            showToast('Failed to update role', 'error');
        }
    };

    const handleUpdateFullName = async (id: number, fullName: string) => {
        const result = await updateLineUserFullName(id, fullName);
        if (result.success) {
            let shouldOfferSync = false;
            setUsers(prev => prev.map((u) => {
                if (u.id !== id) return u;
                shouldOfferSync = Boolean(u.linked_user);
                return { ...u, full_name: fullName };
            }));

            if (shouldOfferSync && await showConfirm({
                title: 'Sync System Link',
                message: 'ชื่อผู้ใช้มีการเปลี่ยนแปลง ต้องการ sync ชื่อไปที่ System Link ด้วยหรือไม่?',
                confirmText: 'Sync now',
                cancelText: 'Later',
                type: 'info',
            })) {
                await syncLinkedUser(id);
            }
        } else {
            showToast('Failed to update name', 'error');
        }
    };

    const handleDelete = async (id: number) => {
        const confirmed = await showConfirm({
            title: 'Delete LINE User',
            message: 'Are you sure you want to delete this user?',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            type: 'danger',
        });
        if (!confirmed) return;
        const result = await deleteLineUser(id);
        if (result.success) {
            setUsers(prev => prev.filter(u => u.id !== id));
            showToast('LINE user deleted', 'success');
        } else {
            showToast(result.error || 'Failed to delete user', 'error');
        }
    };

    const handleProvisionAccount = async (id: number) => {
        const result = await provisionLineUserAccount(id);
        if (result.success && result.data) {
            setUsers((prev) => prev.map((user) => (
                user.id === id
                    ? { ...user, linked_user: result.data as LineUser['linked_user'] }
                    : user
            )));
            showToast('Provision ระบบให้ LINE account เรียบร้อยแล้ว', 'success');
        } else {
            showToast(result.error || 'Failed to provision account', 'error');
        }
    };

    const { pending: pendingUsers, assigned: assignedUsers } = partitionLineUsersByAssignment(users);
    const customerRegisterUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/line/customer-register`
        : 'https://mpstock.sugoidev.com/line/customer-register';

    const renderRows = (list: LineUser[]) => (
        list.map((user) => (
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
                                placeholder="Full name (replace LINE display name)"
                                defaultValue={user.full_name || ''}
                                onBlur={(e) => {
                                    if (e.target.value !== (user.full_name || '')) {
                                        handleUpdateFullName(user.id, e.target.value);
                                    }
                                }}
                                className="font-medium text-gray-900 dark:text-white bg-transparent border-b border-dashed border-gray-300 focus:border-blue-500 focus:outline-none w-full min-w-[150px]"
                            />
                            {user.display_name && (
                                <div className="text-xs text-gray-500 mt-0.5">LINE: {user.display_name}</div>
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
                        {LINE_USER_ROLE_OPTIONS.map((roleOption) => (
                            <option key={roleOption.value} value={roleOption.value}>
                                {roleOption.label}
                            </option>
                        ))}
                    </select>
                </td>
                <td className="p-4">
                    {user.linked_user ? (
                        <div className="space-y-1">
                            <div className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                <Link2 size={12} />
                                Linked
                            </div>
                            <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{user.linked_user.username}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                User #{user.linked_user.p_id} • {getRoleLabel(user.linked_user.role)}
                            </div>
                            {(user.linked_user.username !== getExpectedLinkedUsername(user)
                                || user.linked_user.role !== user.role) && (
                                <button
                                    type="button"
                                    onClick={() => void syncLinkedUser(user.id)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 transition-colors hover:bg-amber-100"
                                >
                                    Sync changes
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                                Unlinked
                            </div>
                            {user.role !== 'pending' ? (
                                <button
                                    onClick={() => handleProvisionAccount(user.id)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                                >
                                    <Link2 size={13} />
                                    Provision
                                </button>
                            ) : (
                                <div className="text-xs text-amber-700 dark:text-amber-300">Assign role first</div>
                            )}
                        </div>
                    )}
                </td>
                <td className="p-4">
                    <button
                        onClick={() => handleToggleApprover(user.id, user.is_approver)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                            user.is_approver
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
                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            user.is_active
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
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">LINE ภายใน (พนักงาน)</h1>
                    <p className="text-gray-500 dark:text-gray-400">สำหรับผู้ใช้ภายในที่ต้อง Add ผ่าน QR Code เท่านั้น</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleRefreshPhotos}
                        disabled={refreshing}
                        className="flex items-center gap-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm"
                        title="Refresh profile pictures from LINE API"
                    >
                        {refreshing ? 'Refreshing...' : 'Refresh Photos'}
                    </button>
                    <button
                        onClick={() => setShowQRCode(!showQRCode)}
                        className="flex items-center gap-2 bg-[#06C755] hover:bg-[#05b34c] text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        <Plus size={20} />
                        เพิ่ม LINE ภายใน (QR)
                    </button>
                </div>
            </div>

            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/50 dark:bg-sky-950/30">
                <div className="flex flex-col gap-2 text-sm text-sky-900 dark:text-sky-100">
                    <p className="font-semibold">หน้านี้สำหรับ LINE ภายในเท่านั้น</p>
                    <p>หากเป็นลูกค้าที่ลงทะเบียนเอง ให้จัดการที่หน้า <span className="font-semibold">ลูกค้า LINE</span> และใช้ลิงก์ลงทะเบียนลูกค้าด้านล่าง</p>
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href="/settings/line-customers"
                            className="inline-flex items-center gap-1 rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-900/40 dark:text-sky-200"
                        >
                            ไปหน้าลูกค้า LINE <ExternalLink size={13} />
                        </Link>
                        <a
                            href={customerRegisterUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
                        >
                            ลิงก์ลงทะเบียนลูกค้า <ExternalLink size={13} />
                        </a>
                    </div>
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

            {loading ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-8 text-center text-gray-500">Loading users...</div>
            ) : users.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-8 text-center text-gray-500">
                    No LINE users found. Scan the QR code to add the bot.
                </div>
            ) : (
                <div className="space-y-4">
                    {pendingUsers.length > 0 && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl shadow-sm overflow-hidden border border-amber-200 dark:border-amber-800">
                            <div className="px-4 py-3 text-sm font-semibold text-amber-700 dark:text-amber-300">
                                Pending Position Assignment ({pendingUsers.length})
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-amber-100/70 dark:bg-amber-900/30">{TABLE_HEADERS}</thead>
                                    <tbody className="divide-y divide-amber-100 dark:divide-amber-800/40">{renderRows(pendingUsers)}</tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-slate-700">
                            Assigned Position ({assignedUsers.length})
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 dark:bg-slate-700">{TABLE_HEADERS}</thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-600">
                                    {assignedUsers.length > 0 ? (
                                        renderRows(assignedUsers)
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-gray-500">
                                                No assigned users yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            <div className="text-sm text-gray-500 bg-blue-50 dark:bg-slate-800/50 p-4 rounded-lg border border-blue-100 dark:border-slate-700">
                <h4 className="font-semibold mb-1 text-blue-700 dark:text-blue-400">How to Setup</h4>
                <ul className="list-disc list-inside space-y-1">
                    <li>Create a LINE Official Account (Messaging API)</li>
                    <li>
                        Set the <strong>Webhook URL</strong> in LINE Console to:{' '}
                        <code>{typeof window !== 'undefined' ? `${window.location.origin}/api/line/webhook` : '/api/line/webhook'}</code>
                    </li>
                    <li>Enable &quot;Use Webhook&quot; in LINE Console</li>
                    <li>Scan QR code to add the bot as a friend</li>
                </ul>
            </div>
        </div>
    );
}
