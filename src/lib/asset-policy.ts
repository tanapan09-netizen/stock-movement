import { z } from 'zod';

export const ASSET_POLICY_PREFIX = 'asset_policy.';

export const assetPolicySchema = z.object({
    asset_code_format: z.string().trim().min(3).max(120),
    require_serial: z.boolean(),
    require_custodian_on_in_use: z.boolean(),
    transfer_requires_approval: z.boolean(),
    disposal_requires_dual_approval: z.boolean(),
    approval_sla_hours: z.number().int().min(1).max(720),
    transfer_sla_hours: z.number().int().min(1).max(720),
    repair_sla_critical_hours: z.number().int().min(1).max(720),
    repair_sla_normal_hours: z.number().int().min(1).max(720),
    scrap_rate_threshold_pct: z.number().min(0).max(100),
    repair_frequency_threshold: z.number().int().min(1).max(365),
    warranty_expiry_alert_days: z.number().int().min(1).max(3650),
    stocktake_accuracy_min_pct: z.number().min(0).max(100),
});

export type AssetPolicy = z.infer<typeof assetPolicySchema>;
export type AssetPolicyKey = keyof AssetPolicy;

export const ASSET_POLICY_DEFAULTS: AssetPolicy = {
    asset_code_format: 'AST-{YYYY}-{00000}',
    require_serial: false,
    require_custodian_on_in_use: true,
    transfer_requires_approval: true,
    disposal_requires_dual_approval: true,
    approval_sla_hours: 24,
    transfer_sla_hours: 24,
    repair_sla_critical_hours: 4,
    repair_sla_normal_hours: 48,
    scrap_rate_threshold_pct: 5,
    repair_frequency_threshold: 3,
    warranty_expiry_alert_days: 30,
    stocktake_accuracy_min_pct: 95,
};

export const ASSET_POLICY_KEYS = Object.keys(ASSET_POLICY_DEFAULTS) as AssetPolicyKey[];

const BOOLEAN_POLICY_KEYS: AssetPolicyKey[] = [
    'require_serial',
    'require_custodian_on_in_use',
    'transfer_requires_approval',
    'disposal_requires_dual_approval',
];

const NUMBER_POLICY_KEYS: AssetPolicyKey[] = [
    'approval_sla_hours',
    'transfer_sla_hours',
    'repair_sla_critical_hours',
    'repair_sla_normal_hours',
    'scrap_rate_threshold_pct',
    'repair_frequency_threshold',
    'warranty_expiry_alert_days',
    'stocktake_accuracy_min_pct',
];

const isBooleanKey = (key: AssetPolicyKey) => BOOLEAN_POLICY_KEYS.includes(key);
const isNumberKey = (key: AssetPolicyKey) => NUMBER_POLICY_KEYS.includes(key);

export function getAssetPolicyStorageKey(key: AssetPolicyKey) {
    return `${ASSET_POLICY_PREFIX}${key}`;
}

export function parseAssetPolicy(
    values: Partial<Record<AssetPolicyKey, string | null | undefined>>,
): AssetPolicy {
    const parsed: Record<AssetPolicyKey, unknown> = { ...ASSET_POLICY_DEFAULTS };

    for (const key of ASSET_POLICY_KEYS) {
        const raw = values[key];
        if (raw == null) continue;

        if (isBooleanKey(key)) {
            parsed[key] = String(raw).toLowerCase() === 'true';
            continue;
        }

        if (isNumberKey(key)) {
            const numberValue = Number(raw);
            if (Number.isFinite(numberValue)) {
                parsed[key] = numberValue;
            }
            continue;
        }

        parsed[key] = String(raw);
    }

    const validated = assetPolicySchema.safeParse(parsed);
    return validated.success ? validated.data : { ...ASSET_POLICY_DEFAULTS };
}

export function serializeAssetPolicy(policy: AssetPolicy): Record<AssetPolicyKey, string> {
    const output = {} as Record<AssetPolicyKey, string>;

    for (const key of ASSET_POLICY_KEYS) {
        const value = policy[key];
        if (typeof value === 'boolean') {
            output[key] = value ? 'true' : 'false';
            continue;
        }

        output[key] = String(value);
    }

    return output;
}

export function validateAssetPolicyInput(input: unknown) {
    return assetPolicySchema.safeParse(input);
}
