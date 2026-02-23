'use client';

import { useState, useEffect } from 'react';
import { Truck, Star, Clock, Package, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface SupplierMetrics {
    id: number;
    name: string;
    totalOrders: number;
    onTimeDelivery: number;
    qualityScore: number;
    avgDeliveryDays: number;
    lastOrderDate: Date;
    totalValue: number;
    trend: 'up' | 'down' | 'stable';
}

export default function SupplierPerformance() {
    const [suppliers, setSuppliers] = useState<SupplierMetrics[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<'qualityScore' | 'onTimeDelivery' | 'totalValue'>('qualityScore');

    useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                const res = await fetch('/api/suppliers/performance');
                if (res.ok) {
                    const data = await res.json();
                    setSuppliers(data);
                }
            } catch {
                // Mock data
                setSuppliers([
                    { id: 1, name: 'บริษัท ABC จำกัด', totalOrders: 45, onTimeDelivery: 95, qualityScore: 4.8, avgDeliveryDays: 3, lastOrderDate: new Date(Date.now() - 86400000 * 5), totalValue: 250000, trend: 'up' },
                    { id: 2, name: 'ร้านค้า XYZ', totalOrders: 32, onTimeDelivery: 88, qualityScore: 4.2, avgDeliveryDays: 5, lastOrderDate: new Date(Date.now() - 86400000 * 10), totalValue: 180000, trend: 'stable' },
                    { id: 3, name: 'ห้างหุ้นส่วน QRS', totalOrders: 28, onTimeDelivery: 72, qualityScore: 3.5, avgDeliveryDays: 7, lastOrderDate: new Date(Date.now() - 86400000 * 20), totalValue: 95000, trend: 'down' },
                    { id: 4, name: 'บริษัท DEF จำกัด', totalOrders: 50, onTimeDelivery: 92, qualityScore: 4.5, avgDeliveryDays: 4, lastOrderDate: new Date(Date.now() - 86400000 * 3), totalValue: 320000, trend: 'up' },
                ]);
            }
            setLoading(false);
        };

        fetchSuppliers();
    }, []);

    const sortedSuppliers = [...suppliers].sort((a, b) => b[sortBy] - a[sortBy]);

    const renderStars = (score: number) => {
        const fullStars = Math.floor(score);
        const hasHalf = score % 1 >= 0.5;

        return (
            <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                    <Star
                        key={i}
                        className={`w-4 h-4 ${i < fullStars
                                ? 'text-yellow-400 fill-current'
                                : i === fullStars && hasHalf
                                    ? 'text-yellow-400 fill-current opacity-50'
                                    : 'text-gray-300'
                            }`}
                    />
                ))}
                <span className="ml-1 text-sm font-medium">{score.toFixed(1)}</span>
            </div>
        );
    };

    const getDeliveryColor = (rate: number) => {
        if (rate >= 90) return 'text-green-600 bg-green-100';
        if (rate >= 75) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    if (loading) {
        return (
            <div className="animate-pulse space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-gray-100 rounded-lg" />
                ))}
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <Truck className="w-5 h-5 text-blue-500" />
                    ประสิทธิภาพผู้ขาย
                </h2>
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="px-3 py-1 text-sm border rounded-lg"
                    title="เรียงตาม"
                >
                    <option value="qualityScore">คะแนนคุณภาพ</option>
                    <option value="onTimeDelivery">ส่งตรงเวลา</option>
                    <option value="totalValue">มูลค่ารวม</option>
                </select>
            </div>

            {/* Supplier Cards */}
            <div className="divide-y dark:divide-gray-700">
                {sortedSuppliers.map((supplier, idx) => (
                    <div key={supplier.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                        <div className="flex items-start gap-4">
                            {/* Rank */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                                    idx === 1 ? 'bg-gray-100 text-gray-700' :
                                        idx === 2 ? 'bg-orange-100 text-orange-700' :
                                            'bg-gray-50 text-gray-500'
                                }`}>
                                {idx + 1}
                            </div>

                            {/* Main Info */}
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className="font-bold">{supplier.name}</h3>
                                    {supplier.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                                    {supplier.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                                </div>

                                {/* Stars */}
                                {renderStars(supplier.qualityScore)}

                                {/* Metrics Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                                    <div>
                                        <p className="text-xs text-gray-500">ส่งตรงเวลา</p>
                                        <p className={`font-bold ${getDeliveryColor(supplier.onTimeDelivery)} px-2 py-0.5 rounded inline-block`}>
                                            {supplier.onTimeDelivery}%
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">เวลาส่งเฉลี่ย</p>
                                        <p className="font-bold flex items-center gap-1">
                                            <Clock className="w-4 h-4 text-gray-400" />
                                            {supplier.avgDeliveryDays} วัน
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">คำสั่งซื้อ</p>
                                        <p className="font-bold flex items-center gap-1">
                                            <Package className="w-4 h-4 text-gray-400" />
                                            {supplier.totalOrders}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">มูลค่ารวม</p>
                                        <p className="font-bold text-green-600">
                                            ฿{supplier.totalValue.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Warning for low performance */}
                            {supplier.qualityScore < 3.5 && (
                                <div className="flex items-center gap-1 text-orange-500">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="px-4 py-3 border-t dark:border-gray-700 text-xs text-gray-500 flex flex-wrap gap-4">
                <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-green-500" /> มีแนวโน้มดีขึ้น</span>
                <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3 text-red-500" /> มีแนวโน้มลดลง</span>
                <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-orange-500" /> ต้องพิจารณา</span>
            </div>
        </div>
    );
}
