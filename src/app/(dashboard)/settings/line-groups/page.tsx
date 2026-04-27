import LineGroupsClient from './LineGroupsClient';

export const metadata = {
    title: 'LINE Group Notifications | Stock Movement',
    description: 'Manage LINE group targets, webhook-discovered groups, and notification fallback settings.',
};

export default function LineGroupsPage() {
    return <LineGroupsClient />;
}
