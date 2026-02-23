'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
    Wrench, Clock, CheckCircle, AlertTriangle, TrendingUp,
    Calendar, DollarSign, User, ArrowRight, BarChart3
} from 'lucide-react';
import {
    getMaintenanceRequests,
    getMaintenanceStats,
    updateMaintenanceRequest
} from '@/actions/maintenanceActions';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface MaintenanceRequestItem {
    request_id: number;
    request_number: string;
    room_id: number;
    title: string;
    description: string | null;
    priority: string;
    status: string;
    reported_by: string;
    assigned_to: string | null;
    scheduled_date: Date | null;
    created_at: Date;
    tbl_rooms: {
        room_code: string;
        room_name: string;
    };
}

const PRIORITY_COLORS: Record<string, string> = {
    low: 'bg-gray-100 text-gray-600',
    normal: 'bg-blue-100 text-blue-600',
    high: 'bg-orange-100 text-orange-600',
    urgent: 'bg-red-100 text-red-600'
};

const STATUS_LABELS: Record<string, string> = {
    pending: 'รอดำเนินการ',
    in_progress: 'กำลังซ่อม',
    completed: 'เสร็จแล้ว',
    cancelled: 'ยกเลิก'
};

export default function MaintenanceDashboardClient() {
    const { data: session } = useSession();
    const user = session?.user as { name?: string; role?: string };
    const [requests, setRequests] = useState<MaintenanceRequestItem[]>([]);
    const [summary, setSummary] = useState({ total: 0, pending: 0, in_progress: 0, completed: 0, total_cost: 0 });
    const [chartData, setChartData] = useState<{ name: string; value: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [myTasks, setMyTasks] = useState<MaintenanceRequestItem[]>([]);
    const [urgentTasks, setUrgentTasks] = useState<MaintenanceRequestItem[]>([]);
    const [todayTasks, setTodayTasks] = useState<MaintenanceRequestItem[]>([]);

    async function loadData() {
        setLoading(true);
        try {
            const [reqResult, statsResult] = await Promise.all([
                getMaintenanceRequests(),
                getMaintenanceStats()
            ]);

            if (reqResult.success) {
                const allRequests = reqResult.data as MaintenanceRequestItem[];
                setRequests(allRequests);

                // Filter my tasks (assigned to current user)
                const myName = user?.name || '';
                setMyTasks(allRequests.filter(r =>
                    r.assigned_to?.toLowerCase() === myName.toLowerCase() &&
                    r.status !== 'completed' && r.status !== 'cancelled'
                ));

                // Filter urgent tasks
                setUrgentTasks(allRequests.filter(r =>
                    r.priority === 'urgent' && r.status !== 'completed' && r.status !== 'cancelled'
                ));

                // Filter today's scheduled tasks
                const today = new Date().toDateString();
                setTodayTasks(allRequests.filter(r =>
                    r.scheduled_date && new Date(r.scheduled_date).toDateString() === today
                ));
            }

            if (statsResult.success && statsResult.data) {
                const data = statsResult.data;
                setSummary({
                    total: data.counts.total,
                    pending: data.counts.pending,
                    in_progress: data.counts.processing,
                    completed: data.counts.completed,
                    total_cost: data.totalCost
                });
                setChartData(data.chartData);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
        setLoading(false);
    }

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function handleQuickStatusChange(request_id: number, newStatus: string) {
        const result = await updateMaintenanceRequest(request_id, { status: newStatus }, user?.name || 'System');
        if (result.success) {
            loadData();
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Wrench className="text-blue-500" /> Dashboard งานซ่อม
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        ยินดีต้อนรับ, {user?.name || 'ช่าง'} ({user?.role === 'technician' ? 'ช่างซ่อม' : user?.role === 'operation' ? 'Operation' : user?.role})
                    </p>
                </div>
                <Link href="/maintenance" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                    ดูรายการทั้งหมด <ArrowRight size={18} />
                </Link>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border-l-4 border-gray-400">
                    <div className="flex items-center gap-3">
                        <BarChart3 className="text-gray-500" size={24} />
                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{summary.total}</div>
                            <div className="text-gray-500 text-sm">ทั้งหมด</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border-l-4 border-yellow-400">
                    <div className="flex items-center gap-3">
                        <Clock className="text-yellow-500" size={24} />
                        <div>
                            <div className="text-2xl font-bold text-yellow-600">{summary.pending}</div>
                            <div className="text-yellow-600 text-sm">รอดำเนินการ</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border-l-4 border-blue-400">
                    <div className="flex items-center gap-3">
                        <Wrench className="text-blue-500" size={24} />
                        <div>
                            <div className="text-2xl font-bold text-blue-600">{summary.in_progress}</div>
                            <div className="text-blue-600 text-sm">กำลังซ่อม</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border-l-4 border-green-400">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="text-green-500" size={24} />
                        <div>
                            <div className="text-2xl font-bold text-green-600">{summary.completed}</div>
                            <div className="text-green-600 text-sm">เสร็จแล้ว</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border-l-4 border-purple-400">
                    <div className="flex items-center gap-3">
                        <DollarSign className="text-purple-500" size={24} />
                        <div>
                            <div className="text-2xl font-bold text-purple-600">฿{summary.total_cost.toLocaleString()}</div>
                            <div className="text-purple-600 text-sm">ค่าใช้จ่าย</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts & Quick Panels Grid */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
                    <h3 className="font-semibold mb-4 text-gray-700 dark:text-gray-200 flex items-center gap-2">
                        <BarChart3 size={20} /> สถิติงานซ่อมย้อนหลัง 6 เดือน
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis dataKey="name" fontSize={12} />
                                <YAxis allowDecimals={false} fontSize={12} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="value" name="จำนวนงาน" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* My Tasks Panel (Moved here) */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b flex items-center gap-2">
                        <User className="text-blue-500" size={20} />
                        <h3 className="font-semibold text-blue-700 dark:text-blue-400">งานของฉัน ({myTasks.length})</h3>
                    </div>
                    <div className="divide-y dark:divide-slate-700 max-h-80 overflow-y-auto">
                        {myTasks.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">ไม่มีงานที่มอบหมาย</div>
                        ) : (
                            myTasks.map(task => (
                                <div key={task.request_id} className="p-3 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-medium text-sm">{task.title}</div>
                                            <div className="text-xs text-gray-500">{task.tbl_rooms.room_code}</div>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-xs ${PRIORITY_COLORS[task.priority]}`}>
                                            {task.priority === 'urgent' ? 'เร่งด่วน' : task.priority === 'high' ? 'สูง' : 'ปกติ'}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex gap-2">
                                        {task.status === 'pending' && (
                                            <button
                                                onClick={() => handleQuickStatusChange(task.request_id, 'in_progress')}
                                                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                                            >
                                                เริ่มซ่อม
                                            </button>
                                        )}
                                        {task.status === 'in_progress' && (
                                            <button
                                                onClick={() => handleQuickStatusChange(task.request_id, 'completed')}
                                                className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                                            >
                                                เสร็จแล้ว
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Secondary Grid */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Urgent Tasks */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b flex items-center gap-2">
                        <AlertTriangle className="text-red-500" size={20} />
                        <h3 className="font-semibold text-red-700 dark:text-red-400">งานเร่งด่วน ({urgentTasks.length})</h3>
                    </div>
                    <div className="divide-y dark:divide-slate-700 max-h-60 overflow-y-auto">
                        {urgentTasks.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">ไม่มีงานเร่งด่วน</div>
                        ) : (
                            urgentTasks.map(task => (
                                <div key={task.request_id} className="p-3 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                    <div className="font-medium text-sm text-red-600">{task.title}</div>
                                    <div className="text-xs text-gray-500">{task.tbl_rooms.room_code} - {task.tbl_rooms.room_name}</div>
                                    <div className="mt-1">
                                        <span className={`text-xs px-2 py-0.5 rounded ${task.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {STATUS_LABELS[task.status]}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Today's Schedule */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border-b flex items-center gap-2">
                        <Calendar className="text-green-500" size={20} />
                        <h3 className="font-semibold text-green-700 dark:text-green-400">นัดซ่อมวันนี้ ({todayTasks.length})</h3>
                    </div>
                    <div className="divide-y dark:divide-slate-700 max-h-60 overflow-y-auto">
                        {todayTasks.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">ไม่มีนัดซ่อมวันนี้</div>
                        ) : (
                            todayTasks.map(task => (
                                <div key={task.request_id} className="p-3 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                    <div className="font-medium text-sm">{task.title}</div>
                                    <div className="text-xs text-gray-500">{task.tbl_rooms.room_code} - {task.tbl_rooms.room_name}</div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        {task.assigned_to ? `ช่าง: ${task.assigned_to}` : 'ยังไม่มอบหมาย'}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Activities Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b flex items-center gap-2">
                    <TrendingUp className="text-gray-500" size={20} />
                    <h3 className="font-semibold">รายการล่าสุด</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">เลขที่</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">ห้อง</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">หัวข้อ</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">ผู้รับผิดชอบ</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-slate-700">
                            {requests.slice(0, 10).map(req => (
                                <tr key={req.request_id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{req.request_number}</td>
                                    <td className="px-4 py-3 text-sm">{req.tbl_rooms.room_code}</td>
                                    <td className="px-4 py-3 text-sm">{req.title}</td>
                                    <td className="px-4 py-3 text-sm">{req.assigned_to || '-'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded text-xs ${req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                            req.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                                req.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                    'bg-gray-100 text-gray-700'
                                            }`}>
                                            {STATUS_LABELS[req.status]}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
