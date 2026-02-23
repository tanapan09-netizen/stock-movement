'use client';

import { useSession } from 'next-auth/react';

export default function DebugAuthPage() {
    const { data: session, status, update } = useSession();

    return (
        <div className="p-8 font-mono space-y-4">
            <h1 className="text-2xl font-bold">Auth Debugger</h1>

            <div className="flex gap-4">
                <button
                    onClick={() => update()}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Force Session Update
                </button>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                    Reload Page
                </button>
            </div>

            <div className="border p-4 rounded">
                <div><strong>Status:</strong> {status}</div>
                <div><strong>Role in Session:</strong> {(session?.user as any)?.role || 'undefined'}</div>
            </div>

            <div className="bg-gray-100 p-4 rounded overflow-auto text-xs">
                <pre>{JSON.stringify(session, null, 2)}</pre>
            </div>
        </div>
    );
}
