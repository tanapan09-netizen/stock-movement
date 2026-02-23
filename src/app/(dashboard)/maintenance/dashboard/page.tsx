import MaintenanceDashboardClient from './MaintenanceDashboardClient';

export const metadata = {
    title: 'Dashboard แจ้งซ่อม | Stock Movement',
    description: 'ภาพรวมและจัดการงานซ่อม'
};

export default function MaintenanceDashboardPage() {
    return <MaintenanceDashboardClient />;
}
