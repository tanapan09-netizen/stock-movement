'use client';

import { runStorageCleanup, type StorageCleanupResult } from '@/actions/storageCleanupActions';
import { HardDrive, RefreshCw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB', 'TB'];
    let value = bytes / 1024;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }
    return `${value.toFixed(2)} ${units[unitIndex]}`;
}

export default function StorageCleanupClient() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<StorageCleanupResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const canDelete = useMemo(() => {
        if (!result?.stats) return false;
        return result.stats.orphanFiles > 0;
    }, [result]);

    async function handleRun(execute: boolean) {
        setLoading(true);
        setError(null);

        const response = await runStorageCleanup(execute);
        if (!response.success) {
            setResult(null);
            setError(response.error || 'Failed to run cleanup.');
            setLoading(false);
            return;
        }

        setResult(response);
        setLoading(false);
    }

    async function handleExecute() {
        const confirmDelete = window.confirm('ยืนยันลบไฟล์รูปค้างที่ไม่ถูกใช้งานจากระบบ?');
        if (!confirmDelete) return;
        await handleRun(true);
    }

    return (
        <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <HardDrive className="w-6 h-6 text-blue-600" />
                    Storage Cleanup
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                    สแกนไฟล์รูปใน <code>public/uploads</code> แล้วตรวจว่ามีการอ้างอิงในฐานข้อมูลหรือไม่
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={() => void handleRun(false)}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Scan (Dry Run)
                    </button>

                    <button
                        type="button"
                        onClick={() => void handleExecute()}
                        disabled={loading || !canDelete}
                        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete Orphan Files
                    </button>
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            {result?.stats && (
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-lg border bg-gray-50 p-3">
                            <div className="text-xs text-gray-500">Referenced Paths</div>
                            <div className="mt-1 text-lg font-semibold text-gray-900">{result.stats.referencedPaths.toLocaleString()}</div>
                        </div>
                        <div className="rounded-lg border bg-gray-50 p-3">
                            <div className="text-xs text-gray-500">Images in Uploads</div>
                            <div className="mt-1 text-lg font-semibold text-gray-900">{result.stats.imageFiles.toLocaleString()}</div>
                        </div>
                        <div className="rounded-lg border bg-gray-50 p-3">
                            <div className="text-xs text-gray-500">Orphan Files</div>
                            <div className={`mt-1 text-lg font-semibold ${result.stats.orphanFiles > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {result.stats.orphanFiles.toLocaleString()}
                            </div>
                        </div>
                        <div className="rounded-lg border bg-gray-50 p-3">
                            <div className="text-xs text-gray-500">Orphan Size</div>
                            <div className="mt-1 text-lg font-semibold text-gray-900">{formatBytes(result.stats.orphanBytes)}</div>
                        </div>
                        <div className="rounded-lg border bg-gray-50 p-3">
                            <div className="text-xs text-gray-500">Deleted Files</div>
                            <div className="mt-1 text-lg font-semibold text-gray-900">{result.stats.deletedFiles.toLocaleString()}</div>
                        </div>
                        <div className="rounded-lg border bg-gray-50 p-3">
                            <div className="text-xs text-gray-500">Freed Size</div>
                            <div className="mt-1 text-lg font-semibold text-gray-900">{formatBytes(result.stats.deletedBytes)}</div>
                        </div>
                    </div>

                    {result.message && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                            {result.message}
                        </div>
                    )}

                    <div>
                        <h2 className="text-sm font-semibold text-gray-900">Orphan File Preview (up to 200 files)</h2>
                        <div className="mt-2 max-h-80 overflow-auto rounded-lg border bg-gray-50">
                            {result.preview && result.preview.length > 0 ? (
                                <ul className="divide-y">
                                    {result.preview.map((file) => (
                                        <li key={file.path} className="flex items-center justify-between px-3 py-2 text-xs text-gray-700">
                                            <span className="font-mono break-all pr-4">{file.path}</span>
                                            <span className="text-gray-500 whitespace-nowrap">{formatBytes(file.size)}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="px-3 py-6 text-center text-sm text-gray-500">No orphan files</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
