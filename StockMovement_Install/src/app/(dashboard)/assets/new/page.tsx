import AssetForm from '@/components/AssetForm';

export default function NewAssetPage() {
    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">ลงทะเบียนทรัพย์สินใหม่</h1>
            <AssetForm />
        </div>
    );
}
