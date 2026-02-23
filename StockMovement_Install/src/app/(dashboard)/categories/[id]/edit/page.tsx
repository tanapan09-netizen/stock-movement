import { prisma } from '@/lib/prisma';
import CategoryForm from '@/components/CategoryForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const category = await prisma.tbl_categories.findUnique({
        where: { cat_id: parseInt(id) }
    });

    if (!category) {
        notFound();
    }

    return (
        <div className="max-w-xl mx-auto">
            <Link href="/categories" className="flex items-center text-sm text-gray-500 mb-4 hover:text-gray-700">
                <ArrowLeft className="w-4 h-4 mr-1" /> กลับ
            </Link>
            <CategoryForm category={category} />
        </div>
    );
}
