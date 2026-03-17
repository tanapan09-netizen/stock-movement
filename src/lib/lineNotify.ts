'use server';

// LINE Notify helper for maintenance notifications
// Uses LINE Notify API: https://notify-api.line.me/api/notify

const LINE_ADMIN_ID = process.env.LINE_ADMIN_ID || '';

export async function sendLineNotify(message: string): Promise<boolean> {
    console.log(`[LINE] sendLineNotify called. AdminID present: ${!!LINE_ADMIN_ID}`);
    // Legacy support: Redirects "Notify" calls to the Admin/Group via Messaging API
    if (!LINE_ADMIN_ID) {
        console.warn('[LINE] LINE_ADMIN_ID not configured. Broadcast notifications will be skipped.');
        return false;
    }

    return await sendLineMessage(LINE_ADMIN_ID, `📢 [System Alert]\n${message}`);
}

// Send notification to specific LINE user via LINE Messaging API
// Requires LINE Channel Access Token
const LINE_CHANNEL_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

export async function sendLineMessage(userId: string, message: string): Promise<boolean> {
    console.log(`[LINE] sendLineMessage to ${userId}`);
    if (!LINE_CHANNEL_TOKEN) {
        console.error('[LINE] LINE_CHANNEL_ACCESS_TOKEN not configured, skipping push message');
        return false;
    }

    try {
        const response = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LINE_CHANNEL_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to: userId,
                messages: [
                    {
                        type: 'text',
                        text: message
                    }
                ]
            })
        });

        if (response.ok) {
            console.log(`[LINE] Success: Message sent to ${userId}`);
            return true;
        } else {
            console.error('[LINE] Failed:', await response.text());
            return false;
        }
    } catch (error) {
        console.error('[LINE] Exception:', error);
        return false;
    }
}

// Send maintenance notification to all technicians with LINE User ID
export async function notifyTechniciansViaLine(
    title: string,
    roomCode: string,
    roomName: string,
    priority: string,
    reportedBy: string
): Promise<number> {
    const { prisma } = await import('@/lib/prisma');

    // Get all active technicians with LINE User ID
    const technicians = await prisma.tbl_technicians.findMany({
        where: {
            status: 'active',
            line_user_id: { not: null }
        },
        select: { line_user_id: true, name: true }
    });

    console.log(`[LINE] Found ${technicians.length} technicians with LINE ID`);

    if (technicians.length === 0) {
        console.log('[LINE] No technicians found, sending broadcast via sendLineNotify');
        // Fallback to LINE Notify (group notification)
        const priorityLabel = priority === 'urgent' ? '🚨 เร่งด่วน' : priority === 'high' ? '⚠️ สูง' : '';
        const message = `
🔧 แจ้งซ่อมใหม่ ${priorityLabel}
📍 ห้อง: ${roomCode} - ${roomName}
📋 ${title}
👤 ผู้แจ้ง: ${reportedBy}
        `.trim();
        await sendLineNotify(message);
        return 0;
    }

    const priorityLabel = priority === 'urgent' ? '🚨 เร่งด่วน' : priority === 'high' ? '⚠️ สูง' : '';
    const message = `
🔧 แจ้งซ่อมใหม่ ${priorityLabel}
📍 ห้อง: ${roomCode} - ${roomName}
📋 ${title}
👤 ผู้แจ้ง: ${reportedBy}
    `.trim();

    let sentCount = 0;
    for (const tech of technicians) {
        if (tech.line_user_id) {
            const success = await sendLineMessage(tech.line_user_id, message);
            if (success) sentCount++;
        }
    }

    // Also send to LINE Notify as backup
    await sendLineNotify(message);

    return sentCount;
}

// Send maintenance notification to specific roles with LINE User ID
export async function notifyRoleViaLine(
    targetRole: string,
    title: string,
    roomCode: string,
    roomName: string,
    priority: string,
    reportedBy: string
): Promise<number> {
    const { prisma } = await import('@/lib/prisma');

    // Default to 'technician' if somehow missing
    const role = targetRole || 'technician';
    console.log(`[LINE] notifyRoleViaLine start role=${role} title="${title}" room=${roomCode}`);

    // Primary source: LINE-linked users managed from Settings > LINE Users
    const lineUsers = await prisma.tbl_line_users.findMany({
        where: {
            role: role,
            is_active: true,
            line_user_id: { not: '' }
        },
        select: { line_user_id: true }
    });
    console.log(`[LINE] role=${role} tbl_line_users matches=${lineUsers.length}`);

    // Backward compatibility: also include application users with a matching role
    const users = await prisma.tbl_users.findMany({
        where: {
            role: role,
            deleted_at: null,
            line_user_id: { not: null }
        },
        select: { line_user_id: true }
    });
    console.log(`[LINE] role=${role} tbl_users matches=${users.length}`);

    // Extract unique Line IDs
    const lineIds = new Set<string>();
    lineUsers.forEach(u => u.line_user_id && lineIds.add(u.line_user_id));
    users.forEach(u => u.line_user_id && lineIds.add(u.line_user_id));

    // If role is technician, ALSO check tbl_technicians for backward compatibility
    if (role === 'technician') {
        const techs = await prisma.tbl_technicians.findMany({
            where: {
                status: 'active',
                line_user_id: { not: null }
            },
            select: { line_user_id: true }
        });
        console.log(`[LINE] role=technician tbl_technicians matches=${techs.length}`);
        techs.forEach(t => t.line_user_id && lineIds.add(t.line_user_id));
    }
    console.log(`[LINE] role=${role} unique lineIds=${lineIds.size}`);

    const priorityLabel = priority === 'urgent' ? '🚨 เร่งด่วน' : priority === 'high' ? '⚠️ สูง' : '';
    const message = `
🔧 แจ้งซ่อมใหม่ ${priorityLabel} [ถึงฝ่าย: ${role}]
📍 ห้อง: ${roomCode} - ${roomName}
📋 ${title}
👤 ผู้แจ้ง: ${reportedBy}
    `.trim();

    if (lineIds.size === 0) {
        console.log(`[LINE] No users found for role: ${role}, sending broadcast via sendLineNotify`);
        await sendLineNotify(message);
        return 0;
    }

    let sentCount = 0;
    for (const lineId of lineIds) {
        const success = await sendLineMessage(lineId, message);
        if (success) sentCount++;
    }

    // Still send group notification as backup
    console.log(`[LINE] role=${role} sent=${sentCount}, sending admin/group backup`);
    await sendLineNotify(message);

    return sentCount;
}
