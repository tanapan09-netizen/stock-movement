/**
 * LINE Webhook Endpoint
 * Handles follow/unfollow events and user registration
 */

import { NextRequest, NextResponse } from 'next/server';
import { WebhookEvent, validateSignature, TextMessage } from '@line/bot-sdk';
import { prisma } from '@/lib/prisma';
import { getUserProfile } from '@/lib/notifications/lineMessaging';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const channelSecret = process.env.LINE_CHANNEL_SECRET || '';

        // Get signature from headers
        const signature = request.headers.get('x-line-signature');
        if (!signature) {
            console.error('[LINE Webhook] Missing signature');
            return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
        }

        // Get raw body
        const body = await request.text();

        // Validate signature
        const isValid = validateSignature(body, channelSecret, signature);
        if (!isValid) {
            console.error('[LINE Webhook] Invalid signature');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        // Parse events
        const data = JSON.parse(body);
        const events: WebhookEvent[] = data.events || [];

        console.log('[LINE Webhook] Received', events.length, 'events');

        // Process each event
        for (const event of events) {
            await handleEvent(event);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[LINE Webhook] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Handle individual webhook event
 */
async function handleEvent(event: WebhookEvent) {
    try {
        console.log('[LINE Webhook] Event type:', event.type);

        switch (event.type) {
            case 'follow':
                await handleFollowEvent(event);
                break;

            case 'unfollow':
                await handleUnfollowEvent(event);
                break;

            case 'message':
                // Optional: Handle incoming messages
                console.log('[LINE Webhook] Message event (ignored)');
                break;

            default:
                console.log('[LINE Webhook] Unhandled event type:', event.type);
        }
    } catch (error) {
        console.error('[LINE Webhook] Event handling error:', error);
    }
}

/**
 * Handle follow event (user adds friend)
 */
async function handleFollowEvent(event: WebhookEvent) {
    if (event.type !== 'follow') return;

    const userId = event.source.userId;
    if (!userId) {
        console.error('[LINE Webhook] No userId in follow event');
        return;
    }

    console.log('[LINE Webhook] User followed:', userId);

    try {
        // Get user profile from LINE
        const profile = await getUserProfile(userId);

        // Save or update user in database
        await prisma.tbl_line_users.upsert({
            where: { line_user_id: userId },
            update: {
                is_active: true,
                display_name: profile?.displayName || null,
                picture_url: profile?.pictureUrl || null,
                last_interaction: new Date(),
            },
            create: {
                line_user_id: userId,
                display_name: profile?.displayName || null,
                picture_url: profile?.pictureUrl || null,
                is_approver: false,
                role: 'pending',
                is_active: true,
                last_interaction: new Date(),
            },
        });

        console.log('[LINE Webhook] User registered:', profile?.displayName || userId);
    } catch (error) {
        console.error('[LINE Webhook] Failed to register user:', error);
    }
}

/**
 * Handle unfollow event (user blocks/unfriends)
 */
async function handleUnfollowEvent(event: WebhookEvent) {
    if (event.type !== 'unfollow') return;

    const userId = event.source.userId;
    if (!userId) return;

    console.log('[LINE Webhook] User unfollowed:', userId);

    try {
        // Deactivate user instead of deleting
        await prisma.tbl_line_users.update({
            where: { line_user_id: userId },
            data: {
                is_active: false,
                last_interaction: new Date(),
            },
        });

        console.log('[LINE Webhook] User deactivated:', userId);
    } catch (error) {
        console.error('[LINE Webhook] Failed to deactivate user:', error);
    }
}

export const dynamic = 'force-dynamic';

// Note: For development/testing, you can add a GET endpoint
export async function GET() {
    const secret = process.env.LINE_CHANNEL_SECRET || '';

    return NextResponse.json({
        message: 'LINE Webhook endpoint',
        status: 'active',
        debug: {
            has_secret: secret.length > 0,
            secret_length: secret.length,
            secret_starts_with: secret ? secret.substring(0, 4) + '...' : 'none',
        },
        webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/line/webhook`,
    });
}
