
import LineUserClient from './LineUserClient';

export const metadata = {
    title: 'LINE User Management | Stock Movement',
    description: 'Manage LINE users and notification approvers',
};

export default function LineUsersPage() {
    return <LineUserClient />;
}
