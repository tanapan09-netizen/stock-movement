import { prisma } from '@/lib/prisma';
import { createTextMessage, sendPushMessage } from './lineMessaging';
import { sendLineNotification } from './lineNotify';

const LINE_GROUP_SETTING_KEYS = [
    'line_group_notifications_enabled',
    'line_group_target_ids',
    'line_group_notify_enabled',
    'line_group_notify_token',
    'line_group_registry_json',
] as const;

export type LineGroupRegistryEntry = {
    id: string;
    name: string | null;
    sourceType: 'group' | 'room';
    lastEventAt: string;
};

export type LineGroupNotificationConfig = {
    enabled: boolean;
    targetIds: string[];
    notifyEnabled: boolean;
    notifyToken: string;
    discoveredGroups: LineGroupRegistryEntry[];
};

function parseBoolean(value: string | undefined, fallback = false) {
    if (typeof value !== 'string') return fallback;

    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    return fallback;
}

function parseTargetIds(rawValue: string | undefined) {
    if (!rawValue) return [] as string[];

    return Array.from(
        new Set(
            rawValue
                .split(/[\n,]+/)
                .map((value) => value.trim())
                .filter((value) => value.length > 0),
        ),
    );
}

export function parseLineGroupRegistry(rawValue: string | undefined): LineGroupRegistryEntry[] {
    if (!rawValue || rawValue.trim() === '') return [];

    try {
        const parsed = JSON.parse(rawValue) as Array<Partial<LineGroupRegistryEntry>>;
        if (!Array.isArray(parsed)) return [];

        return parsed
            .map((entry) => ({
                id: String(entry.id || '').trim(),
                name: entry.name ? String(entry.name) : null,
                sourceType: (entry.sourceType === 'room' ? 'room' : 'group') as 'group' | 'room',
                lastEventAt: String(entry.lastEventAt || new Date(0).toISOString()),
            }))
            .filter((entry) => entry.id.length > 0);
    } catch (error) {
        console.error('[LINE Group] Failed to parse registry JSON:', error);
        return [];
    }
}

function serializeLineGroupRegistry(entries: LineGroupRegistryEntry[]) {
    return JSON.stringify(
        entries.map((entry) => ({
            id: entry.id,
            name: entry.name,
            sourceType: entry.sourceType,
            lastEventAt: entry.lastEventAt,
        })),
    );
}

export async function getLineGroupNotificationConfig(): Promise<LineGroupNotificationConfig> {
    const rows = await prisma.tbl_system_settings.findMany({
        where: {
            setting_key: {
                in: [...LINE_GROUP_SETTING_KEYS],
            },
        },
        select: {
            setting_key: true,
            setting_value: true,
        },
    });

    const map = rows.reduce<Record<string, string>>((acc, row) => {
        acc[row.setting_key] = row.setting_value;
        return acc;
    }, {});

    return {
        enabled: parseBoolean(map.line_group_notifications_enabled, false),
        targetIds: parseTargetIds(map.line_group_target_ids),
        notifyEnabled: parseBoolean(map.line_group_notify_enabled, false),
        notifyToken: (map.line_group_notify_token || '').trim(),
        discoveredGroups: parseLineGroupRegistry(map.line_group_registry_json),
    };
}

export async function sendConfiguredLineGroupTextNotification(text: string) {
    const config = await getLineGroupNotificationConfig();
    const results = {
        success: false,
        skipped: false,
        pushTargets: 0,
        pushSuccess: 0,
        notifyUsed: false,
        notifySuccess: false,
        errorMessages: [] as string[],
    };

    if (!config.enabled) {
        return {
            ...results,
            skipped: true,
            errorMessages: ['LINE group notifications disabled'],
        };
    }

    for (const targetId of config.targetIds) {
        const result = await sendPushMessage(targetId, createTextMessage(text));
        results.pushTargets += 1;
        if (result.success) {
            results.pushSuccess += 1;
        } else if (result.error) {
            results.errorMessages.push(`${targetId}: ${result.error}`);
        }
    }

    if (config.notifyEnabled && config.notifyToken) {
        results.notifyUsed = true;
        const notifyResult = await sendLineNotification(text, config.notifyToken);
        results.notifySuccess = notifyResult.success;
        if (!notifyResult.success && notifyResult.error) {
            results.errorMessages.push(`LINE Notify: ${notifyResult.error}`);
        }
    }

    results.success = results.pushSuccess > 0 || results.notifySuccess;
    return results;
}

export async function registerLineGroupSource(source: {
    id: string;
    sourceType: 'group' | 'room';
    name?: string | null;
}) {
    const normalizedId = source.id.trim();
    if (normalizedId.length === 0) return;

    const existing = await prisma.tbl_system_settings.findUnique({
        where: {
            setting_key: 'line_group_registry_json',
        },
        select: {
            setting_value: true,
        },
    });

    const currentEntries = parseLineGroupRegistry(existing?.setting_value);
    const nextEntries = currentEntries.filter((entry) => entry.id !== normalizedId);

    nextEntries.unshift({
        id: normalizedId,
        name: source.name?.trim() || null,
        sourceType: source.sourceType,
        lastEventAt: new Date().toISOString(),
    });

    await prisma.tbl_system_settings.upsert({
        where: {
            setting_key: 'line_group_registry_json',
        },
        update: {
            setting_value: serializeLineGroupRegistry(nextEntries.slice(0, 50)),
            updated_at: new Date(),
        },
        create: {
            setting_key: 'line_group_registry_json',
            setting_value: serializeLineGroupRegistry(nextEntries.slice(0, 50)),
            description: 'Auto-discovered LINE group/room IDs from webhook events',
        },
    });
}
