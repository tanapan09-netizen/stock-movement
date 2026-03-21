import { prisma } from '@/lib/prisma';
import POForm from '@/components/POForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function NewPOPage() {
    const session = await auth();
    const role = ((session?.user as { role?: string })?.role || '').toLowerCase();
    if (role !== 'purchasing') {
        redirect('/purchase-orders');
    }

    const [products, suppliers] = await Promise.all([
        prisma.tbl_products.findMany({ select: { p_id: true, p_name: true, price_unit: true }, where: { active: true } }),
        prisma.tbl_suppliers.findMany({ select: { id: true, name: true } })
    ]);

    // Convert Decimal to number for client component
    const productsSerialized = products.map(p => ({
        ...p,
        price_unit: p.price_unit ? Number(p.price_unit) : 0
    }));

    return (
        <div className="max-w-6xl mx-auto py-6">
            <Link href="/purchase-orders" className="flex items-center text-sm text-gray-500 mb-4 hover:text-gray-700">
                <ArrowLeft className="w-4 h-4 mr-1" /> กลับ
            </Link>
            <h1 className="text-2xl font-bold text-gray-800 mb-6">สร้างใบสั่งซื้อ (PO)</h1>
            <POForm products={productsSerialized} suppliers={suppliers} />
        </div>
    );
}
