'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { uploadFile } from '@/lib/gcs';

// Generate PC Request Number (e.g., PC-20260226-001)
async function generatePettyCashNumber() {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const prefix = `PC-${dateStr}-`;

    const lastRequest = await prisma.tbl_petty_cash.findFirst({
        where: { request_number: { startsWith: prefix } },
        orderBy: { request_number: 'desc' }
    });

    let autoIncrement = 1;
    if (lastRequest) {
        const lastParts = lastRequest.request_number.split('-');
        if (lastParts.length === 3) {
            autoIncrement = parseInt(lastParts[2]) + 1;
        }
    }

    return `${prefix}${autoIncrement.toString().padStart(3, '0')}`;
}

export async function getPettyCashRequests() {
    try {
        const session = await auth();
        if (!session || !session.user) return { success: false, error: 'Unauthorized' };

        // Employees only see their own requests. Admin/Accounting/Manager see all.
        const isAdminOrAccounting = ['admin', 'manager', 'accounting'].includes((session.user as any).role?.toLowerCase() || '');

        let where = {};
        if (!isAdminOrAccounting) {
            where = { requested_by: session.user.name };
        }

        const requests = await prisma.tbl_petty_cash.findMany({
            where,
            orderBy: { created_at: 'desc' }
        });

        return { success: true, data: requests };
    } catch (error) {
        console.error('Error fetching petty cash requests:', error);
        return { success: false, error: 'Failed' };
    }
}

export async function createPettyCashRequest(formData: FormData) {
    try {
        const session = await auth();
        if (!session || !session.user) return { success: false, error: 'Unauthorized' };

        const requested_amount = Number(formData.get('requested_amount'));
        const purpose = formData.get('purpose') as string;

        if (!requested_amount || !purpose) {
            return { success: false, error: 'Amount and Purpose are required' };
        }

        const request_number = await generatePettyCashNumber();

        const request = await prisma.tbl_petty_cash.create({
            data: {
                request_number,
                requested_by: session.user.name || 'Unknown',
                purpose,
                requested_amount,
                status: 'pending'
            }
        });

        revalidatePath('/petty-cash');

        // Send Notification
        try {
            const { notifyPettyCashEvent } = await import('@/lib/notifications/notificationManager');
            await notifyPettyCashEvent({
                eventType: 'request',
                request_number: request.request_number,
                requested_by: request.requested_by,
                purpose: request.purpose,
                amount: Number(request.requested_amount)
            });
        } catch (err) {
            console.error('[Petty Cash] Notification failed:', err);
        }

        return { success: true, data: request };
    } catch (error) {
        console.error('Error creating petty cash request:', error);
        return { success: false, error: 'Failed to create request' };
    }
}

export async function dispensePettyCash(id: number, dispensed_amount: number, notes?: string) {
    try {
        const session = await auth();
        if (!session || !session.user) return { success: false, error: 'Unauthorized' };

        // Only accounting or admin
        const isAdminOrAccounting = ['admin', 'manager', 'accounting'].includes((session.user as any).role?.toLowerCase() || '');
        if (!isAdminOrAccounting) return { success: false, error: 'Permission denied' };

        const request = await prisma.tbl_petty_cash.update({
            where: { id },
            data: {
                status: 'dispensed',
                dispensed_amount,
                dispensed_by: session.user.name || 'Unknown',
                dispensed_at: new Date(),
                notes: notes || undefined
            }
        });

        revalidatePath('/petty-cash');

        try {
            const { notifyPettyCashEvent } = await import('@/lib/notifications/notificationManager');
            await notifyPettyCashEvent({
                eventType: 'dispense',
                request_number: request.request_number,
                requested_by: request.requested_by,
                purpose: request.purpose,
                amount: dispensed_amount,
                notes: notes || undefined
            });
        } catch (err) {
            console.error('[Petty Cash] Notification failed:', err);
        }

        return { success: true, data: request };
    } catch (error) {
        console.error('Error dispensing petty cash:', error);
        return { success: false, error: 'Failed to dispense cash' };
    }
}

export async function submitClearance(id: number, formData: FormData) {
    try {
        const session = await auth();
        if (!session || !session.user) return { success: false, error: 'Unauthorized' };

        const actual_spent = Number(formData.get('actual_spent'));
        const notes = formData.get('notes') as string | undefined;

        // Handle receipt uploads (multiple files supported via standard Next form practice, handled as single here for simplicity, or handle multiple if needed)
        const files = formData.getAll('receipts') as File[];
        const receipt_urls: string[] = [];

        for (const file of files) {
            if (file && file.size > 0) {
                const url = await uploadFile(file, 'pettycash');
                receipt_urls.push(url);
            }
        }

        // Get original request to calculate change
        const request = await prisma.tbl_petty_cash.findUnique({ where: { id } });
        if (!request || request.status !== 'dispensed') {
            return { success: false, error: 'Invalid operation' };
        }

        const requested_or_dispensed = request.dispensed_amount || request.requested_amount;
        // The employee returns the rest of the money
        const change_returned = Number(requested_or_dispensed) - actual_spent;

        const updated = await prisma.tbl_petty_cash.update({
            where: { id },
            data: {
                status: 'clearing',
                actual_spent,
                change_returned,
                receipt_urls: JSON.stringify(receipt_urls), // Store as stringified JSON array
                cleared_at: new Date(),
                // append notes
                notes: notes ? `${request.notes ? request.notes + '\n' : ''}Clearance Notes: ${notes}` : undefined
            }
        });

        revalidatePath('/petty-cash');

        try {
            const { notifyPettyCashEvent } = await import('@/lib/notifications/notificationManager');
            await notifyPettyCashEvent({
                eventType: 'clear',
                request_number: updated.request_number,
                requested_by: updated.requested_by,
                purpose: updated.purpose,
                amount: actual_spent,
                notes: notes || undefined
            });
        } catch (err) {
            console.error('[Petty Cash] Notification failed:', err);
        }

        return { success: true, data: updated };
    } catch (error) {
        console.error('Error submitting clearance:', error);
        return { success: false, error: 'Failed to submit clearance' };
    }
}

export async function reconcilePettyCash(id: number, notes?: string) {
    try {
        const session = await auth();
        if (!session || !session.user) return { success: false, error: 'Unauthorized' };

        const isAdminOrAccounting = ['admin', 'manager', 'accounting'].includes((session.user as any).role?.toLowerCase() || '');
        if (!isAdminOrAccounting) return { success: false, error: 'Permission denied' };

        const currentRequest = await prisma.tbl_petty_cash.findUnique({ where: { id } });

        const updated = await prisma.tbl_petty_cash.update({
            where: { id },
            data: {
                status: 'reconciled',
                reconciled_by: session.user.name || 'Unknown',
                reconciled_at: new Date(),
                notes: notes ? `${currentRequest?.notes ? currentRequest?.notes + '\n' : ''}Accounting: ${notes}` : undefined
            }
        });

        revalidatePath('/petty-cash');

        try {
            const { notifyPettyCashEvent } = await import('@/lib/notifications/notificationManager');
            await notifyPettyCashEvent({
                eventType: 'reconcile',
                request_number: updated.request_number,
                requested_by: updated.requested_by,
                purpose: updated.purpose,
                amount: Number(updated.actual_spent),
                notes: notes || undefined
            });
        } catch (err) {
            console.error('[Petty Cash] Notification failed:', err);
        }

        return { success: true, data: updated };
    } catch (error) {
        console.error('Error reconciling petty cash:', error);
        return { success: false, error: 'Failed to reconcile' };
    }
}

export async function rejectPettyCash(id: number, notes?: string) {
    try {
        const session = await auth();
        if (!session || !session.user) return { success: false, error: 'Unauthorized' };

        const isAdminOrAccounting = ['admin', 'manager', 'accounting'].includes((session.user as any).role?.toLowerCase() || '');
        if (!isAdminOrAccounting) return { success: false, error: 'Permission denied' };

        const currentRequest = await prisma.tbl_petty_cash.findUnique({ where: { id } });

        const request = await prisma.tbl_petty_cash.update({
            where: { id },
            data: {
                status: 'rejected',
                notes: notes ? `${currentRequest?.notes ? currentRequest?.notes + '\n' : ''}Rejected: ${notes}` : undefined
            }
        });

        revalidatePath('/petty-cash');
        return { success: true, data: request };
    } catch (error) {
        console.error('Error rejecting petty cash:', error);
        return { success: false, error: 'Failed to reject' };
    }
}

export async function deletePettyCashRequest(id: number) {
    try {
        const session = await auth();
        if (!session || !session.user) return { success: false, error: 'Unauthorized' };

        // Need admin, manager, or approver to delete
        const role = (session.user as any).role?.toLowerCase() || '';
        if (!['admin', 'manager'].includes(role) && !session.user.is_approver) {
            return { success: false, error: 'Permission denied: Requires Approver status' };
        }

        await prisma.tbl_petty_cash.delete({
            where: { id }
        });

        revalidatePath('/petty-cash');
        return { success: true };
    } catch (error) {
        console.error('Error deleting petty cash:', error);
        return { success: false, error: 'Failed to delete request' };
    }
}
