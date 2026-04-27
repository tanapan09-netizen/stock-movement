import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendMulticastMessage } from '@/lib/notifications/lineMessaging';
import { sendConfiguredLineGroupTextNotification } from '@/lib/notifications/lineGroup';
import { getSummaryLineIdsByRoles } from '@/actions/lineUserActions';

export const dynamic = 'force-dynamic';

type ManagerSummaryTopic = 'maintenance_pending' | 'part_requests_pending' | 'low_stock';

const TH_TIME_ZONE = 'Asia/Bangkok';
const DEFAULT_MANAGER_SUMMARY_TOPICS: ManagerSummaryTopic[] = [
    'maintenance_pending',
    'part_requests_pending',
    'low_stock',
];
const DEFAULT_MANAGER_SUMMARY_TIME = '09:00';
const DEFAULT_MANAGER_SUMMARY_ROLES = ['manager'];
const MANAGER_SUMMARY_TOPIC_SET = new Set<ManagerSummaryTopic>(DEFAULT_MANAGER_SUMMARY_TOPICS);

function parseBooleanSetting(value: string | undefined, fallback: boolean) {
    if (typeof value !== 'string') return fallback;

    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    return fallback;
}

function parseManagerSummaryTopics(rawValue: string | undefined): ManagerSummaryTopic[] {
    if (typeof rawValue !== 'string' || rawValue.trim() === '') {
        return [...DEFAULT_MANAGER_SUMMARY_TOPICS];
    }

    const topics = rawValue
        .split(',')
        .map((value) => value.trim())
        .filter((value): value is ManagerSummaryTopic => MANAGER_SUMMARY_TOPIC_SET.has(value as ManagerSummaryTopic));

    return Array.from(new Set(topics));
}

function parseManagerSummaryRoles(rawValue: string | undefined): string[] {
    if (typeof rawValue !== 'string' || rawValue.trim() === '') {
        return [...DEFAULT_MANAGER_SUMMARY_ROLES];
    }

    const roles = rawValue
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0);

    const deduped = Array.from(new Set(roles));
    return deduped.length > 0 ? deduped : [...DEFAULT_MANAGER_SUMMARY_ROLES];
}

function parseManagerSummaryTime(rawValue: string | undefined) {
    const fallback = {
        hour: 9,
        minute: 0,
        label: DEFAULT_MANAGER_SUMMARY_TIME,
    };

    if (typeof rawValue !== 'string') return fallback;

    const match = rawValue.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return fallback;

    const hour = Number.parseInt(match[1], 10);
    const minute = Number.parseInt(match[2], 10);

    if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return fallback;
    }

    return {
        hour,
        minute,
        label: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    };
}

function getThailandDateKey(date: Date) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: TH_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    return formatter.format(date);
}

function getThailandMinutesOfDay(date: Date) {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: TH_TIME_ZONE,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
    }).formatToParts(date);

    const hour = Number.parseInt(parts.find((part) => part.type === 'hour')?.value || '0', 10);
    const minute = Number.parseInt(parts.find((part) => part.type === 'minute')?.value || '0', 10);

    return hour * 60 + minute;
}

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

        if (!process.env.CRON_SECRET || authHeader !== expectedAuth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const requestUrl = new URL(request.url);
        const forceSend = ['1', 'true', 'yes'].includes((requestUrl.searchParams.get('force') || '').toLowerCase());

        console.log('[Cron] Starting manager summary generation...');

        const settingsRows = await prisma.tbl_system_settings.findMany({
            where: {
                setting_key: {
                    in: [
                        'manager_line_summary_enabled',
                        'manager_line_summary_topics',
                        'manager_line_summary_time',
                        'manager_line_summary_roles',
                        'manager_line_summary_last_sent_date',
                    ],
                },
            },
            select: {
                setting_key: true,
                setting_value: true,
            },
        });
        const settingsMap = settingsRows.reduce<Record<string, string>>((acc, row) => {
            acc[row.setting_key] = row.setting_value;
            return acc;
        }, {});

        const isSummaryEnabled = parseBooleanSetting(settingsMap.manager_line_summary_enabled, true);
        if (!isSummaryEnabled) {
            return NextResponse.json({
                success: true,
                message: 'Manager LINE summary is disabled in settings',
                recipients: 0,
            });
        }

        const selectedTopics = parseManagerSummaryTopics(settingsMap.manager_line_summary_topics);
        if (selectedTopics.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No manager summary topics selected',
                recipients: 0,
            });
        }

        const selectedRoles = parseManagerSummaryRoles(settingsMap.manager_line_summary_roles);
        if (selectedRoles.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No recipient roles selected',
                recipients: 0,
            });
        }

        const summaryTime = parseManagerSummaryTime(settingsMap.manager_line_summary_time);
        const now = new Date();
        const todayKey = getThailandDateKey(now);

        const currentMinuteOfDay = getThailandMinutesOfDay(now);
        const targetMinuteOfDay = (summaryTime.hour * 60) + summaryTime.minute;
        const alreadySentToday = settingsMap.manager_line_summary_last_sent_date === todayKey;

        if (!forceSend && alreadySentToday) {
            return NextResponse.json({
                success: true,
                message: 'Manager summary already sent today',
                selectedTopics,
                selectedRoles,
                sendTime: summaryTime.label,
                recipients: 0,
                skipped: true,
            });
        }

        if (!forceSend && currentMinuteOfDay < targetMinuteOfDay) {
            return NextResponse.json({
                success: true,
                message: 'Not yet summary send time',
                selectedTopics,
                selectedRoles,
                sendTime: summaryTime.label,
                recipients: 0,
                skipped: true,
            });
        }

        const topicStats: Partial<Record<ManagerSummaryTopic, number>> = {};

        if (selectedTopics.includes('maintenance_pending')) {
            topicStats.maintenance_pending = await prisma.tbl_maintenance_requests.count({
                where: {
                    deleted_at: null,
                    status: {
                        in: ['pending', 'in_progress'],
                    },
                },
            });
        }

        if (selectedTopics.includes('part_requests_pending')) {
            topicStats.part_requests_pending = await prisma.tbl_part_requests.count({
                where: {
                    status: 'pending',
                },
            });
        }

        if (selectedTopics.includes('low_stock')) {
            const lowStockItems = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
                SELECT COUNT(*) as count
                FROM tbl_products
                WHERE p_count <= safety_stock
                  AND active = 1
                  AND safety_stock > 0
            `;
            topicStats.low_stock = Number(lowStockItems[0]?.count || 0);
        }

        const todayLabel = new Intl.DateTimeFormat('th-TH', {
            timeZone: TH_TIME_ZONE,
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }).format(now);

        const messageLines: string[] = [
            '📋 สรุปรายงานประจำวัน',
            `🗓️ ${todayLabel}`,
            '',
        ];

        if (selectedTopics.includes('maintenance_pending')) {
            messageLines.push(`🛠️ งานซ่อมค้างคิว: ${topicStats.maintenance_pending ?? 0} งาน`);
        }
        if (selectedTopics.includes('part_requests_pending')) {
            messageLines.push(`🛒 คำขอเบิก/สั่งซื้อรออนุมัติ: ${topicStats.part_requests_pending ?? 0} รายการ`);
        }
        if (selectedTopics.includes('low_stock')) {
            messageLines.push(`⚠️ สินค้าเหลือน้อย: ${topicStats.low_stock ?? 0} รายการ`);
        }

        messageLines.push('');
        messageLines.push('ตรวจสอบรายละเอียดเพิ่มเติมได้ในระบบ Stock Movement');

        const message = {
            type: 'text' as const,
            text: messageLines.join('\n'),
        };

        const targetIds = await getSummaryLineIdsByRoles(selectedRoles);

        let groupRecipients = 0;

        let individualRecipients = 0;
        if (targetIds.length > 0) {
            const result = await sendMulticastMessage(targetIds, message);
            if (!result.success) {
                console.error('[Cron] Failed to send manager LINE summary:', result.error);
                return NextResponse.json({ error: 'Failed to send LINE message', details: result.error }, { status: 500 });
            }
            individualRecipients = targetIds.length;
        } else {
            console.log('[Cron] No active LINE users found for selected summary roles.');
        }

        const groupResult = await sendConfiguredLineGroupTextNotification(message.text);
        if (groupResult.success) {
            groupRecipients = groupResult.pushSuccess + (groupResult.notifySuccess ? 1 : 0);
        }

        if (individualRecipients > 0 || groupRecipients > 0) {
            await prisma.tbl_system_settings.upsert({
                where: { setting_key: 'manager_line_summary_last_sent_date' },
                update: {
                    setting_value: todayKey,
                    updated_at: new Date(),
                },
                create: {
                    setting_key: 'manager_line_summary_last_sent_date',
                    setting_value: todayKey,
                },
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Manager daily summary sent successfully',
            selectedTopics,
            selectedRoles,
            sendTime: summaryTime.label,
            stats: topicStats,
            recipients: individualRecipients,
            groupRecipients,
            forced: forceSend,
        });
    } catch (error) {
        console.error('[Cron Error] Manager daily summary failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
