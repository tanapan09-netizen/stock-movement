'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createMaintenanceRequest } from './maintenanceActions';

// --- PM Plans CRUD ---

export async function getPmPlans() {
    try {
        const plans = await prisma.tbl_pm_plans.findMany({
            include: {
                tbl_rooms: true
            },
            orderBy: { created_at: 'desc' }
        });
        return { success: true, data: plans };
    } catch (error) {
        console.error('Error fetching PM plans:', error);
        return { success: false, error: 'Failed to fetch PM plans' };
    }
}

export async function createPmPlan(data: {
    title: string;
    description?: string;
    room_id: number;
    frequency_type: string;
    interval: number;
    assigned_to?: string;
    next_run_date: Date;
}) {
    try {
        const plan = await prisma.tbl_pm_plans.create({
            data: {
                title: data.title,
                description: data.description,
                room_id: data.room_id,
                frequency_type: data.frequency_type,
                interval: data.interval,
                assigned_to: data.assigned_to,
                next_run_date: data.next_run_date
            }
        });
        revalidatePath('/maintenance/pm');
        return { success: true, data: plan };
    } catch (error) {
        console.error('Error creating PM plan:', error);
        return { success: false, error: 'Failed to create PM plan' };
    }
}

export async function updatePmPlan(pm_id: number, data: any) {
    try {
        const plan = await prisma.tbl_pm_plans.update({
            where: { pm_id },
            data
        });
        revalidatePath('/maintenance/pm');
        return { success: true, data: plan };
    } catch (error) {
        console.error('Error updating PM plan:', error);
        return { success: false, error: 'Failed to update PM plan' };
    }
}

export async function deletePmPlan(pm_id: number) {
    try {
        await prisma.tbl_pm_plans.delete({
            where: { pm_id }
        });
        revalidatePath('/maintenance/pm');
        return { success: true };
    } catch (error) {
        console.error('Error deleting PM plan:', error);
        return { success: false, error: 'Failed to delete PM plan' };
    }
}

// --- Generate Tasks Logic ---

export async function generatePmTasks() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find due plans
        const duePlans = await prisma.tbl_pm_plans.findMany({
            where: {
                active: true,
                next_run_date: { lte: today }
            },
            include: { tbl_rooms: true }
        });

        console.log(`Found ${duePlans.length} due PM plans.`);

        let generatedCount = 0;

        for (const plan of duePlans) {
            // Create Maintenance Request
            // Create Maintenance Request
            const formData = new FormData();
            formData.append('room_id', plan.room_id.toString());
            formData.append('title', `[PM] ${plan.title}`);
            formData.append('description', plan.description || 'Auto-generated Preventive Maintenance Task');
            formData.append('priority', 'normal');
            formData.append('reported_by', 'System (PM)');
            if (plan.assigned_to) {
                formData.append('assigned_to', plan.assigned_to);
            }
            formData.append('scheduled_date', new Date().toISOString());

            await createMaintenanceRequest(formData);

            // Calculate next run date
            const nextDate = new Date(plan.next_run_date);
            if (plan.frequency_type === 'daily') nextDate.setDate(nextDate.getDate() + plan.interval);
            if (plan.frequency_type === 'weekly') nextDate.setDate(nextDate.getDate() + (plan.interval * 7));
            if (plan.frequency_type === 'monthly') nextDate.setMonth(nextDate.getMonth() + plan.interval);
            if (plan.frequency_type === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + plan.interval);

            // Update Plan
            await prisma.tbl_pm_plans.update({
                where: { pm_id: plan.pm_id },
                data: {
                    last_generated: new Date(),
                    next_run_date: nextDate
                }
            });

            generatedCount++;
        }

        revalidatePath('/maintenance');
        revalidatePath('/maintenance/pm');
        return { success: true, count: generatedCount };

    } catch (error) {
        console.error('Error generating PM tasks:', error);
        return { success: false, error: 'Failed to generate tasks' };
    }
}
