import LineCustomersClient from './LineCustomersClient';

export const metadata = {
    title: 'LINE Customer Management | Stock Movement',
    description: 'Manage customer LINE registrations',
};

export default function LineCustomersPage() {
    return <LineCustomersClient />;
}
