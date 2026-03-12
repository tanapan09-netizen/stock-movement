import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Plus, Search, MapPin, Tag } from 'lucide-react';
import { auth } from '@/auth';
import AssetActions from '@/components/AssetActions';
import AssetImage from '@/components/AssetImage';

export default async function AssetsPage() {
    const session = await auth();

    // Check if user is admin from session role
    const isAdmin = (session?.user as any)?.role === 'admin';

    const assets = await prisma.tbl_assets.findMany({
        orderBy: { created_at: 'desc' }
    });

    const getImageUrl = (url: string | null) => {
        if (!url) return null;
        try {
            const parsed = JSON.parse(url);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
        } catch (e) { /* not JSON */ }
        if (url.startsWith('http') || url.startsWith('/uploads/')) return url;
        return `/uploads/${url}`;
    };

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">ทะเบียนทรัพย์สิน</h1>
                    <p className="text-sm text-gray-500">จัดการข้อมูลทรัพย์สินและค่าเสื่อมราคา</p>
                </div>
                <div className="flex items-center gap-3">
                    {isAdmin && (
                        <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
                            Admin Mode
                        </div>
                    )}
                    <Link
                        href="/assets/new"
                        className="flex items-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                    >
                        <Plus className="mr-2 h-4 w-4" /> เพิ่มทรัพย์สิน
                    </Link>
                </div>
            </div>

            <div className="rounded-lg bg-white shadow overflow-hidden">
                {/* Simple Search Placeholder */}
                <div className="border-b p-4">
                    <div className="max-w-md">
                        <input
                            type="text"
                            placeholder="ค้นหารหัส, ชื่อทรัพย์สิน..."
                            className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                            <tr>
                                <th className="px-6 py-3">รหัสทรัพย์สิน</th>
                                <th className="px-6 py-3">ชื่อรายการ</th>
                                <th className="px-6 py-3">หมวดหมู่</th>
                                <th className="px-6 py-3">สถานที่ตั้ง</th>
                                <th className="px-6 py-3 text-right">ราคาซื้อ</th>
                                <th className="px-6 py-3 text-center">สถานะ</th>
                                <th className="px-6 py-3 text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {assets.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">ไม่พบข้อมูลทรัพย์สิน</td>
                                </tr>
                            ) : (
                                assets.map((asset) => (
                                    <tr key={asset.asset_id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{asset.asset_code}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                {asset.image_url && (
                                                    <AssetImage 
                                                        src={getImageUrl(asset.image_url)!} 
                                                        className="h-8 w-8 rounded mr-2 object-cover" 
                                                        alt="" 
                                                        fallbackText="Asset"
                                                    />
                                                )}
                                                {asset.asset_name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                                                <Tag className="mr-1 h-3 w-3" /> {asset.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center text-gray-500">
                                                <MapPin className="mr-1 h-3 w-3" /> {asset.location || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {Number(asset.purchase_price).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${asset.status === 'Active' ? 'bg-green-100 text-green-800' :
                                                asset.status === 'Disposed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {asset.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Link href={`/assets/${asset.asset_id}`} className="text-blue-600 hover:text-blue-900 font-medium text-sm">
                                                    รายละเอียด
                                                </Link>
                                                {isAdmin && (
                                                    <AssetActions
                                                        asset={{
                                                            asset_id: asset.asset_id,
                                                            asset_code: asset.asset_code,
                                                            asset_name: asset.asset_name
                                                        }}
                                                        isAdmin={isAdmin}
                                                    />
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
