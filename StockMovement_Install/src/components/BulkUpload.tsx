'use client';

import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, Check, AlertTriangle, Download, Loader2 } from 'lucide-react';

interface ImportRow {
    p_id: string;
    p_name: string;
    p_count: number;
    price_unit: number;
    category: string;
    unit: string;
    safety_stock: number;
    [key: string]: string | number;
}

interface ValidationResult {
    row: number;
    field: string;
    message: string;
    type: 'error' | 'warning';
}

export default function BulkUpload({ onImport }: { onImport: (data: ImportRow[]) => Promise<void> }) {
    const [file, setFile] = useState<File | null>(null);
    const [data, setData] = useState<ImportRow[]>([]);
    const [errors, setErrors] = useState<ValidationResult[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const parseCSV = (text: string): ImportRow[] => {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

        return lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const row: ImportRow = {
                p_id: '',
                p_name: '',
                p_count: 0,
                price_unit: 0,
                category: '',
                unit: '',
                safety_stock: 0
            };

            headers.forEach((header, idx) => {
                const value = values[idx] || '';
                if (['p_count', 'price_unit', 'safety_stock'].includes(header)) {
                    row[header] = parseFloat(value) || 0;
                } else {
                    row[header] = value;
                }
            });

            return row;
        });
    };

    const validateData = (rows: ImportRow[]): ValidationResult[] => {
        const results: ValidationResult[] = [];
        const ids = new Set<string>();

        rows.forEach((row, idx) => {
            const rowNum = idx + 2; // +2 for header row and 1-indexing

            // Required fields
            if (!row.p_id) {
                results.push({ row: rowNum, field: 'p_id', message: 'รหัสสินค้าจำเป็น', type: 'error' });
            } else if (ids.has(row.p_id)) {
                results.push({ row: rowNum, field: 'p_id', message: 'รหัสสินค้าซ้ำ', type: 'error' });
            } else {
                ids.add(row.p_id);
            }

            if (!row.p_name) {
                results.push({ row: rowNum, field: 'p_name', message: 'ชื่อสินค้าจำเป็น', type: 'error' });
            }

            // Numeric validations
            if (row.p_count < 0) {
                results.push({ row: rowNum, field: 'p_count', message: 'จำนวนต้องไม่ติดลบ', type: 'error' });
            }

            if (row.price_unit < 0) {
                results.push({ row: rowNum, field: 'price_unit', message: 'ราคาต้องไม่ติดลบ', type: 'error' });
            }

            // Warnings
            if (row.p_count === 0) {
                results.push({ row: rowNum, field: 'p_count', message: 'จำนวนเป็น 0', type: 'warning' });
            }
        });

        return results;
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setIsProcessing(true);

        try {
            const text = await selectedFile.text();
            const parsedData = parseCSV(text);
            const validationResults = validateData(parsedData);

            setData(parsedData);
            setErrors(validationResults);
            setStep('preview');
        } catch (error) {
            console.error('Error parsing file:', error);
            setErrors([{ row: 0, field: '', message: 'ไม่สามารถอ่านไฟล์ได้', type: 'error' }]);
        }

        setIsProcessing(false);
    };

    const handleImport = async () => {
        const criticalErrors = errors.filter(e => e.type === 'error');
        if (criticalErrors.length > 0) return;

        setStep('importing');

        try {
            await onImport(data);
            setStep('done');
        } catch (error) {
            setErrors([{ row: 0, field: '', message: 'เกิดข้อผิดพลาดในการนำเข้า', type: 'error' }]);
            setStep('preview');
        }
    };

    const downloadTemplate = () => {
        const template = `p_id,p_name,p_count,price_unit,category,unit,safety_stock
P001,สินค้าตัวอย่าง 1,100,150.00,อุปกรณ์,ชิ้น,10
P002,สินค้าตัวอย่าง 2,50,299.00,เครื่องเขียน,กล่อง,5`;

        const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'product_import_template.csv';
        a.click();
    };

    const reset = () => {
        setFile(null);
        setData([]);
        setErrors([]);
        setStep('upload');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const errorCount = errors.filter(e => e.type === 'error').length;
    const warningCount = errors.filter(e => e.type === 'warning').length;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-green-500" />
                นำเข้าสินค้าจากไฟล์
            </h2>

            {/* Step: Upload */}
            {step === 'upload' && (
                <div className="space-y-4">
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition"
                    >
                        <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
                            คลิกหรือลากไฟล์มาวางที่นี่
                        </p>
                        <p className="text-sm text-gray-400">รองรับไฟล์ CSV (สูงสุด 5MB)</p>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    <button
                        onClick={downloadTemplate}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                    >
                        <Download className="w-4 h-4" />
                        ดาวน์โหลดไฟล์ตัวอย่าง
                    </button>
                </div>
            )}

            {/* Step: Preview */}
            {step === 'preview' && (
                <div className="space-y-4">
                    {/* Summary */}
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex-1">
                            <p className="font-medium">{file?.name}</p>
                            <p className="text-sm text-gray-500">พบ {data.length} รายการ</p>
                        </div>
                        {errorCount > 0 && (
                            <div className="flex items-center gap-1 text-red-500">
                                <X className="w-4 h-4" />
                                <span>{errorCount} ข้อผิดพลาด</span>
                            </div>
                        )}
                        {warningCount > 0 && (
                            <div className="flex items-center gap-1 text-yellow-500">
                                <AlertTriangle className="w-4 h-4" />
                                <span>{warningCount} คำเตือน</span>
                            </div>
                        )}
                        {errors.length === 0 && (
                            <div className="flex items-center gap-1 text-green-500">
                                <Check className="w-4 h-4" />
                                <span>พร้อมนำเข้า</span>
                            </div>
                        )}
                    </div>

                    {/* Errors List */}
                    {errors.length > 0 && (
                        <div className="max-h-40 overflow-y-auto space-y-2">
                            {errors.slice(0, 10).map((err, idx) => (
                                <div
                                    key={idx}
                                    className={`flex items-center gap-2 p-2 rounded text-sm ${err.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
                                        }`}
                                >
                                    {err.type === 'error' ? <X className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                                    <span>แถว {err.row}: {err.message} ({err.field})</span>
                                </div>
                            ))}
                            {errors.length > 10 && (
                                <p className="text-sm text-gray-500">และอีก {errors.length - 10} รายการ...</p>
                            )}
                        </div>
                    )}

                    {/* Preview Table */}
                    <div className="overflow-x-auto max-h-60">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-3 py-2 text-left">รหัส</th>
                                    <th className="px-3 py-2 text-left">ชื่อ</th>
                                    <th className="px-3 py-2 text-right">จำนวน</th>
                                    <th className="px-3 py-2 text-right">ราคา</th>
                                    <th className="px-3 py-2 text-left">หมวดหมู่</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {data.slice(0, 10).map((row, idx) => (
                                    <tr key={idx}>
                                        <td className="px-3 py-2 font-medium">{row.p_id}</td>
                                        <td className="px-3 py-2">{row.p_name}</td>
                                        <td className="px-3 py-2 text-right">{row.p_count}</td>
                                        <td className="px-3 py-2 text-right">{row.price_unit.toLocaleString()}</td>
                                        <td className="px-3 py-2">{row.category}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                        <button onClick={reset} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={errorCount > 0}
                            className="flex items-center gap-2 px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50"
                        >
                            <Upload className="w-4 h-4" />
                            นำเข้า {data.length} รายการ
                        </button>
                    </div>
                </div>
            )}

            {/* Step: Importing */}
            {step === 'importing' && (
                <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 mx-auto animate-spin text-blue-500 mb-4" />
                    <p className="text-lg font-medium">กำลังนำเข้าข้อมูล...</p>
                    <p className="text-gray-500">{data.length} รายการ</p>
                </div>
            )}

            {/* Step: Done */}
            {step === 'done' && (
                <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <Check className="w-8 h-8 text-green-500" />
                    </div>
                    <p className="text-xl font-bold text-green-600 mb-2">นำเข้าสำเร็จ!</p>
                    <p className="text-gray-500 mb-6">เพิ่มสินค้า {data.length} รายการเรียบร้อย</p>
                    <button
                        onClick={reset}
                        className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                    >
                        นำเข้าเพิ่มเติม
                    </button>
                </div>
            )}
        </div>
    );
}
