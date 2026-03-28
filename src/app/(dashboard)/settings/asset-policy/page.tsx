import AssetPolicyClient from './AssetPolicyClient';

export const metadata = {
    title: 'Asset Policy Settings | Stock Movement',
    description: 'Manage asset control policies, SLA, and alert thresholds',
};

export default function AssetPolicyPage() {
    return <AssetPolicyClient />;
}
