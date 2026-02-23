'use client';

import { useState, useMemo } from 'react';
import { Calculator, DollarSign, TrendingUp, Percent, Package, RefreshCw } from 'lucide-react';

interface ProductROI {
    name: string;
    purchasePrice: number;
    sellingPrice: number;
    quantity: number;
    holdingCost: number; // % per year
    turnoverDays: number;
}

export default function ROICalculator() {
    const [product, setProduct] = useState<ProductROI>({
        name: 'สินค้าตัวอย่าง',
        purchasePrice: 100,
        sellingPrice: 150,
        quantity: 100,
        holdingCost: 15,
        turnoverDays: 30
    });

    const calculations = useMemo(() => {
        const { purchasePrice, sellingPrice, quantity, holdingCost, turnoverDays } = product;

        // Basic calculations
        const investment = purchasePrice * quantity;
        const revenue = sellingPrice * quantity;
        const grossProfit = revenue - investment;
        const grossMargin = ((sellingPrice - purchasePrice) / purchasePrice) * 100;

        // Holding cost calculation (annualized)
        const dailyHoldingCost = (holdingCost / 100 / 365) * investment;
        const totalHoldingCost = dailyHoldingCost * turnoverDays;

        // Net profit after holding costs
        const netProfit = grossProfit - totalHoldingCost;

        // ROI calculations
        const roi = (netProfit / investment) * 100;
        const annualizedROI = roi * (365 / turnoverDays);

        // Inventory turnover
        const turnoverRate = 365 / turnoverDays;

        // Break-even analysis
        const breakEvenQuantity = Math.ceil(totalHoldingCost / (sellingPrice - purchasePrice));

        return {
            investment,
            revenue,
            grossProfit,
            grossMargin,
            totalHoldingCost,
            netProfit,
            roi,
            annualizedROI,
            turnoverRate,
            breakEvenQuantity
        };
    }, [product]);

    const updateField = (field: keyof ProductROI, value: number) => {
        setProduct(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-emerald-500" />
                    ROI Calculator
                </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
                {/* Input Section */}
                <div className="space-y-4">
                    <h3 className="font-medium text-gray-600 dark:text-gray-300">ข้อมูลสินค้า</h3>

                    <div>
                        <label className="block text-sm text-gray-600 mb-1">ชื่อสินค้า</label>
                        <input
                            type="text"
                            value={product.name}
                            onChange={(e) => setProduct(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full p-2 border rounded-lg"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1 flex items-center gap-1">
                                <DollarSign className="w-3 h-3" /> ราคาซื้อ/หน่วย
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={product.purchasePrice}
                                onChange={(e) => updateField('purchasePrice', parseFloat(e.target.value) || 0)}
                                className="w-full p-2 border rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1 flex items-center gap-1">
                                <DollarSign className="w-3 h-3" /> ราคาขาย/หน่วย
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={product.sellingPrice}
                                onChange={(e) => updateField('sellingPrice', parseFloat(e.target.value) || 0)}
                                className="w-full p-2 border rounded-lg"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-600 mb-1 flex items-center gap-1">
                            <Package className="w-3 h-3" /> จำนวน
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={product.quantity}
                            onChange={(e) => updateField('quantity', parseInt(e.target.value) || 1)}
                            className="w-full p-2 border rounded-lg"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1 flex items-center gap-1">
                                <Percent className="w-3 h-3" /> ต้นทุนเก็บรักษา (%/ปี)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={product.holdingCost}
                                onChange={(e) => updateField('holdingCost', parseFloat(e.target.value) || 0)}
                                className="w-full p-2 border rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1 flex items-center gap-1">
                                <RefreshCw className="w-3 h-3" /> รอบหมุนเวียน (วัน)
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={product.turnoverDays}
                                onChange={(e) => updateField('turnoverDays', parseInt(e.target.value) || 1)}
                                className="w-full p-2 border rounded-lg"
                            />
                        </div>
                    </div>
                </div>

                {/* Results Section */}
                <div className="space-y-4">
                    <h3 className="font-medium text-gray-600 dark:text-gray-300">ผลการคำนวณ</h3>

                    {/* ROI Highlight */}
                    <div className="p-6 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl text-white">
                        <p className="text-sm opacity-80">ROI (ต่อรอบ)</p>
                        <p className="text-4xl font-bold">{calculations.roi.toFixed(2)}%</p>
                        <p className="text-sm opacity-80 mt-2">
                            ROI ต่อปี: <span className="font-bold">{calculations.annualizedROI.toFixed(2)}%</span>
                        </p>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <p className="text-xs text-gray-500">เงินลงทุน</p>
                            <p className="text-lg font-bold text-gray-800 dark:text-white">
                                ฿{calculations.investment.toLocaleString()}
                            </p>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <p className="text-xs text-gray-500">รายได้</p>
                            <p className="text-lg font-bold text-gray-800 dark:text-white">
                                ฿{calculations.revenue.toLocaleString()}
                            </p>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                            <p className="text-xs text-green-600">กำไรขั้นต้น</p>
                            <p className="text-lg font-bold text-green-700">
                                ฿{calculations.grossProfit.toLocaleString()}
                            </p>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                            <p className="text-xs text-green-600">Margin</p>
                            <p className="text-lg font-bold text-green-700">
                                {calculations.grossMargin.toFixed(1)}%
                            </p>
                        </div>
                        <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg">
                            <p className="text-xs text-red-600">ต้นทุนเก็บรักษา</p>
                            <p className="text-lg font-bold text-red-700">
                                ฿{calculations.totalHoldingCost.toFixed(2)}
                            </p>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                            <p className="text-xs text-blue-600">กำไรสุทธิ</p>
                            <p className="text-lg font-bold text-blue-700">
                                ฿{calculations.netProfit.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {/* Additional Metrics */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">รอบหมุนเวียน/ปี</span>
                            <span className="font-medium">{calculations.turnoverRate.toFixed(1)} รอบ</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">จุดคุ้มทุน (ต้นทุนเก็บรักษา)</span>
                            <span className="font-medium">{calculations.breakEvenQuantity} ชิ้น</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
