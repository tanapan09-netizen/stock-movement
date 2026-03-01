/**
 * LINE Messaging API Service
 * Replaces LINE Notify with official Messaging API
 */

import { Client, WebhookEvent, TextMessage, FlexMessage } from '@line/bot-sdk';

const config = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};

let client: Client | null = null;

/**
 * Get LINE client instance
 */
function getClient(): Client | null {
    if (!config.channelAccessToken || !config.channelSecret) {
        console.log('[LINE Messaging] Credentials not configured');
        return null;
    }

    if (!client) {
        client = new Client(config);
    }
    return client;
}

/**
 * Send push message to specific LINE user
 */
export async function sendPushMessage(
    userId: string,
    message: TextMessage | FlexMessage
): Promise<{ success: boolean; error?: string }> {
    try {
        const lineClient = getClient();
        if (!lineClient) {
            return { success: false, error: 'LINE client not configured' };
        }

        await lineClient.pushMessage(userId, message);
        console.log('[LINE Messaging] Message sent to:', userId);
        return { success: true };
    } catch (error) {
        console.error('[LINE Messaging] Failed to send:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Send push message to multiple users
 */
export async function sendMulticastMessage(
    userIds: string[],
    message: TextMessage | FlexMessage
): Promise<{ success: boolean; error?: string }> {
    try {
        const lineClient = getClient();
        if (!lineClient) {
            return { success: false, error: 'LINE client not configured' };
        }

        if (userIds.length === 0) {
            return { success: false, error: 'No recipients' };
        }

        // LINE Multicast supports up to 500 recipients
        const chunks = chunkArray(userIds, 500);

        for (const chunk of chunks) {
            await lineClient.multicast(chunk, message);
        }

        console.log('[LINE Messaging] Multicast sent to', userIds.length, 'users');
        return { success: true };
    } catch (error) {
        console.error('[LINE Messaging] Multicast failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Create text message
 */
export function createTextMessage(text: string): TextMessage {
    return {
        type: 'text',
        text,
    };
}

/**
 * Create Flex Message for Petty Cash 
 */
export function createPettyCashFlexMessage(data: {
    eventType: 'request' | 'dispense' | 'clear' | 'reconcile';
    request_number: string;
    requested_by: string;
    purpose: string;
    amount: number;
    notes?: string;
}): FlexMessage {
    const titles = {
        request: '💵 เบิกเงินสดย่อยใหม่',
        dispense: '💸 จ่ายเงินสดย่อยแล้ว',
        clear: '🧾 คืนเงิน/ส่งใบเสร็จแล้ว',
        reconcile: '✅ ปิดยอดเงินสดย่อยแล้ว'
    };
    const colors = {
        request: '#3b82f6',  // Blue
        dispense: '#f59e0b', // Amber
        clear: '#8b5cf6',    // Purple
        reconcile: '#10b981' // Green
    };

    const title = titles[data.eventType];
    const color = colors[data.eventType];

    return {
        type: 'flex',
        altText: title,
        contents: {
            type: 'bubble',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: title,
                        weight: 'bold',
                        color: '#ffffff',
                        size: 'lg'
                    }
                ],
                backgroundColor: color,
                paddingAll: '20px'
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'box',
                        layout: 'baseline',
                        spacing: 'sm',
                        contents: [
                            { type: 'text', text: 'เลขที่:', color: '#aaaaaa', size: 'sm', flex: 2 },
                            { type: 'text', text: data.request_number, wrap: true, color: '#666666', size: 'sm', flex: 5 }
                        ]
                    },
                    {
                        type: 'box',
                        layout: 'baseline',
                        spacing: 'sm',
                        contents: [
                            { type: 'text', text: 'ผู้เบิก:', color: '#aaaaaa', size: 'sm', flex: 2 },
                            { type: 'text', text: data.requested_by, wrap: true, color: '#666666', size: 'sm', flex: 5 }
                        ],
                        margin: 'sm'
                    },
                    {
                        type: 'box',
                        layout: 'baseline',
                        spacing: 'sm',
                        contents: [
                            { type: 'text', text: 'รายการ:', color: '#aaaaaa', size: 'sm', flex: 2 },
                            { type: 'text', text: data.purpose.replace(/\*\*/g, ''), wrap: true, color: '#666666', size: 'sm', flex: 5 }
                        ],
                        margin: 'sm'
                    },
                    {
                        type: 'box',
                        layout: 'baseline',
                        spacing: 'sm',
                        contents: [
                            { type: 'text', text: 'จำนวนเงิน:', color: '#aaaaaa', size: 'sm', flex: 2 },
                            { type: 'text', text: `฿${data.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, wrap: true, color: '#ef4444', weight: 'bold', size: 'md', flex: 5 }
                        ],
                        margin: 'md'
                    },
                    ...(data.notes ? [{
                        type: 'box' as const,
                        layout: 'baseline' as const,
                        spacing: 'sm',
                        contents: [
                            { type: 'text' as const, text: 'หมายเหตุ:', color: '#aaaaaa', size: 'sm', flex: 2 },
                            { type: 'text' as const, text: data.notes, wrap: true, color: '#666666', size: 'sm', flex: 5 }
                        ],
                        margin: 'md'
                    }] : [])
                ]
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                contents: [
                    {
                        type: 'button',
                        style: 'primary',
                        height: 'sm',
                        action: {
                            type: 'uri',
                            label: 'ดูรายละเอียด',
                            uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/petty-cash?req=${data.request_number}`,
                        },
                    },
                ],
                flex: 0,
            }
        }
    };
}

/**
 * Create Flex Message for Part Request
 */
export function createPartRequestFlexMessage(request: {
    item_name: string;
    quantity: number;
    priority: string;
    estimated_price?: number | null;
    requested_by: string;
    department?: string | null;
    date_needed?: Date | null;
}): FlexMessage {
    const priorityColor = {
        normal: '#3b82f6',
        urgent: '#f59e0b',
        critical: '#ef4444',
    }[request.priority] || '#6b7280';

    const priorityLabel = {
        normal: 'ปกติ',
        urgent: 'เร่งด่วน',
        critical: 'วิกฤต',
    }[request.priority] || request.priority;

    return {
        type: 'flex',
        altText: `🔔 คำขออะไหล่ใหม่: ${request.item_name}`,
        contents: {
            type: 'bubble',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: '🔔 คำขออะไหล่ใหม่',
                        weight: 'bold',
                        color: '#ffffff',
                        size: 'lg',
                    },
                ],
                backgroundColor: '#2563eb',
                paddingAll: '20px',
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'box',
                        layout: 'vertical',
                        margin: 'lg',
                        spacing: 'sm',
                        contents: [
                            {
                                type: 'box',
                                layout: 'baseline',
                                spacing: 'sm',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '📦 รายการ',
                                        color: '#6b7280',
                                        size: 'sm',
                                        flex: 2,
                                    },
                                    {
                                        type: 'text',
                                        text: request.item_name,
                                        wrap: true,
                                        color: '#111827',
                                        size: 'sm',
                                        flex: 5,
                                        weight: 'bold',
                                    },
                                ],
                            },
                            {
                                type: 'box',
                                layout: 'baseline',
                                spacing: 'sm',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '🔢 จำนวน',
                                        color: '#6b7280',
                                        size: 'sm',
                                        flex: 2,
                                    },
                                    {
                                        type: 'text',
                                        text: `${request.quantity} ชิ้น`,
                                        wrap: true,
                                        color: '#111827',
                                        size: 'sm',
                                        flex: 5,
                                    },
                                ],
                            },
                            {
                                type: 'box',
                                layout: 'baseline',
                                spacing: 'sm',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '⚡ ความเร่งด่วน',
                                        color: '#6b7280',
                                        size: 'sm',
                                        flex: 2,
                                    },
                                    {
                                        type: 'text',
                                        text: priorityLabel,
                                        wrap: true,
                                        color: priorityColor,
                                        size: 'sm',
                                        flex: 5,
                                        weight: 'bold',
                                    },
                                ],
                            },
                            ...(request.estimated_price
                                ? [
                                    {
                                        type: 'box' as const,
                                        layout: 'baseline' as const,
                                        spacing: 'sm' as const,
                                        contents: [
                                            {
                                                type: 'text' as const,
                                                text: '💰 ราคาประมาณ',
                                                color: '#6b7280',
                                                size: 'sm' as const,
                                                flex: 2,
                                            },
                                            {
                                                type: 'text' as const,
                                                text: `${request.estimated_price.toLocaleString()} บาท`,
                                                wrap: true,
                                                color: '#111827',
                                                size: 'sm' as const,
                                                flex: 5,
                                            },
                                        ],
                                    },
                                ]
                                : []),
                            {
                                type: 'separator',
                                margin: 'md',
                            },
                            {
                                type: 'box',
                                layout: 'baseline',
                                spacing: 'sm',
                                margin: 'md',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '👤 ผู้ขอ',
                                        color: '#6b7280',
                                        size: 'sm',
                                        flex: 2,
                                    },
                                    {
                                        type: 'text',
                                        text: request.requested_by,
                                        wrap: true,
                                        color: '#111827',
                                        size: 'sm',
                                        flex: 5,
                                    },
                                ],
                            },
                            ...(request.department
                                ? [
                                    {
                                        type: 'box' as const,
                                        layout: 'baseline' as const,
                                        spacing: 'sm' as const,
                                        contents: [
                                            {
                                                type: 'text' as const,
                                                text: '🏢 แผนก',
                                                color: '#6b7280',
                                                size: 'sm' as const,
                                                flex: 2,
                                            },
                                            {
                                                type: 'text' as const,
                                                text: request.department,
                                                wrap: true,
                                                color: '#111827',
                                                size: 'sm' as const,
                                                flex: 5,
                                            },
                                        ],
                                    },
                                ]
                                : []),
                            ...(request.date_needed
                                ? [
                                    {
                                        type: 'box' as const,
                                        layout: 'baseline' as const,
                                        spacing: 'sm' as const,
                                        contents: [
                                            {
                                                type: 'text' as const,
                                                text: '📅 ต้องการภายใน',
                                                color: '#6b7280',
                                                size: 'sm' as const,
                                                flex: 2,
                                            },
                                            {
                                                type: 'text' as const,
                                                text: new Date(request.date_needed).toLocaleDateString('th-TH'),
                                                wrap: true,
                                                color: '#111827',
                                                size: 'sm' as const,
                                                flex: 5,
                                            },
                                        ],
                                    },
                                ]
                                : []),
                        ],
                    },
                ],
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                contents: [
                    {
                        type: 'button',
                        style: 'primary',
                        height: 'sm',
                        action: {
                            type: 'uri',
                            label: 'ดูรายละเอียดและอนุมัติ',
                            uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/maintenance/part-requests`,
                        },
                    },
                ],
                flex: 0,
            },
        },
    };
}

/**
 * Create Flex Message for New Maintenance Request
 */
export function createMaintenanceRequestFlexMessage(request: {
    request_number: string;
    title: string;
    description?: string | null;
    priority: string;
    room_code: string;
    room_name: string;
    reported_by: string;
}): FlexMessage {
    const priorityColor = {
        normal: '#3b82f6',
        urgent: '#f59e0b',
        critical: '#ef4444',
    }[request.priority] || '#6b7280';

    const priorityLabel = {
        normal: 'ปกติ',
        urgent: 'เร่งด่วน',
        critical: 'วิกฤต',
    }[request.priority] || request.priority;

    return {
        type: 'flex',
        altText: `🛠️ แจ้งซ่อมใหม่: ${request.title}`,
        contents: {
            type: 'bubble',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: '🛠️ รายการแจ้งซ่อมใหม่',
                        weight: 'bold',
                        color: '#ffffff',
                        size: 'lg',
                    },
                ],
                backgroundColor: '#ef4444',
                paddingAll: '20px',
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: request.title,
                        weight: 'bold',
                        size: 'md',
                        margin: 'md',
                        wrap: true,
                    },
                    {
                        type: 'text',
                        text: `#${request.request_number}`,
                        size: 'xs',
                        color: '#9ca3af',
                        margin: 'xs',
                    },
                    {
                        type: 'separator',
                        margin: 'lg',
                    },
                    {
                        type: 'box',
                        layout: 'vertical',
                        margin: 'lg',
                        spacing: 'sm',
                        contents: [
                            {
                                type: 'box',
                                layout: 'baseline',
                                spacing: 'sm',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '📍 สถานที่',
                                        color: '#6b7280',
                                        size: 'sm',
                                        flex: 2,
                                    },
                                    {
                                        type: 'text',
                                        text: `${request.room_name} (${request.room_code})`,
                                        wrap: true,
                                        color: '#111827',
                                        size: 'sm',
                                        flex: 5,
                                    },
                                ],
                            },
                            {
                                type: 'box',
                                layout: 'baseline',
                                spacing: 'sm',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '⚡ ความเร่งด่วน',
                                        color: '#6b7280',
                                        size: 'sm',
                                        flex: 2,
                                    },
                                    {
                                        type: 'text',
                                        text: priorityLabel,
                                        wrap: true,
                                        color: priorityColor,
                                        size: 'sm',
                                        flex: 5,
                                        weight: 'bold',
                                    },
                                ],
                            },
                            {
                                type: 'box',
                                layout: 'baseline',
                                spacing: 'sm',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '👤 ผู้แจ้ง',
                                        color: '#6b7280',
                                        size: 'sm',
                                        flex: 2,
                                    },
                                    {
                                        type: 'text',
                                        text: request.reported_by,
                                        wrap: true,
                                        color: '#111827',
                                        size: 'sm',
                                        flex: 5,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                contents: [
                    {
                        type: 'button',
                        style: 'primary',
                        height: 'sm',
                        action: {
                            type: 'uri',
                            label: 'ดูรายละเอียด',
                            uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/maintenance?req=${request.request_number}`,
                        },
                    },
                ],
                flex: 0,
            },
        },
    };
}

/**
 * Create Flex Message for Status Change
 */
export function createStatusChangeFlexMessage(
    request: { item_name: string; requested_by: string },
    oldStatus: string,
    newStatus: string
): FlexMessage {
    const statusLabels: Record<string, string> = {
        pending: 'รออนุมัติ',
        approved: 'อนุมัติแล้ว',
        ordered: 'สั่งซื้อแล้ว',
        received: 'ได้รับแล้ว',
        rejected: 'ปฏิเสธ',
    };

    const statusColors: Record<string, string> = {
        pending: '#f59e0b',
        approved: '#10b981',
        ordered: '#3b82f6',
        received: '#059669',
        rejected: '#ef4444',
    };

    return {
        type: 'flex',
        altText: `🔄 อัปเดตสถานะ: ${request.item_name}`,
        contents: {
            type: 'bubble',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: '🔄 อัปเดตสถานะ',
                        weight: 'bold',
                        color: '#ffffff',
                        size: 'lg',
                    },
                ],
                backgroundColor: '#6366f1',
                paddingAll: '20px',
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: request.item_name,
                        weight: 'bold',
                        size: 'md',
                        margin: 'md',
                    },
                    {
                        type: 'text',
                        text: `ผู้ขอ: ${request.requested_by}`,
                        size: 'sm',
                        color: '#6b7280',
                        margin: 'sm',
                    },
                    {
                        type: 'separator',
                        margin: 'xl',
                    },
                    {
                        type: 'box',
                        layout: 'vertical',
                        margin: 'xl',
                        spacing: 'sm',
                        contents: [
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: statusLabels[oldStatus] || oldStatus,
                                        size: 'sm',
                                        color: statusColors[oldStatus] || '#6b7280',
                                        flex: 0,
                                        weight: 'bold',
                                    },
                                ],
                            },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '↓',
                                        size: 'sm',
                                        color: '#6b7280',
                                        align: 'center',
                                    },
                                ],
                            },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: statusLabels[newStatus] || newStatus,
                                        size: 'sm',
                                        color: statusColors[newStatus] || '#6b7280',
                                        flex: 0,
                                        weight: 'bold',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                contents: [
                    {
                        type: 'button',
                        style: 'link',
                        height: 'sm',
                        action: {
                            type: 'uri',
                            label: 'ดูรายละเอียด',
                            uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/maintenance/part-requests`,
                        },
                    },
                ],
                flex: 0,
            },
        },
    };
}

/**
 * Utility: Chunk array into smaller arrays
 */
function chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

/**
 * Get user profile from LINE
 */
export async function getUserProfile(userId: string) {
    try {
        const lineClient = getClient();
        if (!lineClient) {
            return null;
        }

        const profile = await lineClient.getProfile(userId);
        return profile;
    } catch (error) {
        console.error('[LINE Messaging] Failed to get profile:', error);
        return null;
    }
}

/**
 * Create Flex Message for Job Assignment
 */
export function createJobAssignmentFlexMessage(request: {
    request_number: string;
    title: string;
    description?: string | null;
    priority: string;
    room_code: string;
    room_name: string;
    reported_by: string;
}): FlexMessage {
    const priorityColor = {
        normal: '#3b82f6',
        urgent: '#f59e0b',
        critical: '#ef4444',
    }[request.priority] || '#6b7280';

    const priorityLabel = {
        normal: 'ปกติ',
        urgent: 'เร่งด่วน',
        critical: 'วิกฤต',
    }[request.priority] || request.priority;

    return {
        type: 'flex',
        altText: `🛠️ งานมอบหมายใหม่: ${request.title}`,
        contents: {
            type: 'bubble',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: '🛠️ งานมอบหมายใหม่',
                        weight: 'bold',
                        color: '#ffffff',
                        size: 'lg',
                    },
                ],
                backgroundColor: '#0ea5e9', // Sky blue
                paddingAll: '20px',
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: request.title,
                        weight: 'bold',
                        size: 'md',
                        margin: 'md',
                        wrap: true,
                    },
                    {
                        type: 'text',
                        text: `#${request.request_number}`,
                        size: 'xs',
                        color: '#9ca3af',
                        margin: 'xs',
                    },
                    {
                        type: 'separator',
                        margin: 'lg',
                    },
                    {
                        type: 'box',
                        layout: 'vertical',
                        margin: 'lg',
                        spacing: 'sm',
                        contents: [
                            {
                                type: 'box',
                                layout: 'baseline',
                                spacing: 'sm',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '📍 สถานที่',
                                        color: '#6b7280',
                                        size: 'sm',
                                        flex: 2,
                                    },
                                    {
                                        type: 'text',
                                        text: `${request.room_name} (${request.room_code})`,
                                        wrap: true,
                                        color: '#111827',
                                        size: 'sm',
                                        flex: 5,
                                    },
                                ],
                            },
                            {
                                type: 'box',
                                layout: 'baseline',
                                spacing: 'sm',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '⚡ ความเร่งด่วน',
                                        color: '#6b7280',
                                        size: 'sm',
                                        flex: 2,
                                    },
                                    {
                                        type: 'text',
                                        text: priorityLabel,
                                        wrap: true,
                                        color: priorityColor,
                                        size: 'sm',
                                        flex: 5,
                                        weight: 'bold',
                                    },
                                ],
                            },
                            {
                                type: 'box',
                                layout: 'baseline',
                                spacing: 'sm',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '👤 ผู้แจ้ง',
                                        color: '#6b7280',
                                        size: 'sm',
                                        flex: 2,
                                    },
                                    {
                                        type: 'text',
                                        text: request.reported_by,
                                        wrap: true,
                                        color: '#111827',
                                        size: 'sm',
                                        flex: 5,
                                    },
                                ],
                            },
                        ],
                    },
                    ...(request.description ? [
                        {
                            type: 'box' as const,
                            layout: 'vertical' as const,
                            margin: 'lg' as const,
                            contents: [
                                {
                                    type: 'text' as const,
                                    text: 'รายละเอียด:',
                                    size: 'xs' as const,
                                    color: '#6b7280',
                                    margin: 'sm' as const,
                                },
                                {
                                    type: 'text' as const,
                                    text: request.description,
                                    size: 'sm' as const,
                                    color: '#374151',
                                    wrap: true,
                                    margin: 'xs' as const,
                                },
                            ],
                            backgroundColor: '#f3f4f6',
                            paddingAll: '10px',
                            cornerRadius: 'md',
                        }
                    ] : []),
                ],
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                contents: [
                    {
                        type: 'button',
                        style: 'primary',
                        height: 'sm',
                        action: {
                            type: 'uri',
                            label: 'รับงาน / ดูรายละเอียด',
                            uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/maintenance?req=${request.request_number}`,
                        },
                    },
                ],
                flex: 0,
            },
        },
    };
}
