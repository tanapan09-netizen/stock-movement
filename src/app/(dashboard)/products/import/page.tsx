import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import ImportClient from './ImportClient';

export default async function ImportPage() {
    let session = null;
    try {
        session = await auth();
    } catch (error) {
        const digest = typeof error === 'object' && error !== null && 'digest' in error
            ? String((error as { digest?: unknown }).digest ?? '')
            : '';
        if (
            digest === 'DYNAMIC_SERVER_USAGE' ||
            digest === 'NEXT_REDIRECT' ||
            digest === 'NEXT_NOT_FOUND'
        ) {
            throw error;
        }

        console.error('Import page auth error:', error);
        redirect('/products');
    }

    const userRole = (session?.user as { role?: string })?.role || 'employee';

    if (userRole !== 'admin') {
        redirect('/products');
    }

    return <ImportClient />;
}
