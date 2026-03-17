'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface VehicleData {
    vehicle_id?: number;
    license_plate: string;
    province?: string;
    brand?: string;
    model_name?: string;
    color?: string;
    vehicle_type?: string;
    owner_name?: string;
    owner_room?: string;
    owner_phone?: string;
    parking_slot?: string;
    notes?: string;
    active?: boolean;
}

/** ดึงรายการทะเบียนรถทั้งหมด */
export async function getAllVehicles() {
    const vehicles = await prisma.tbl_vehicles.findMany({
        orderBy: { created_at: 'desc' },
    });
    return vehicles;
}

/** สร้างทะเบียนรถใหม่ */
export async function createVehicle(data: VehicleData) {
    try {
        const existing = await prisma.tbl_vehicles.findUnique({
            where: { license_plate: data.license_plate.trim().toUpperCase() },
        });
        if (existing) {
            return { success: false, error: `ทะเบียน "${data.license_plate}" มีอยู่แล้วในระบบ` };
        }
        const vehicle = await prisma.tbl_vehicles.create({
            data: {
                license_plate: data.license_plate.trim().toUpperCase(),
                province: data.province?.trim() || null,
                brand: data.brand?.trim() || null,
                model_name: data.model_name?.trim() || null,
                color: data.color?.trim() || null,
                vehicle_type: data.vehicle_type?.trim() || null,
                owner_name: data.owner_name?.trim() || null,
                owner_room: data.owner_room?.trim() || null,
                owner_phone: data.owner_phone?.trim() || null,
                parking_slot: data.parking_slot?.trim() || null,
                notes: data.notes?.trim() || null,
                active: data.active ?? true,
            },
        });
        revalidatePath('/admin/rooms');
        return { success: true, vehicle };
    } catch (err) {
        console.error('createVehicle error:', err);
        return { success: false, error: 'ไม่สามารถบันทึกข้อมูลได้' };
    }
}

/** อัปเดตข้อมูลทะเบียนรถ */
export async function updateVehicle(vehicleId: number, data: VehicleData) {
    try {
        const vehicle = await prisma.tbl_vehicles.update({
            where: { vehicle_id: vehicleId },
            data: {
                license_plate: data.license_plate.trim().toUpperCase(),
                province: data.province?.trim() || null,
                brand: data.brand?.trim() || null,
                model_name: data.model_name?.trim() || null,
                color: data.color?.trim() || null,
                vehicle_type: data.vehicle_type?.trim() || null,
                owner_name: data.owner_name?.trim() || null,
                owner_room: data.owner_room?.trim() || null,
                owner_phone: data.owner_phone?.trim() || null,
                parking_slot: data.parking_slot?.trim() || null,
                notes: data.notes?.trim() || null,
                active: data.active ?? true,
                updated_at: new Date(),
            },
        });
        revalidatePath('/admin/rooms');
        return { success: true, vehicle };
    } catch (err) {
        console.error('updateVehicle error:', err);
        return { success: false, error: 'ไม่สามารถอัปเดตข้อมูลได้' };
    }
}

/** ลบทะเบียนรถ */
export async function deleteVehicle(vehicleId: number) {
    try {
        await prisma.tbl_vehicles.delete({
            where: { vehicle_id: vehicleId },
        });
        revalidatePath('/admin/rooms');
        return { success: true };
    } catch (err) {
        console.error('deleteVehicle error:', err);
        return { success: false, error: 'ไม่สามารถลบข้อมูลได้' };
    }
}

/** เปิด/ปิดสถานะ */
export async function toggleVehicleActive(vehicleId: number) {
    try {
        const vehicle = await prisma.tbl_vehicles.findUnique({
            where: { vehicle_id: vehicleId },
        });
        if (!vehicle) return { success: false, error: 'ไม่พบข้อมูล' };
        const updated = await prisma.tbl_vehicles.update({
            where: { vehicle_id: vehicleId },
            data: { active: !vehicle.active, updated_at: new Date() },
        });
        revalidatePath('/admin/rooms');
        return { success: true, vehicle: updated };
    } catch (err) {
        console.error('toggleVehicleActive error:', err);
        return { success: false, error: 'ไม่สามารถเปลี่ยนสถานะได้' };
    }
}
