'use client';

import { useState, useEffect, useRef } from 'react';
import { Terminal, RefreshCw, Trash2, Download, ArrowLeft, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import Link from 'next/link';

type LogEntry = {
    id: number;
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'success';
    message: string;
    source: string;
};

export default function SystemLogPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const logContainerRef = useRef<HTMLDivElement>(null);

    // Generate sample logs (in production, fetch from API/file)
    const generateSampleLogs = (): LogEntry[] => {
        const now = new Date();
        return [
            { id: 1, timestamp: new Date(now.getTime() - 300000).toISOString(), level: 'info', message: 'Server started on http://localhost:3000', source: 'Next.js' },
            { id: 2, timestamp: new Date(now.getTime() - 290000).toISOString(), level: 'success', message: '✓ Ready in 380ms', source: 'Next.js' },
            { id: 3, timestamp: new Date(now.getTime() - 250000).toISOString(), level: 'info', message: 'GET /api/auth/session 200 in 45ms', source: 'API' },
            { id: 4, timestamp: new Date(now.getTime() - 200000).toISOString(), level: 'info', message: 'GET /api/products 200 in 120ms', source: 'API' },
            { id: 5, timestamp: new Date(now.getTime() - 180000).toISOString(), level: 'info', message: 'Database connection established', source: 'Prisma' },
            { id: 6, timestamp: new Date(now.getTime() - 150000).toISOString(), level: 'warn', message: 'Slow query detected: SELECT * FROM tbl_products (>100ms)', source: 'Database' },
            { id: 7, timestamp: new Date(now.getTime() - 120000).toISOString(), level: 'info', message: 'User admin logged in successfully', source: 'Auth' },
            { id: 8, timestamp: new Date(now.getTime() - 100000).toISOString(), level: 'info', message: 'GET /settings 200 in 35ms', source: 'Page' },
            { id: 9, timestamp: new Date(now.getTime() - 80000).toISOString(), level: 'success', message: 'Settings saved to localStorage', source: 'Client' },
            { id: 10, timestamp: new Date(now.getTime() - 60000).toISOString(), level: 'info', message: 'GET /api/users/3 200 in 28ms', source: 'API' },
            { id: 11, timestamp: new Date(now.getTime() - 40000).toISOString(), level: 'info', message: 'GET /audit-log 200 in 42ms', source: 'Page' },
            { id: 12, timestamp: new Date(now.getTime() - 20000).toISOString(), level: 'info', message: 'WebSocket connection established', source: 'Socket' },
            { id: 13, timestamp: new Date(now.getTime() - 10000).toISOString(), level: 'success', message: 'Build completed successfully', source: 'Next.js' },
        ];
    };

    useEffect(() => {
        setLogs(generateSampleLogs());

        // Auto-refresh every 5 seconds if enabled
        let interval: NodeJS.Timeout;
        if (autoRefresh) {
            interval = setInterval(() => {
                const newLog: LogEntry = {
                    id: Date.now(),
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: `Heartbeat check - System running normally`,
                    source: 'System'
                };
                setLogs(prev => [...prev.slice(-50), newLog]);
            }, 10000);
        }

        return () => clearInterval(interval);
    }, [autoRefresh]);

    useEffect(() => {
        // Auto-scroll to bottom
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

    const getLogIcon = (level: string) => {
        switch (level) {
            case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
            case 'warn': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
            default: return <Info className="w-4 h-4 text-blue-500" />;
        }
    };

    const getLogBgColor = (level: string) => {
        switch (level) {
            case 'success': return 'bg-green-50 border-green-200';
            case 'error': return 'bg-red-50 border-red-200';
            case 'warn': return 'bg-yellow-50 border-yellow-200';
            default: return 'bg-gray-50 border-gray-200';
        }
    };

    const filteredLogs = filter === 'all' ? logs : logs.filter(log => log.level === filter);

    const formatTime = (iso: string) => {
        return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const handleClearLogs = () => {
        if (confirm('ล้าง Log ทั้งหมด?')) {
            setLogs([]);
        }
    };

    const handleExportLogs = () => {
        const content = logs.map(log => `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}`).join('\n');
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `system-log-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
    };

    return (
        <div className="max-w-6xl mx-auto pb-10">
            <Link href="/settings" className="flex items-center text-sm text-gray-500 mb-4 hover:text-gray-700">
                <ArrowLeft className="w-4 h-4 mr-1" /> กลับไปหน้าตั้งค่า
            </Link>

            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                    <Terminal className="w-8 h-8 mr-3 text-green-600" />
                    System Log (Console)
                </h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition ${autoRefresh ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}
                    >
                        <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                        Auto Refresh
                    </button>
                    <button
                        onClick={handleExportLogs}
                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium flex items-center gap-2 hover:bg-blue-200 transition"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                    <button
                        onClick={handleClearLogs}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium flex items-center gap-2 hover:bg-red-200 transition"
                    >
                        <Trash2 className="w-4 h-4" />
                        Clear
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-4">
                {['all', 'info', 'success', 'warn', 'error'].map(level => (
                    <button
                        key={level}
                        onClick={() => setFilter(level)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === level
                            ? 'bg-gray-800 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {level === 'all' ? 'ทั้งหมด' : level.toUpperCase()}
                        <span className="ml-1 opacity-75">
                            ({level === 'all' ? logs.length : logs.filter(l => l.level === level).length})
                        </span>
                    </button>
                ))}
            </div>

            {/* Log Container */}
            <div
                ref={logContainerRef}
                className="bg-gray-900 rounded-xl shadow-lg p-4 h-[500px] overflow-y-auto font-mono text-sm"
            >
                {filteredLogs.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        ไม่มี Log ที่จะแสดง
                    </div>
                ) : (
                    <div className="space-y-1">
                        {filteredLogs.map(log => (
                            <div
                                key={log.id}
                                className={`flex items-start gap-3 px-3 py-2 rounded border ${getLogBgColor(log.level)}`}
                            >
                                {getLogIcon(log.level)}
                                <span className="text-gray-500 shrink-0">{formatTime(log.timestamp)}</span>
                                <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs shrink-0">{log.source}</span>
                                <span className="text-gray-800">{log.message}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Status Bar */}
            <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <span>แสดง {filteredLogs.length} รายการ จากทั้งหมด {logs.length} รายการ</span>
                <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                    {autoRefresh ? 'Auto-refresh ทุก 10 วินาที' : 'Auto-refresh ปิดอยู่'}
                </span>
            </div>
        </div>
    );
}
