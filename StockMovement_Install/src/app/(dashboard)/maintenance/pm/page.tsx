import PmClient from './PmClient';

export const metadata = {
    title: 'แผนบำรุงรักษา (PM) | Stock Movement',
    description: 'จัดการแผนการบำรุงรักษาเชิงป้องกัน'
};

export default function PmPage() {
    return <PmClient />;
}
