import StorageCleanupClient from './StorageCleanupClient';

export const metadata = {
    title: 'Storage Cleanup | Stock Movement',
    description: 'Scan and cleanup orphan files in uploads folder',
};

export default function StorageCleanupPage() {
    return <StorageCleanupClient />;
}
