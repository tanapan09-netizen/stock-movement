import AssetPolicyClient from './AssetPolicyClient';

export const metadata = {
    title: 'ตั้งค่าหมวดหมู่สินทรัพย์ | Stock Movement',
    description: 'จัดการหมวดหมู่สินทรัพย์ที่ใช้ในทะเบียนทรัพย์สินและฟอร์มเพิ่มทรัพย์สิน',
};

export default function AssetPolicyPage() {
    return <AssetPolicyClient />;
}
