'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function getPettyCashFundStatus() {
    try {
        const session = await auth();
        if (!session?.user) {
            throw new Error('Unauthorized');
        }

        // Try to get the active fund
        let fund = await prisma.tbl_petty_cash_fund.findFirst({
            where: { status: 'active' },
            orderBy: { id: 'desc' }
        });

        // Initialize if doesn't exist
        if (!fund) {
            fund = await prisma.tbl_petty_cash_fund.create({
                data: {
                    fund_name: 'Main Petty Cash Fund',
                    max_limit: 10000, // Default 10K THB
                    current_balance: 10000,
                    warning_threshold: 2000, // Warn at 20%
                    status: 'active'
                }
            });
        }

        const serializedFund = {
            ...fund,
            max_limit: Number(fund.max_limit),
            current_balance: Number(fund.current_balance),
            warning_threshold: Number(fund.warning_threshold),
        };

        return { success: true, data: serializedFund };
    } catch (error: any) {
        console.error('Error fetching fund status:', error);
        return { success: false, error: error.message };
    }
}

export async function replenishFund(amount: number) {
    try {
        const session = await auth();
        if (!session?.user) {
            throw new Error('Unauthorized');
        }

        if (session.user.role !== 'admin' && session.user.role !== 'accounting') {
            throw new Error('Permission denied');
        }

        const fund = await prisma.tbl_petty_cash_fund.findFirst({
            where: { status: 'active' }
        });

        if (!fund) {
            throw new Error('Active fund not found');
        }

        const updatedFund = await prisma.tbl_petty_cash_fund.update({
            where: { id: fund.id },
            data: {
                current_balance: Number(fund.current_balance) + amount,
                last_replenished_at: new Date(),
                replenished_by: String((session.user as any).username || session.user.name || 'System')
            }
        });

        const serializedFund = {
            ...updatedFund,
            max_limit: Number(updatedFund.max_limit),
            current_balance: Number(updatedFund.current_balance),
            warning_threshold: Number(updatedFund.warning_threshold),
        };

        return { success: true, data: serializedFund };
    } catch (error: any) {
        console.error('Error replenishing fund:', error);
        return { success: false, error: error.message };
    }
}

export async function adjustFundBalance(fundId: number, adjustment: number) {
    // Internal use for dispensing / returning change
    try {
        const fund = await prisma.tbl_petty_cash_fund.findUnique({
            where: { id: fundId }
        });

        if (!fund) throw new Error('Fund not found');

        const newBalance = Number(fund.current_balance) + adjustment;

        await prisma.tbl_petty_cash_fund.update({
            where: { id: fundId },
            data: { current_balance: newBalance }
        });

        return { success: true };
    } catch (error: any) {
        console.error('Fund adjustment error:', error);
        return { success: false, error: error.message };
    }
}

export async function updateFundLimit(newLimit: number) {
    try {
        const session = await auth();
        if (!session?.user) {
            throw new Error('Unauthorized');
        }

        // Only Admin/Director can change the max limit directly
        if (session.user.role !== 'admin' && session.user.role !== 'director') {
            throw new Error('Permission denied: Only Admin or Director can adjust the petty cash fund limit.');
        }

        if (newLimit <= 0) {
            throw new Error('Invalid limit amount');
        }

        const fund = await prisma.tbl_petty_cash_fund.findFirst({
            where: { status: 'active' }
        });

        if (!fund) {
            throw new Error('Active fund not found');
        }

        // Also update the warning threshold automatically (e.g. 20% of new limit)
        const newWarningThreshold = newLimit * 0.2;

        const updatedFund = await prisma.tbl_petty_cash_fund.update({
            where: { id: fund.id },
            data: {
                max_limit: newLimit,
                warning_threshold: newWarningThreshold
            }
        });

        const serializedFund = {
            ...updatedFund,
            max_limit: Number(updatedFund.max_limit),
            current_balance: Number(updatedFund.current_balance),
            warning_threshold: Number(updatedFund.warning_threshold),
        };

        return { success: true, data: serializedFund };
    } catch (error: any) {
        console.error('Error updating fund limit:', error);
        return { success: false, error: error.message };
    }
}
