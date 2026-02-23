'use client';

import { useState } from 'react';
import { Book, ChevronDown, ChevronRight, Copy, Check, Lock, Server, Database, Mail, Shield } from 'lucide-react';
import Link from 'next/link';

interface Endpoint {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    description: string;
    auth: boolean;
    params?: { name: string; type: string; required: boolean; description: string }[];
    response?: string;
}

interface Category {
    name: string;
    icon: React.ReactNode;
    endpoints: Endpoint[];
}

const apiCategories: Category[] = [
    {
        name: 'Authentication',
        icon: <Lock className="w-5 h-5" />,
        endpoints: [
            {
                method: 'POST',
                path: '/api/auth/signin',
                description: 'เข้าสู่ระบบด้วย username และ password',
                auth: false,
                params: [
                    { name: 'username', type: 'string', required: true, description: 'ชื่อผู้ใช้' },
                    { name: 'password', type: 'string', required: true, description: 'รหัสผ่าน' },
                ],
                response: '{ "user": { "id": 1, "name": "admin", "role": "admin" } }',
            },
            {
                method: 'GET',
                path: '/api/auth/session',
                description: 'ดึงข้อมูล session ปัจจุบัน',
                auth: true,
                response: '{ "user": { "id": 1, "name": "admin" }, "expires": "..." }',
            },
        ],
    },
    {
        name: 'Products',
        icon: <Database className="w-5 h-5" />,
        endpoints: [
            {
                method: 'GET',
                path: '/api/products',
                description: 'ดึงรายการสินค้าทั้งหมด',
                auth: true,
                params: [
                    { name: 'search', type: 'string', required: false, description: 'คำค้นหา' },
                    { name: 'category', type: 'number', required: false, description: 'ID หมวดหมู่' },
                ],
                response: '{ "products": [...], "total": 100 }',
            },
            {
                method: 'POST',
                path: '/api/products',
                description: 'เพิ่มสินค้าใหม่',
                auth: true,
                params: [
                    { name: 'p_code', type: 'string', required: true, description: 'รหัสสินค้า' },
                    { name: 'p_name', type: 'string', required: true, description: 'ชื่อสินค้า' },
                    { name: 'p_qty', type: 'number', required: false, description: 'จำนวน' },
                    { name: 'cat_id', type: 'number', required: false, description: 'ID หมวดหมู่' },
                ],
                response: '{ "success": true, "product": {...} }',
            },
        ],
    },
    {
        name: 'Security',
        icon: <Shield className="w-5 h-5" />,
        endpoints: [
            {
                method: 'GET',
                path: '/api/security/csrf',
                description: 'สร้าง CSRF token ใหม่',
                auth: false,
                response: '{ "token": "abc123...", "message": "..." }',
            },
        ],
    },
    {
        name: 'Backup',
        icon: <Server className="w-5 h-5" />,
        endpoints: [
            {
                method: 'GET',
                path: '/api/backup',
                description: 'ดาวน์โหลด database backup (JSON)',
                auth: true,
                response: '{ "version": "1.0", "data": {...} }',
            },
            {
                method: 'POST',
                path: '/api/backup',
                description: 'Restore จาก backup file',
                auth: true,
                params: [
                    { name: 'file', type: 'JSON', required: true, description: 'Backup file content' },
                ],
                response: '{ "success": true, "restored": {...} }',
            },
        ],
    },
    {
        name: 'Email',
        icon: <Mail className="w-5 h-5" />,
        endpoints: [
            {
                method: 'GET',
                path: '/api/email',
                description: 'ตรวจสอบสถานะ email configuration',
                auth: true,
                response: '{ "configured": true, "alerts": {...} }',
            },
            {
                method: 'POST',
                path: '/api/email',
                description: 'ส่ง email แจ้งเตือน',
                auth: true,
                params: [
                    { name: 'type', type: 'string', required: true, description: 'low_stock | security_alert | test' },
                    { name: 'data', type: 'object', required: true, description: 'ข้อมูลสำหรับ email' },
                ],
                response: '{ "success": true, "message": "Email queued" }',
            },
        ],
    },
];

export default function APIDocsPage() {
    const [expanded, setExpanded] = useState<string[]>(['Authentication']);
    const [copied, setCopied] = useState<string | null>(null);

    const toggleCategory = (name: string) => {
        setExpanded(prev =>
            prev.includes(name)
                ? prev.filter(n => n !== name)
                : [...prev, name]
        );
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const methodColors: Record<string, string> = {
        GET: 'bg-green-100 text-green-700',
        POST: 'bg-blue-100 text-blue-700',
        PUT: 'bg-yellow-100 text-yellow-700',
        DELETE: 'bg-red-100 text-red-700',
    };

    return (
        <div className="max-w-5xl mx-auto pb-10">
            <div className="flex items-center gap-3 mb-6">
                <Link href="/settings" className="text-gray-500 hover:text-gray-700">
                    ← กลับ
                </Link>
            </div>

            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3 mb-2">
                <Book className="w-8 h-8 text-indigo-600" />
                API Documentation
            </h1>
            <p className="text-gray-500 mb-6">เอกสารอ้างอิง API ของระบบ Stock Movement Pro</p>

            {/* Base URL */}
            <div className="bg-gray-800 text-white rounded-lg p-4 mb-6 font-mono text-sm">
                <span className="text-gray-400">Base URL:</span>{' '}
                <span className="text-green-400">http://localhost:3000</span>
            </div>

            {/* CSRF Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h3 className="font-bold text-yellow-800 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    CSRF Protection
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                    POST/PUT/DELETE requests ต้องมี header <code className="bg-yellow-200 px-1 rounded">x-csrf-token</code>
                </p>
            </div>

            {/* Categories */}
            <div className="space-y-4">
                {apiCategories.map((category) => (
                    <div key={category.name} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <button
                            onClick={() => toggleCategory(category.name)}
                            className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
                        >
                            <div className="flex items-center gap-3">
                                {category.icon}
                                <span className="font-bold text-gray-800">{category.name}</span>
                                <span className="text-sm text-gray-400">({category.endpoints.length} endpoints)</span>
                            </div>
                            {expanded.includes(category.name) ? (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                            ) : (
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            )}
                        </button>

                        {expanded.includes(category.name) && (
                            <div className="border-t divide-y">
                                {category.endpoints.map((endpoint, idx) => (
                                    <div key={idx} className="p-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${methodColors[endpoint.method]}`}>
                                                {endpoint.method}
                                            </span>
                                            <code className="text-sm font-mono">{endpoint.path}</code>
                                            {endpoint.auth && (
                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                                    🔒 Auth required
                                                </span>
                                            )}
                                            <button
                                                onClick={() => copyToClipboard(endpoint.path, `${category.name}-${idx}`)}
                                                className="ml-auto p-1 text-gray-400 hover:text-gray-600"
                                                title="คัดลอก"
                                            >
                                                {copied === `${category.name}-${idx}` ? (
                                                    <Check className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <Copy className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>

                                        <p className="text-sm text-gray-600 mb-3">{endpoint.description}</p>

                                        {endpoint.params && (
                                            <div className="mb-3">
                                                <p className="text-xs font-medium text-gray-500 mb-1">Parameters:</p>
                                                <div className="bg-gray-50 rounded p-2 text-sm">
                                                    {endpoint.params.map((param, i) => (
                                                        <div key={i} className="flex gap-2 py-1">
                                                            <code className="text-blue-600">{param.name}</code>
                                                            <span className="text-gray-400">({param.type})</span>
                                                            {param.required && <span className="text-red-500 text-xs">*required</span>}
                                                            <span className="text-gray-500">- {param.description}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {endpoint.response && (
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 mb-1">Response:</p>
                                                <pre className="bg-gray-800 text-green-400 rounded p-2 text-xs overflow-x-auto">
                                                    {endpoint.response}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
