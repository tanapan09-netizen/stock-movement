'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Package, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';

interface ProductForecast {
    productId: string;
    productName: string;
    currentStock: number;
    avgDailyUsage: number;
    daysOfStock: number;
    predictedDemand30Days: number;
    reorderPoint: number;
    status: 'critical' | 'warning' | 'normal' | 'excess';
    trend: 'up' | 'down' | 'stable';
    confidence: number;
}

export default function DemandForecast() {
    const [forecasts, setForecasts] = useState<ProductForecast[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<'daysOfStock' | 'avgDailyUsage'>('daysOfStock');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    useEffect(() => {
        const fetchForecasts = async () => {
            try {
                const res = await fetch('/api/forecast');
                if (res.ok) {
                    const data = await res.json();
                    setForecasts(data);
                }
            } catch {
                // Mock data for demo
                setForecasts([
                    { productId: 'P001', productName: 'กระดาษ A4', currentStock: 50, avgDailyUsage: 5, daysOfStock: 10, predictedDemand30Days: 150, reorderPoint: 75, status: 'warning', trend: 'up', confidence: 85 },
                    { productId: 'P002', productName: 'ปากกาลูกลื่น', currentStock: 20, avgDailyUsage: 8, daysOfStock: 2.5, predictedDemand30Days: 240, reorderPoint: 120, status: 'critical', trend: 'up', confidence: 90 },
                    { productId: 'P003', productName: 'หมึกพิมพ์', currentStock: 100, avgDailyUsage: 2, daysOfStock: 50, predictedDemand30Days: 60, reorderPoint: 30, status: 'normal', trend: 'stable', confidence: 75 },
                    { productId: 'P004', productName: 'กาวลาเท็กซ์', currentStock: 500, avgDailyUsage: 1, daysOfStock: 500, predictedDemand30Days: 30, reorderPoint: 15, status: 'excess', trend: 'down', confidence: 80 },
                    { productId: 'P005', productName: 'สติกเกอร์', currentStock: 75, avgDailyUsage: 3, daysOfStock: 25, predictedDemand30Days: 90, reorderPoint: 45, status: 'normal', trend: 'stable', confidence: 70 },
                ]);
            }
            setLoading(false);
        };

        fetchForecasts();
    }, []);

    const sortedForecasts = [...forecasts].sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    const handleSort = (field: 'daysOfStock' | 'avgDailyUsage') => {
        if (sortBy === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'critical': return 'bg-red-100 text-red-700 border-red-200';
            case 'warning': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'normal': return 'bg-green-100 text-green-700 border-green-200';
            case 'excess': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'critical': return 'สั่งซื้อด่วน';
            case 'warning': return 'ใกล้สั่งซื้อ';
            case 'normal': return 'ปกติ';
            case 'excess': return 'สต็อกเกิน';
            default: return status;
        }
    };

    // Stats
    const critical = forecasts.filter(f => f.status === 'critical').length;
    const warning = forecasts.filter(f => f.status === 'warning').length;
    const avgConfidence = forecasts.length > 0
        ? Math.round(forecasts.reduce((sum, f) => sum + f.confidence, 0) / forecasts.length)
        : 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-purple-500" />
                    พยากรณ์ความต้องการสินค้า
                </h2>
                <p className="text-sm text-gray-500">วิเคราะห์จากข้อมูลการเบิกจ่ายย้อนหลัง 90 วัน</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border-l-4 border-red-500">
                    <p className="text-sm text-gray-500">ต้องสั่งซื้อด่วน</p>
                    <p className="text-2xl font-bold text-red-600">{critical}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border-l-4 border-yellow-500">
                    <p className="text-sm text-gray-500">ใกล้ถึงจุดสั่งซื้อ</p>
                    <p className="text-2xl font-bold text-yellow-600">{warning}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border-l-4 border-green-500">
                    <p className="text-sm text-gray-500">สินค้าทั้งหมด</p>
                    <p className="text-2xl font-bold text-green-600">{forecasts.length}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border-l-4 border-purple-500">
                    <p className="text-sm text-gray-500">ความแม่นยำเฉลี่ย</p>
                    <p className="text-2xl font-bold text-purple-600">{avgConfidence}%</p>
                </div>
            </div>

            {/* Forecast Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">สินค้า</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">คงเหลือ</th>
                            <th
                                className="px-4 py-3 text-right text-sm font-medium text-gray-600 cursor-pointer hover:text-blue-600"
                                onClick={() => handleSort('avgDailyUsage')}
                            >
                                <span className="flex items-center justify-end gap-1">
                                    ใช้/วัน
                                    {sortBy === 'avgDailyUsage' && (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                                </span>
                            </th>
                            <th
                                className="px-4 py-3 text-right text-sm font-medium text-gray-600 cursor-pointer hover:text-blue-600"
                                onClick={() => handleSort('daysOfStock')}
                            >
                                <span className="flex items-center justify-end gap-1">
                                    เหลือใช้
                                    {sortBy === 'daysOfStock' && (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                                </span>
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">ความต้องการ 30 วัน</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">แนวโน้ม</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">สถานะ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {sortedForecasts.map(forecast => (
                            <tr key={forecast.productId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <Package className="w-4 h-4 text-gray-400" />
                                        <div>
                                            <p className="font-medium">{forecast.productName}</p>
                                            <p className="text-xs text-gray-400">{forecast.productId}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right font-medium">{forecast.currentStock}</td>
                                <td className="px-4 py-3 text-right">{forecast.avgDailyUsage.toFixed(1)}</td>
                                <td className={`px-4 py-3 text-right font-medium ${forecast.daysOfStock <= 7 ? 'text-red-600' :
                                        forecast.daysOfStock <= 14 ? 'text-yellow-600' : ''
                                    }`}>
                                    {forecast.daysOfStock.toFixed(0)} วัน
                                </td>
                                <td className="px-4 py-3 text-right">{forecast.predictedDemand30Days}</td>
                                <td className="px-4 py-3 text-center">
                                    {forecast.trend === 'up' && <TrendingUp className="w-5 h-5 text-orange-500 mx-auto" />}
                                    {forecast.trend === 'down' && <TrendingDown className="w-5 h-5 text-blue-500 mx-auto" />}
                                    {forecast.trend === 'stable' && <span className="text-gray-400">—</span>}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(forecast.status)}`}>
                                        {forecast.status === 'critical' && <AlertTriangle className="w-3 h-3" />}
                                        {getStatusLabel(forecast.status)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div className="text-sm text-gray-500 flex flex-wrap gap-4">
                <span className="flex items-center gap-1"><TrendingUp className="w-4 h-4 text-orange-500" /> ความต้องการเพิ่มขึ้น</span>
                <span className="flex items-center gap-1"><TrendingDown className="w-4 h-4 text-blue-500" /> ความต้องการลดลง</span>
                <span>ความแม่นยำคำนวณจาก Moving Average</span>
            </div>
        </div>
    );
}
