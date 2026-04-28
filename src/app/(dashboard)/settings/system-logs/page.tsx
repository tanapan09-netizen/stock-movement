'use client';

import { useState, useEffect } from 'react';
import { getSystemLogs } from '@/actions/logActions';
import { FloatingSearchInput } from '@/components/FloatingField';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface SystemLog {
    id: number;
    action: string;
    entity: string;
    entity_id: string;
    details: string | null;
    username: string;
    created_at: string;
    tbl_users?: { role: string };
}

export default function SystemLogsPage() {
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filterAction, setFilterAction] = useState('all');
    const [searchUser, setSearchUser] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
    const [copiedLogId, setCopiedLogId] = useState<number | null>(null);

    useEffect(() => {
        loadLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, filterAction, startDate, endDate]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            loadLogs();
        }, 500);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchUser]);

    async function loadLogs() {
        setLoading(true);
        const result = await getSystemLogs(page, 20, {
            action: filterAction,
            username: searchUser,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
        });

        if (result.success && result.data) {
            setLogs(result.data as any);
            setTotalPages(result.totalPages || 1);
        }
        setLoading(false);
    }

    function getActionBadgeColor(action: string) {
        switch (action) {
            case 'CREATE': return 'bg-green-100 text-green-800';
            case 'UPDATE': return 'bg-blue-100 text-blue-800';
            case 'DELETE': return 'bg-red-100 text-red-800';
            case 'BORROW': return 'bg-orange-100 text-orange-800';
            case 'RETURN': return 'bg-lime-100 text-lime-800';
            case 'LOGIN': return 'bg-purple-100 text-purple-800';
            case 'LOGOUT': return 'bg-slate-100 text-slate-700';
            case 'LOGIN_FAILED': return 'bg-amber-100 text-amber-800';
            case 'ACCOUNT_LOCKED': return 'bg-rose-100 text-rose-800';
            case 'PAGE_VIEW': return 'bg-indigo-100 text-indigo-800';
            case 'SETTINGS_UPDATE': return 'bg-cyan-100 text-cyan-800';
            case 'ASSET_POLICY_UPDATE': return 'bg-teal-100 text-teal-800';
            case 'UPDATE_ROLE_PERMISSIONS': return 'bg-violet-100 text-violet-800';
            case 'UPDATE_USER_PERMISSIONS': return 'bg-fuchsia-100 text-fuchsia-800';
            case 'PETTY_CASH_CREATE':
            case 'PETTY_CASH_APPROVE':
            case 'PETTY_CASH_DISPENSE':
            case 'PETTY_CASH_CLEARANCE_SUBMIT':
            case 'PETTY_CASH_RECONCILE':
            case 'PETTY_CASH_REJECT':
            case 'PETTY_CASH_DELETE':
            case 'PETTY_CASH_RECEIPT_VERIFY':
            case 'PETTY_CASH_SIGNATURE_SAVE':
                return 'bg-emerald-100 text-emerald-800';
            case 'LINE_NOTIFY_SENT':
                return 'bg-sky-100 text-sky-800';
            case 'LINE_NOTIFY_FAILED':
                return 'bg-rose-100 text-rose-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    function formatLogDetails(details: string | null) {
        if (!details) return '-';

        try {
            const parsed = JSON.parse(details);
            if (typeof parsed === 'string') return parsed;
            return JSON.stringify(parsed, null, 2);
        } catch {
            return details;
        }
    }

    function getDetailPreview(details: string | null) {
        const normalized = formatLogDetails(details).replace(/\s+/g, ' ').trim();
        if (normalized.length <= 100) return normalized;
        return `${normalized.slice(0, 100)}...`;
    }

    async function handleCopyDetails(log: SystemLog) {
        const text = formatLogDetails(log.details);

        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }

            setCopiedLogId(log.id);
            setTimeout(() => {
                setCopiedLogId((current) => (current === log.id ? null : current));
            }, 1200);
        } catch (error) {
            console.error('Failed to copy log details:', error);
        }
    }

    return (
        <div className="space-y-6 p-6">
            <h1 className="text-2xl font-bold text-gray-800">System Logs</h1>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                   <h2 className="text-sm font-semibold text-blue-800">Log Retention Policy</h2>             
                <p className="mt-3 text-xs text-blue-700">
                    ตั้งค่าระยะเวลาเก็บและล้าง log {' '}
                    <a href="/admin/security" className="font-semibold underline underline-offset-2 hover:text-blue-900">
                        Security Management
                    </a>
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex-1 min-w-[200px]">
                    <FloatingSearchInput
                        label="Search User"
                        type="text"
                        value={searchUser}
                        onChange={(e) => setSearchUser(e.target.value)}
                        className="focus:ring-blue-500/20"
                    />
                </div>
                <div className="w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
                    <select
                        value={filterAction}
                        onChange={(e) => {
                            setPage(1);
                            setFilterAction(e.target.value);
                        }}
                        className="w-full border rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">All Actions</option>
                        <option value="CREATE">Create</option>
                        <option value="UPDATE">Update</option>
                        <option value="DELETE">Delete</option>
                        <option value="BORROW">Borrow</option>
                        <option value="RETURN">Return</option>
                        <option value="LOGIN">Login</option>
                        <option value="LOGOUT">Logout</option>
                        <option value="LOGIN_FAILED">Login Failed</option>
                        <option value="ACCOUNT_LOCKED">Account Locked</option>
                        <option value="PAGE_VIEW">Page View</option>
                        <option value="SETTINGS_UPDATE">Settings Update</option>
                        <option value="ASSET_POLICY_UPDATE">Asset Policy Update</option>
                        <option value="UPDATE_ROLE_PERMISSIONS">Update Role Permissions</option>
                        <option value="UPDATE_USER_PERMISSIONS">Update User Permissions</option>
                        <option value="PETTY_CASH_CREATE">Petty Cash Create</option>
                        <option value="PETTY_CASH_APPROVE">Petty Cash Approve</option>
                        <option value="PETTY_CASH_DISPENSE">Petty Cash Dispense</option>
                        <option value="PETTY_CASH_CLEARANCE_SUBMIT">Petty Cash Clearance Submit</option>
                        <option value="PETTY_CASH_RECONCILE">Petty Cash Reconcile</option>
                        <option value="PETTY_CASH_REJECT">Petty Cash Reject</option>
                        <option value="PETTY_CASH_DELETE">Petty Cash Delete</option>
                        <option value="PETTY_CASH_RECEIPT_VERIFY">Petty Cash Receipt Verify</option>
                        <option value="PETTY_CASH_SIGNATURE_SAVE">Petty Cash Signature Save</option>
                        <option value="LINE_NOTIFY_SENT">LINE Notify Sent</option>
                        <option value="LINE_NOTIFY_FAILED">LINE Notify Failed</option>
                    </select>
                </div>
                <div className="w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                            setPage(1);
                            setStartDate(e.target.value);
                        }}
                        className="w-full border rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div className="w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                            setPage(1);
                            setEndDate(e.target.value);
                        }}
                        className="w-full border rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div className="flex items-end">
                    <button
                        type="button"
                        onClick={() => {
                            setPage(1);
                            setFilterAction('all');
                            setSearchUser('');
                            setStartDate('');
                            setEndDate('');
                        }}
                        className="h-[38px] px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">Loading logs...</td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No logs found</td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {format(new Date(log.created_at), 'dd MMM yyyy HH:mm:ss', { locale: th })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{log.username || 'System'}</div>
                                            {log.tbl_users && <div className="text-xs text-gray-500">{log.tbl_users.role}</div>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionBadgeColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {log.entity} <span className="text-xs text-gray-400">#{log.entity_id}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-md">
                                            <div className="space-y-2">
                                                <p className="truncate" title={formatLogDetails(log.details)}>
                                                    {getDetailPreview(log.details)}
                                                </p>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedLog(log)}
                                                        className="px-2 py-1 text-xs font-medium rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                                                    >
                                                        View
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleCopyDetails(log)}
                                                        className="px-2 py-1 text-xs font-medium rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                                                    >
                                                        {copiedLogId === log.id ? 'Copied' : 'Copy'}
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                    <div className="flex-1 flex justify-between sm:hidden">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                Showing page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                            </p>
                        </div>
                        <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>

            {selectedLog && (
                <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center">
                    <div className="w-full max-w-3xl max-h-[85vh] bg-white rounded-lg shadow-xl border flex flex-col">
                        <div className="px-4 py-3 border-b flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Log Details</h3>
                                <p className="text-xs text-gray-500">
                                    {selectedLog.action} - {selectedLog.entity} #{selectedLog.entity_id}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => void handleCopyDetails(selectedLog)}
                                    className="px-3 py-1.5 text-xs font-medium rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    {copiedLogId === selectedLog.id ? 'Copied' : 'Copy'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedLog(null)}
                                    className="px-3 py-1.5 text-xs font-medium rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                        <div className="p-4 overflow-auto">
                            <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words bg-gray-50 border rounded p-3">
                                {formatLogDetails(selectedLog.details)}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
