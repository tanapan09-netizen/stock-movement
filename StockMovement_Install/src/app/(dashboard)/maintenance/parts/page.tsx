import PartsManagementClient from './PartsManagementClient';

export const metadata = {
    title: 'จัดการอะไหล่ซ่อม | Stock Movement',
    description: 'เบิก/คืนอะไหล่สำหรับงานซ่อม'
};

export default function PartsManagementPage() {
    return <PartsManagementClient />;
}
