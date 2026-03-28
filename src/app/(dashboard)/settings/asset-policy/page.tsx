import AssetPolicyClient from './AssetPolicyClient';

export const metadata = {
    title: 'ตั้งค่านโยบายทรัพย์สิน | Stock Movement',
    description: 'จัดการนโยบายควบคุมทรัพย์สิน SLA และเกณฑ์การแจ้งเตือน',
};

export default function AssetPolicyPage() {
    return <AssetPolicyClient />;
}
