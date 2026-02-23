import CategoryForm from '@/components/CategoryForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewCategoryPage() {
    return (
        <div className="max-w-xl mx-auto">
            <Link href="/categories" className="flex items-center text-sm text-gray-500 mb-4 hover:text-gray-700">
                <ArrowLeft className="w-4 h-4 mr-1" /> กลับ
            </Link>
            <CategoryForm />
        </div>
    );
}
