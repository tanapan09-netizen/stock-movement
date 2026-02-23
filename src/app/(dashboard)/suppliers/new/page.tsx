import SupplierForm from '@/components/SupplierForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewSupplierPage() {
    return (
        <div className="max-w-2xl mx-auto">
            <Link href="/suppliers" className="flex items-center text-sm text-gray-500 mb-4 hover:text-gray-700">
                <ArrowLeft className="w-4 h-4 mr-1" /> กลับ
            </Link>
            <SupplierForm />
        </div>
    );
}
