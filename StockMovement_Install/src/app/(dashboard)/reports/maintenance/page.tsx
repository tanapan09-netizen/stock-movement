import MaintenanceReportClient from './MaintenanceReportClient';

export const metadata = {
    title: 'รายงานแจ้งซ่อม | Stock Movement',
    description: 'รายงานแจ้งซ่อมแยกตามห้อง'
};

export default function MaintenanceReportPage() {
    return <MaintenanceReportClient />;
}
