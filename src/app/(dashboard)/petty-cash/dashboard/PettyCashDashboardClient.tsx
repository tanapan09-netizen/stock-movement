'use client';

import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { Wallet, AlertCircle, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';

interface DashboardProps {
    initialData: any;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function PettyCashDashboardClient({ initialData }: DashboardProps) {
    if (!initialData) return <div>Loading...</div>;

    const { monthlyTotal, pendingReceiptsCount, trendData, userData } = initialData;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ภาพรวมเงินสดย่อย (Analytics)</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">สรุปข้อมูลการเบิกจ่ายและใบเสร็จรับเงิน</p>
                </div>
                <Link
                    href="/petty-cash"
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 bg-white"
                >
                    กลับหน้ารายการ
                </Link>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Monthly Total */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200">
                            <Wallet className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ยอดเบิกจ่ายเดือนนี้</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                ฿{monthlyTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Pending Receipts */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-200">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">รอตรวจเอกสารตัวจริง</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingReceiptsCount} รายการ</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Trend Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center mb-4">
                        <TrendingUp className="h-5 w-5 text-gray-400 mr-2" />
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">แนวโน้มการเบิกจ่าย (6 เดือนย้อนหลัง)</h2>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <RechartsTooltip
                                    formatter={(value: any) => [`฿${Number(value).toLocaleString()}`, 'ยอดเงิน']}
                                    labelStyle={{ color: 'black' }}
                                />
                                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} name="ยอดเบิก (บาท)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* User Breakdown */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center mb-4">
                        <Users className="h-5 w-5 text-gray-400 mr-2" />
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">ผู้เบิกสูงสุด 5 อันดับแรก (เดือนนี้)</h2>
                    </div>
                    {userData.length > 0 ? (
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={userData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="amount"
                                        label={({ name, percent }) => percent ? `${name} ${(percent * 100).toFixed(0)}%` : name}
                                    >
                                        {userData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip formatter={(value: number | undefined) => [value ? `฿${value.toLocaleString()}` : `฿0`, 'ยอดเงิน']} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-80 flex items-center justify-center text-gray-500">
                            ยังไม่มีข้อมูลการเบิกจ่ายในเดือนนี้
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
