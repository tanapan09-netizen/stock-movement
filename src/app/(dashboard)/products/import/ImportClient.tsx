'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { importProducts, checkDuplicateProducts } from '@/actions/importActions';
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function ImportClient() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [duplicates, setDuplicates] = useState<{ p_id: string; p_name: string; conflict: string }[]>([]);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
            setDuplicates([]);
            setShowConfirm(false);
        }
    };

    const processImport = async () => {
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await importProducts(formData);
            setResult(res);
            setDuplicates([]); // Clear duplicates on final success/fail
            setShowConfirm(false);
            if (res.success) {
                // Optional: redirect after delay or just show success
                setTimeout(() => {
                    // router.push('/products');
                }, 2000);
            }
        } catch (error) {
            setResult({ success: false, error: 'Upload failed' });
        } finally {
            setIsUploading(false);
        }
    };

    const handleCheckAndUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            // Step 1: Check for duplicates
            const checkRes = await checkDuplicateProducts(formData);

            if (checkRes.success && checkRes.duplicates && checkRes.duplicates.length > 0) {
                // Found duplicates, show confirmation
                setDuplicates(checkRes.duplicates);
                setShowConfirm(true);
                setIsUploading(false); // Stop loader to show modal
            } else if (checkRes.success) {
                // No duplicates, proceed directly
                await processImport();
            } else {
                // Check failed
                setResult({ success: false, error: checkRes.error || 'Check failed' });
                setIsUploading(false);
            }
        } catch (error) {
            setResult({ success: false, error: 'Check failed' });
            setIsUploading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto relative">
            <div className="mb-6 flex items-center">
                <Link href="/products" className="mr-4 p-2 rounded-full hover:bg-gray-100">
                    <ArrowLeft className="w-6 h-6 text-gray-600" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-800">นำเข้าสินค้าจาก Excel</h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-8">
                <div className="mb-8">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <FileSpreadsheet className="mr-2 text-green-600" /> คำแนะนำการเตรียมไฟล์
                    </h2>
                    <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 space-y-2">
                        <p>ไฟล์ Excel (.xlsx) ควรมีหัวข้อคอลัมน์ดังนี้ (รองรับทั้งไทยและอังกฤษ):</p>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                            <li><strong>รหัสสินค้า</strong> (Code, Product Code) <span className="text-red-500">*จำเป็น</span></li>
                            <li><strong>ชื่อสินค้า</strong> (Name, Product Name) <span className="text-red-500">*จำเป็น</span></li>
                            <li><strong>หมวดหมู่</strong> (Category, Main Category)</li>
                            <li><strong>ราคาขาย</strong> (Price, Price/Unit)</li>
                            <li><strong>จำนวนคงเหลือ</strong> (Stock, Qty, Amount)</li>
                            <li><strong>จุดสั่งซื้อ</strong> (Safety Stock, Safety)</li>
                        </ul>
                    </div>
                </div>

                <div className="mb-8">
                    <label className="block w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition cursor-pointer">
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <div className="flex flex-col items-center justify-center">
                            <Upload className={`w-12 h-12 mb-3 ${file ? 'text-blue-600' : 'text-gray-400'}`} />
                            <span className="text-lg font-medium text-gray-700">
                                {file ? file.name : 'คลิกเพื่อเลือกไฟล์ Excel'}
                            </span>
                            <span className="text-sm text-gray-500 mt-1">
                                {file ? `${(file.size / 1024).toFixed(2)} KB` : 'รองรับไฟล์ .xlsx หรือ .xls'}
                            </span>
                        </div>
                    </label>
                </div>

                {result && result.success && (
                    <div className="mb-6 bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg flex items-start">
                        <CheckCircle className="w-5 h-5 mr-3 mt-0.5" />
                        <div>
                            <p className="font-bold">นำเข้าสำเร็จ!</p>
                            <p>เพิ่ม/อัปเดตสินค้าจำนวน {result.count} รายการ</p>
                            {result.errors && result.errors.length > 0 && (
                                <div className="mt-2 text-sm text-yellow-700">
                                    <p className="font-semibold">ข้อผิดพลาดบางส่วน:</p>
                                    <ul className="list-disc list-inside">
                                        {result.errors.slice(0, 5).map((e: string, i: number) => (
                                            <li key={i}>{e}</li>
                                        ))}
                                        {result.errors.length > 5 && <li>...และอีก {result.errors.length - 5} รายการ</li>}
                                    </ul>
                                </div>
                            )}
                            <div className="mt-4">
                                <Link href="/products" className="text-sm font-semibold underline hover:text-green-800">
                                    กลับไปหน้ารายการสินค้า
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {result && !result.success && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center">
                        <AlertCircle className="w-5 h-5 mr-3" />
                        <div>
                            <p className="font-bold">เกิดข้อผิดพลาด</p>
                            <p>{result.error}</p>
                        </div>
                    </div>
                )}

                <button
                    onClick={handleCheckAndUpload}
                    disabled={!file || isUploading}
                    className={`w-full py-3 px-4 rounded-lg font-bold text-white transition
                        ${!file || isUploading
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
                        }`}
                >
                    {isUploading ? 'กำลังประมวลผล...' : 'เริ่มนำเข้าข้อมูล'}
                </button>
            </div>

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-4 mb-4 text-yellow-600">
                            <div className="bg-yellow-100 p-3 rounded-full">
                                <AlertTriangle className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">ยืนยันการนำเข้าข้อมูล</h3>
                                <p className="text-sm text-yellow-800">พบสินค้าที่มีอยู่ในระบบแล้ว {duplicates.length} รายการ</p>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 mb-6 max-h-48 overflow-y-auto border">
                            <p className="text-xs text-gray-500 mb-2 font-medium">ตัวอย่างสินค้าที่ซ้ำ:</p>
                            <ul className="space-y-2 text-sm">
                                {duplicates.map((d, i) => (
                                    <li key={i} className="flex justify-between items-center text-gray-700 border-b pb-1 last:border-0 last:pb-0">
                                        <span>{d.conflict}: {d.p_name}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <p className="text-gray-600 text-sm mb-6">
                            หากกดยืนยัน ข้อมูลสินค้าเหล่านี้จะถูก <b>อัปเดตทับ (Overwrite)</b> ด้วยข้อมูลใหม่จากไฟล์ Excel
                        </p>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={processImport}
                                disabled={isUploading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow"
                            >
                                {isUploading ? 'กำลังทำงาน...' : 'ยืนยันและนำเข้า'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
