'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { canAccessDashboardPage } from '@/lib/rbac';
import { revalidatePath } from 'next/cache';
import { getUserPermissionContext } from '@/lib/server/permission-service';
import {
    ASSET_POLICY_KEYS,
    ASSET_POLICY_PREFIX,
    getAssetPolicyStorageKey,
    parseAssetPolicy,
    serializeAssetPolicy,
    validateAssetPolicyInput,
    type AssetPolicy,
    type AssetPolicyKey,
} from '@/lib/asset-policy';

const ASSET_POLICY_ROUTE = '/settings/asset-policy';

async function getAssetPolicyAuthContext() {
    const session = await auth();
    if (!session?.user) {
        return null;
    }

    const permissionContext = await getUserPermissionContext(session.user);

    return {
        session,
        ...permissionContext,
    };
}

function isAssetPolicyKey(value: string): value is AssetPolicyKey {
    return ASSET_POLICY_KEYS.includes(value as AssetPolicyKey);
}

export async function getAssetPolicySettings() {
    try {
        const authContext = await getAssetPolicyAuthContext();
        if (!authContext) {
            return { success: false, error: 'Unauthorized' };
        }

        const canRead = canAccessDashboardPage(
            authContext.role,
            authContext.permissions,
            ASSET_POLICY_ROUTE,
            { isApprover: authContext.isApprover, level: 'read' },
        );

        if (!canRead) {
            return { success: false, error: 'Unauthorized' };
        }

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

        const keyValuePairs: Partial<Record<AssetPolicyKey, string>> = {};
        for (const row of rows) {
            const policyKey = row.setting_key.replace(ASSET_POLICY_PREFIX, '');
            if (!isAssetPolicyKey(policyKey)) continue;
            keyValuePairs[policyKey] = row.setting_value;
        }

        const parsed = parseAssetPolicy(keyValuePairs);
        return { success: true, data: parsed };
    } catch (error) {
        console.error('Failed to load asset policy settings:', error);
        return { success: false, error: 'Failed to load asset policy settings' };
    }
}

export async function updateAssetPolicySettings(payload: AssetPolicy) {
    try {
        const authContext = await getAssetPolicyAuthContext();
        if (!authContext) {
            return { success: false, error: 'Unauthorized' };
        }

        const canEdit = canAccessDashboardPage(
            authContext.role,
            authContext.permissions,
            ASSET_POLICY_ROUTE,
            { isApprover: authContext.isApprover, level: 'edit' },
        );

        if (!canEdit) {
            return { success: false, error: 'Unauthorized' };
        }

        const parsed = validateAssetPolicyInput(payload);
        if (!parsed.success) {
            return {
                success: false,
                error: parsed.error.issues[0]?.message || 'Invalid asset policy values',
            };
        }

        const normalized = parsed.data;
        const serialized = serializeAssetPolicy(normalized);
        const storageKeys = ASSET_POLICY_KEYS.map(getAssetPolicyStorageKey);
        const now = new Date();

        const existing = await prisma.tbl_system_settings.findMany({
            where: { setting_key: { in: storageKeys } },
            select: { setting_key: true, setting_value: true },
        });

        const existingMap = new Map(existing.map((row) => [row.setting_key, row.setting_value]));
        const changedKeys = ASSET_POLICY_KEYS.filter((key) => {
            const storageKey = getAssetPolicyStorageKey(key);
            return existingMap.get(storageKey) !== serialized[key];
        });

        if (changedKeys.length === 0) {
            return { success: true, data: normalized };
        }

        await prisma.$transaction(
            ASSET_POLICY_KEYS.map((key) =>
                prisma.tbl_system_settings.upsert({
                    where: {
                        setting_key: getAssetPolicyStorageKey(key),
                    },
                    create: {
                        setting_key: getAssetPolicyStorageKey(key),
                        setting_value: serialized[key],
                        description: `Asset policy: ${key}`,
                        updated_at: now,
                    },
                    update: {
                        setting_value: serialized[key],
                        updated_at: now,
                    },
                }),
            ),
        );

        revalidatePath('/settings');
        revalidatePath('/settings/asset-policy');

        if (authContext.session.user) {
            const { logSystemAction } = await import('@/lib/logger');
            logSystemAction(
                'ASSET_POLICY_UPDATE',
                'Settings',
                'asset_policy',
                `Updated asset policy keys: ${changedKeys.join(', ')}`,
                authContext.session.user.id ? (parseInt(authContext.session.user.id as string, 10) || 0) : null,
                authContext.session.user.name || 'Unknown',
                'unknown',
            ).catch(console.error);
        }

        return { success: true, data: normalized };
    } catch (error) {
        console.error('Failed to update asset policy settings:', error);
        return { success: false, error: 'Failed to update asset policy settings' };
    }
}
