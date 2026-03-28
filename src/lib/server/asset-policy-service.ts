import { prisma } from '@/lib/prisma';
import { ASSET_POLICY_PREFIX, parseAssetPolicy, type AssetPolicy } from '@/lib/asset-policy';
import { isManagerRole } from '@/lib/roles';

type AssetPolicyAssetInput = {
    asset_code: string;
    serial_number?: string | null;
    status?: string | null;
    location?: string | null;
};

type DisposalPolicyInput = {
    actorRole?: string | null;
    actorName?: string | null;
    secondaryApprover?: string | null;
    reason?: string | null;
};

type TransferPolicyInput = {
    assetId?: number | null;
    approvalRef?: string | null;
    approvalStatus?: string | null;
    approvalRequestType?: string | null;
    approvalReferenceJob?: string | null;
    approvalApprovedAt?: Date | null;
};

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildAssetCodeFormatRegex(format: string) {
    const tokenRegex = /(\{YYYY\}|\{YY\}|\{0+\})/g;
    let pattern = '^';
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(format)) !== null) {
        const token = match[0];
        const rawChunk = format.slice(lastIndex, match.index);
        pattern += escapeRegExp(rawChunk);

        if (token === '{YYYY}') {
            pattern += '\\d{4}';
        } else if (token === '{YY}') {
            pattern += '\\d{2}';
        } else {
            const zeroCount = token.length - 2;
            pattern += `\\d{${zeroCount}}`;
        }

        lastIndex = match.index + token.length;
    }

    pattern += escapeRegExp(format.slice(lastIndex));
    pattern += '$';

    return new RegExp(pattern);
}

function isStatusInUseLike(status?: string | null) {
    const normalized = String(status || '').trim().toLowerCase();
    return normalized === 'active' || normalized === 'in_use' || normalized === 'in use';
}

function isDisposedLike(status?: string | null) {
    const normalized = String(status || '').trim().toLowerCase();
    return normalized === 'disposed' || normalized === 'retired';
}

export async function getAssetPolicyFromDb(): Promise<AssetPolicy> {
    const rows = await prisma.tbl_system_settings.findMany({
        where: {
            setting_key: {
                startsWith: ASSET_POLICY_PREFIX,
            },
        },
        select: {
            setting_key: true,
            setting_value: true,
        },
    });

    const values: Record<string, string> = {};
    for (const row of rows) {
        const key = row.setting_key.replace(ASSET_POLICY_PREFIX, '');
        values[key] = row.setting_value;
    }

    return parseAssetPolicy(values);
}

export function validateAssetInputByPolicy(
    policy: AssetPolicy,
    input: AssetPolicyAssetInput,
): { ok: true } | { ok: false; error: string } {
    const assetCode = (input.asset_code || '').trim();
    const serialNumber = (input.serial_number || '').trim();
    const location = (input.location || '').trim();
    const status = String(input.status || '').trim();

    if (!assetCode) {
        return { ok: false, error: 'Asset code is required' };
    }

    const codeRegex = buildAssetCodeFormatRegex(policy.asset_code_format);
    if (!codeRegex.test(assetCode)) {
        return {
            ok: false,
            error: `Asset code must match policy format: ${policy.asset_code_format}`,
        };
    }

    if (policy.require_serial && !serialNumber && !isDisposedLike(status)) {
        return { ok: false, error: 'Serial number is required by asset policy' };
    }

    // Custodian column does not exist in current schema; use location as a temporary control proxy.
    if (policy.require_custodian_on_in_use && isStatusInUseLike(status) && !location) {
        return { ok: false, error: 'Location is required for active assets by asset policy' };
    }

    return { ok: true };
}

export function validateDisposalByPolicy(
    policy: AssetPolicy,
    input: DisposalPolicyInput,
): { ok: true } | { ok: false; error: string } {
    const reason = (input.reason || '').trim();
    if (!reason) {
        return { ok: false, error: 'Disposal reason is required' };
    }

    if (!policy.disposal_requires_dual_approval) {
        return { ok: true };
    }

    if (!isManagerRole(input.actorRole)) {
        return { ok: false, error: 'Only manager/admin can dispose assets when dual approval policy is enabled' };
    }

    const secondaryApprover = (input.secondaryApprover || '').trim();
    if (!secondaryApprover) {
        return { ok: false, error: 'Secondary approver is required by disposal policy' };
    }

    if ((input.actorName || '').trim().toLowerCase() === secondaryApprover.toLowerCase()) {
        return { ok: false, error: 'Secondary approver must be different from the requester' };
    }

    return { ok: true };
}

export function validateTransferByPolicy(
    policy: AssetPolicy,
    input: TransferPolicyInput,
): { ok: true } | { ok: false; error: string } {
    if (!policy.transfer_requires_approval) {
        return { ok: true };
    }

    const approvalRef = (input.approvalRef || '').trim();
    if (!approvalRef) {
        return { ok: false, error: 'Transfer approval reference is required by asset policy' };
    }

    const approvalStatus = String(input.approvalStatus || '').trim().toLowerCase();
    if (approvalStatus !== 'approved') {
        return { ok: false, error: 'Transfer approval must be approved before moving asset' };
    }

    const approvalRequestType = String(input.approvalRequestType || '').trim().toLowerCase();
    if (approvalRequestType !== 'other') {
        return { ok: false, error: 'Transfer approval must use request type "other"' };
    }

    const expectedReferenceJob = input.assetId ? `ASSET-${input.assetId}` : '';
    const referenceJob = (input.approvalReferenceJob || '').trim();
    if (referenceJob && expectedReferenceJob && referenceJob !== expectedReferenceJob) {
        return { ok: false, error: `Transfer approval reference_job must be ${expectedReferenceJob}` };
    }

    if (!input.approvalApprovedAt) {
        return { ok: false, error: 'Transfer approval approval date is missing' };
    }

    const approvedAtMs = input.approvalApprovedAt.getTime();
    if (!Number.isFinite(approvedAtMs)) {
        return { ok: false, error: 'Transfer approval approval date is invalid' };
    }

    const maxAgeMs = policy.transfer_sla_hours * 60 * 60 * 1000;
    const ageMs = Date.now() - approvedAtMs;
    if (ageMs > maxAgeMs) {
        return {
            ok: false,
            error: `Transfer approval has expired (older than ${policy.transfer_sla_hours} hour(s))`,
        };
    }

    return { ok: true };
}
