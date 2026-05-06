'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { uploadFile } from '@/lib/gcs';
import { adjustFundBalance, getPettyCashFundStatus } from './pettyCashFundActions';
import { logSystemAction } from '@/lib/logger';
import { getUserPermissionContext } from '@/lib/server/permission-service';
import { maskPII } from '@/lib/security';
import {
    canApprovePettyCashRequest,
    canCreatePettyCashRequest,
    canDeletePettyCashEntry,
    canDispensePettyCashRequest,
    canManagePettyCashApprovals,
    canReconcilePettyCashRequest,
    canSubmitPettyCashClearance,
    canVerifyPettyCashReceipt,
    canViewPettyCashRequest,
} from '@/lib/rbac';

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

async function getPettyCashAuthContext() {
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

export async function getPettyCashRequests() {
    try {
        const authContext = await getPettyCashAuthContext();
        if (!authContext?.session?.user) return { success: false, error: 'Unauthorized' };

        const canReviewAllRequests = canManagePettyCashApprovals(
            authContext.role,
            authContext.permissions,
            authContext.isApprover,
        );

        let where = {};
        if (!canReviewAllRequests) {
            where = { requested_by: authContext.session.user.name };
        }

        const requests = await prisma.tbl_petty_cash.findMany({
            where,
            orderBy: { created_at: 'desc' }
        });

        // Convert Prisma Decimal to primitive Number for Client Component serialization
        const serializedRequests = requests.map(req => ({
            ...req,
            requested_amount: Number(req.requested_amount),
            dispensed_amount: req.dispensed_amount ? Number(req.dispensed_amount) : null,
            actual_spent: req.actual_spent ? Number(req.actual_spent) : null,
            change_returned: req.change_returned ? Number(req.change_returned) : null,
        }));

        return { success: true, data: serializedRequests };
    } catch (error) {
        console.error('Error fetching petty cash requests:', error);
        return { success: false, error: 'Failed' };
    }
}

export async function createPettyCashRequest(formData: FormData) {
    try {
        const authContext = await getPettyCashAuthContext();
        if (!authContext?.session?.user) return { success: false, error: 'Unauthorized' };

        if (!canCreatePettyCashRequest(
            authContext.role,
            authContext.permissions,
            authContext.isApprover,
        )) {
            return { success: false, error: 'Permission denied' };
        }

        const requested_amount = Number(formData.get('requested_amount'));
        const purpose = formData.get('purpose') as string;

        if (!requested_amount || !purpose) {
            return { success: false, error: 'Amount and Purpose are required' };
        }

        const request_number = await generatePettyCashNumber();

        const request = await prisma.tbl_petty_cash.create({
            data: {
                request_number,
                requested_by: authContext.session.user.name || 'Unknown',
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

        await logSystemAction(
            'PETTY_CASH_CREATE',
            'PettyCash',
            request.id,
            `เลขที่: ${request_number} | จำนวนเงิน: ${requested_amount.toLocaleString()} บาท | วัตถุประสงค์: ${purpose} | ผู้ขอ: ${maskPII.name(authContext.session.user.name)} | สถานะ: รออนุมัติ`,
            (authContext.session.user as any).p_id || (authContext.session.user as any).id,
            maskPII.name(authContext.session.user.name)
        );

        return { success: true, data: request };
    } catch (error) {
        console.error('Error creating petty cash request:', error);
        return { success: false, error: 'Failed to create request' };
    }
}

export async function approvePettyCash(id: number) {
    try {
        const authContext = await getPettyCashAuthContext();
        if (!authContext?.session?.user) return { success: false, error: 'Unauthorized' };

        if (!canApprovePettyCashRequest(
            authContext.role,
            authContext.permissions,
            authContext.isApprover,
        )) {
            return { success: false, error: 'Permission denied' };
        }

        const request = await prisma.tbl_petty_cash.update({
            where: { id, status: 'pending' },
            data: { status: 'approved' }
        });

        revalidatePath('/petty-cash');

        try {
            const { notifyPettyCashEvent } = await import('@/lib/notifications/notificationManager');
            await notifyPettyCashEvent({
                eventType: 'approved',
                request_number: request.request_number,
                requested_by: request.requested_by,
                purpose: request.purpose,
                amount: Number(request.requested_amount),
                notes: `Approved by ${authContext.session.user.name}`
            });
        } catch (err) {
            console.error('[Petty Cash] Notification failed:', err);
        }

        await logSystemAction(
            'PETTY_CASH_APPROVE',
            'PettyCash',
            id,
            `อนุมัติคำขอเลขที่: ${request.request_number} | จำนวนเงิน: ${Number(request.requested_amount).toLocaleString()} บาท | วัตถุประสงค์: ${request.purpose} | ผู้ขอ: ${maskPII.name(request.requested_by)} | อนุมัติโดย: ${maskPII.name(authContext.session.user.name)}`,
            (authContext.session.user as any).p_id || (authContext.session.user as any).id,
            maskPII.name(authContext.session.user.name)
        );

        return { success: true, data: request };
    } catch (error) {
        console.error('Error approving petty cash:', error);
        return { success: false, error: 'Failed to approve cash request' };
    }
}

export async function dispensePettyCash(id: number, dispensed_amount: number, notes?: string) {
    try {
        const authContext = await getPettyCashAuthContext();
        if (!authContext?.session?.user) return { success: false, error: 'Unauthorized' };

        if (!canDispensePettyCashRequest(authContext.role, authContext.permissions)) {
            return { success: false, error: 'Permission denied' };
        }

        const request = await prisma.tbl_petty_cash.update({
            where: { id, status: { in: ['pending', 'approved'] } },
            data: {
                status: 'dispensed',
                dispensed_amount,
                dispensed_by: authContext.session.user.name || 'Unknown',
                dispensed_at: new Date(),
                notes: notes || undefined
            }
        });

        // Deduct from Main Fund
        const fundRes = await getPettyCashFundStatus();
        if (fundRes.success && fundRes.data) {
            await adjustFundBalance(fundRes.data.id, -dispensed_amount);
        }

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

        await logSystemAction(
            'PETTY_CASH_DISPENSE',
            'PettyCash',
            id,
            `จ่ายเงินสดย่อยเลขที่: ${request.request_number} | จำนวนที่จ่าย: ${dispensed_amount.toLocaleString()} บาท | ผู้รับ: ${maskPII.name(request.requested_by)} | วัตถุประสงค์: ${request.purpose} | จ่ายโดย: ${maskPII.name(authContext.session.user.name)}${notes ? ' | หมายเหตุ: ' + notes : ''}`,
            (authContext.session.user as any).p_id || (authContext.session.user as any).id,
            maskPII.name(authContext.session.user.name)
        );

        return { success: true, data: request };
    } catch (error) {
        console.error('Error dispensing petty cash:', error);
        return { success: false, error: 'Failed to dispense cash' };
    }
}

export async function submitClearance(id: number, formData: FormData) {
    try {
        const authContext = await getPettyCashAuthContext();
        if (!authContext?.session?.user) return { success: false, error: 'Unauthorized' };

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

        if (!canSubmitPettyCashClearance(authContext.role, authContext.permissions, {
            currentUserName: authContext.session.user.name,
            ownerName: request.requested_by,
            isApprover: authContext.isApprover,
        })) {
            return { success: false, error: 'Permission denied' };
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

        await logSystemAction(
            'PETTY_CASH_CLEARANCE_SUBMIT',
            'PettyCash',
            id,
            `ส่งเคลียร์เงินสดย่อยเลขที่: ${updated.request_number} | ยอดใช้จริง: ${actual_spent.toLocaleString()} บาท | เงินทอนคืน: ${change_returned.toLocaleString()} บาท | ใบเสร็จ: ${receipt_urls.length} ไฟล์ | ผู้ส่ง: ${maskPII.name(authContext.session.user.name)}${notes ? ' | หมายเหตุ: ' + notes : ''}`,
            (authContext.session.user as any).p_id || (authContext.session.user as any).id,
            maskPII.name(authContext.session.user.name)
        );

        return { success: true, data: updated };
    } catch (error) {
        console.error('Error submitting clearance:', error);
        return { success: false, error: 'Failed to submit clearance' };
    }
}

export async function reconcilePettyCash(id: number, notes?: string) {
    try {
        const authContext = await getPettyCashAuthContext();
        if (!authContext?.session?.user) return { success: false, error: 'Unauthorized' };

        if (!canReconcilePettyCashRequest(authContext.role, authContext.permissions)) {
            return { success: false, error: 'Permission denied' };
        }

        const currentRequest = await prisma.tbl_petty_cash.findUnique({ where: { id } });

        const updated = await prisma.tbl_petty_cash.update({
            where: { id },
            data: {
                status: 'reconciled',
                reconciled_by: authContext.session.user.name || 'Unknown',
                reconciled_at: new Date(),
                notes: notes ? `${currentRequest?.notes ? currentRequest?.notes + '\n' : ''}Accounting: ${notes}` : undefined
            }
        });

        // Return any change back to the Main Fund
        if (currentRequest?.change_returned && Number(currentRequest.change_returned) > 0) {
            const fundRes = await getPettyCashFundStatus();
            if (fundRes.success && fundRes.data) {
                await adjustFundBalance(fundRes.data.id, Number(currentRequest.change_returned));
            }
        }

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

        await logSystemAction(
            'PETTY_CASH_RECONCILE',
            'PettyCash',
            id,
            `ปิดยอด (Reconcile) เลขที่: ${updated.request_number} | ยอดใช้จริง: ${Number(updated.actual_spent).toLocaleString()} บาท | เงินทอน: ${Number(updated.change_returned).toLocaleString()} บาท | ผู้ปิดยอด: ${maskPII.name(authContext.session.user.name)}`,
            (authContext.session.user as any).p_id || (authContext.session.user as any).id,
            maskPII.name(authContext.session.user.name)
        );

        return { success: true, data: updated };
    } catch (error) {
        console.error('Error reconciling petty cash:', error);
        return { success: false, error: 'Failed to reconcile' };
    }
}

export async function rejectPettyCash(id: number, notes?: string) {
    try {
        const authContext = await getPettyCashAuthContext();
        if (!authContext?.session?.user) return { success: false, error: 'Unauthorized' };

        if (!canApprovePettyCashRequest(
            authContext.role,
            authContext.permissions,
            authContext.isApprover,
        )) {
            return { success: false, error: 'Permission denied' };
        }

        const currentRequest = await prisma.tbl_petty_cash.findUnique({ where: { id } });

        const request = await prisma.tbl_petty_cash.update({
            where: { id },
            data: {
                status: 'rejected',
                notes: notes ? `${currentRequest?.notes ? currentRequest?.notes + '\n' : ''}Rejected: ${notes}` : undefined
            }
        });

        revalidatePath('/petty-cash');

        try {
            const { notifyPettyCashEvent } = await import('@/lib/notifications/notificationManager');
            await notifyPettyCashEvent({
                eventType: 'rejected',
                request_number: request.request_number,
                requested_by: request.requested_by,
                purpose: request.purpose,
                amount: Number(request.requested_amount),
                notes: notes || `Rejected by ${authContext.session.user.name}`
            });
        } catch (err) {
            console.error('[Petty Cash] Notification failed:', err);
        }

        await logSystemAction(
            'PETTY_CASH_REJECT',
            'PettyCash',
            id,
            `ปฏิเสธคำขอเลขที่: ${currentRequest?.request_number || id} | จำนวนเงิน: ${Number(currentRequest?.requested_amount).toLocaleString()} บาท | ผู้ขอ: ${maskPII.name(currentRequest?.requested_by)} | ปฏิเสธโดย: ${maskPII.name(authContext.session.user.name)}${notes ? ' | เหตุผล: ' + notes : ''}`,
            (authContext.session.user as any).p_id || (authContext.session.user as any).id,
            maskPII.name(authContext.session.user.name)
        );

        return { success: true, data: request };
    } catch (error) {
        console.error('Error rejecting petty cash:', error);
        return { success: false, error: 'Failed to reject' };
    }
}

export async function deletePettyCashRequest(id: number) {
    try {
        const authContext = await getPettyCashAuthContext();
        if (!authContext?.session?.user) return { success: false, error: 'Unauthorized' };

        const request = await prisma.tbl_petty_cash.findUnique({
            where: { id },
            select: {
                request_number: true,
                requested_by: true,
                status: true,
            }
        });

        if (!request) {
            return { success: false, error: 'Not found' };
        }

        if (!canDeletePettyCashEntry(authContext.role, authContext.permissions, {
            currentUserName: authContext.session.user.name,
            ownerName: request.requested_by,
            status: request.status,
            isApprover: authContext.isApprover,
        })) {
            return { success: false, error: 'Permission denied' };
        }

        await prisma.tbl_petty_cash.delete({
            where: { id }
        });

        revalidatePath('/petty-cash');

        await logSystemAction(
            'PETTY_CASH_DELETE',
            'PettyCash',
            id,
            `ลบใบเบิกเงินสดย่อย ${request.request_number} | ลบโดย: ${maskPII.name(authContext.session.user.name)} (สิทธิ์: ${(authContext.session.user as any).role || 'N/A'})`,
            (authContext.session.user as any).p_id || (authContext.session.user as any).id,
            maskPII.name(authContext.session.user.name)
        );

        return { success: true };
    } catch (error) {
        console.error('Error deleting petty cash:', error);
        return { success: false, error: 'Failed to delete request' };
    }
}

export async function verifyOriginalReceipt(id: number, hasReceived: boolean) {
    try {
        const authContext = await getPettyCashAuthContext();
        if (!authContext?.session?.user) return { success: false, error: 'Unauthorized' };

        if (!canVerifyPettyCashReceipt(authContext.role, authContext.permissions)) {
            return { success: false, error: 'Permission denied' };
        }

        const updated = await prisma.tbl_petty_cash.update({
            where: { id },
            data: { has_original_receipt: hasReceived }
        });

        revalidatePath('/petty-cash');

        await logSystemAction(
            'PETTY_CASH_RECEIPT_VERIFY',
            'PettyCash',
            id,
            `เปลี่ยนสถานะรับเอกสารต้นฉบับเป็น: ${hasReceived ? 'ได้รับ' : 'ยังไม่ได้รับ'} (PC: ${updated.request_number})`,
            (authContext.session.user as any).p_id || (authContext.session.user as any).id,
            maskPII.name(authContext.session.user.name)
        );

        return { success: true, data: updated };
    } catch (error) {
        console.error('Error verifying receipt:', error);
        return { success: false, error: 'Failed to verify receipt' };
    }
}

// Ensure the request by ID also converts values cleanly
export async function getPettyCashRequestById(id: number) {
    try {
        const authContext = await getPettyCashAuthContext();
        if (!authContext?.session?.user) return { success: false, error: 'Unauthorized' };

        const request = await prisma.tbl_petty_cash.findUnique({
            where: { id },
        });

        if (!request) return { success: false, error: 'Not found' };

        if (!canViewPettyCashRequest(authContext.role, authContext.permissions, {
            currentUserName: authContext.session.user.name,
            ownerName: request.requested_by,
            isApprover: authContext.isApprover,
        })) {
            return { success: false, error: 'Permission denied' };
        }

        return {
            success: true,
            data: {
                ...request,
                requested_amount: Number(request.requested_amount),
                dispensed_amount: request.dispensed_amount ? Number(request.dispensed_amount) : null,
                actual_spent: request.actual_spent ? Number(request.actual_spent) : null,
                change_returned: request.change_returned ? Number(request.change_returned) : null,
            }
        };
    } catch (error) {
        console.error('Error getting request:', error);
        return { success: false, error: 'Failed to get record' };
    }
}

export async function savePettyCashSignatures(id: number, payeeSignature?: string, payerSignature?: string) {
    try {
        const authContext = await getPettyCashAuthContext();
        if (!authContext?.session?.user) {
            return { success: false, error: 'Unauthorized' };
        }

        const dataToUpdate: any = {};
        if (payeeSignature !== undefined) dataToUpdate.payee_signature = payeeSignature;
        if (payerSignature !== undefined) dataToUpdate.payer_signature = payerSignature;

        if (Object.keys(dataToUpdate).length === 0) {
            return { success: true, message: 'Nothing to update' };
        }

        const currentRequest = await prisma.tbl_petty_cash.findUnique({
            where: { id },
            select: {
                request_number: true,
                requested_by: true,
            },
        });

        if (!currentRequest) {
            return { success: false, error: 'Not found' };
        }

        if (!canViewPettyCashRequest(authContext.role, authContext.permissions, {
            currentUserName: authContext.session.user.name,
            ownerName: currentRequest.requested_by,
            isApprover: authContext.isApprover,
        })) {
            return { success: false, error: 'Permission denied' };
        }

        const request = await prisma.tbl_petty_cash.update({
            where: { id },
            data: dataToUpdate
        });

        revalidatePath('/petty-cash');
        revalidatePath(`/petty-cash/${id}/print`);

        await logSystemAction(
            'PETTY_CASH_SIGNATURE_SAVE',
            'PettyCash',
            id,
            `บันทึกลายเซ็น ${payeeSignature ? '[ผู้รับเงิน]' : ''} ${payerSignature ? '[ผู้จ่ายเงิน]' : ''} (PC: ${request.request_number})`,
            (authContext.session.user as any).p_id || (authContext.session.user as any).id,
            maskPII.name(authContext.session.user.name)
        );

        return { success: true, data: request };

    } catch (error) {
        console.error('Error saving signatures:', error);
        return { success: false, error: 'Failed to save signatures' };
    }
}
