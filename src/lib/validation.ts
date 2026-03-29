import { z } from 'zod';

// Product Validation
export const createProductSchema = z.object({
    p_name: z.string().min(1, 'Product name is required'),
    p_desc: z.string().optional(),
    supplier: z.string().optional(),
    p_sku: z.string().optional(),
    main_category_code: z.string().optional(),
    sub_category_code: z.string().optional(),
    asset_current_location: z.string().optional(),
    model_name: z.string().optional(),
    brand_name: z.string().optional(),
    brand_code: z.string().optional(),
    size: z.string().optional(),
    p_unit: z.string().default('ชิ้น'),
    p_count: z.number().min(0, 'Count must be 0 or more'),
    safety_stock: z.number().min(0, 'Safety stock must be 0 or more'),
    price_unit: z.number().min(0).optional(),
});

// Maintenance Validation
export const createMaintenanceRequestSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional().nullable(),
    room_id: z.number().positive('Room ID is required'),
    assigned_to: z.number().optional().nullable(),
    priority: z.enum(['low', 'medium', 'normal', 'high', 'urgent']).default('low')
});

// Approval Validation
export const createApprovalRequestSchema = z.object({
    request_type: z.enum(['ot', 'leave', 'expense', 'purchase', 'other']),
    reason: z.string().min(1, 'Reason is required'),
    amount: z.number().min(0).optional().nullable(),
    reference_job: z.string().optional().nullable(),
    start_time: z.date().optional().nullable(),
    end_time: z.date().optional().nullable(),
});

// User Validation
export const updateUserSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    email: z.string().email('Invalid email address').optional().nullable(),
    role: z.string().min(1, 'Role is required'),
    line_user_id: z.string().optional().nullable(),
});

/**
 * Validates data against a given Zod schema and throws a structured error if invalid.
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown, schemaName: string = 'Unknown'): T {
    const result = schema.safeParse(data);
    if (!result.success) {
        const errorMessages = result.error.issues.map((err) => err.message).join(', ');
        const fullError = `[${schemaName}] Validation Error: ${errorMessages}`;

        // During Next.js build phase, we might want to log but not crash
        // Detect build phase using DATABASE_URL or process.env.NEXT_PHASE if available
        const isBuildPhase = process.env.DATABASE_URL?.includes('build_placeholder') ||
            process.env.NEXT_PHASE === 'phase-production-build' ||
            process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL;

        if (isBuildPhase) {
            console.error(`🏗️ Build Phase Warning: ${fullError}`);
            // Return data as-is (dangerously cast) to allow build worker to proceed
            return data as T;
        }

        console.error(`❌ Runtime Error: ${fullError}`);
        throw new Error(fullError);
    }
    return result.data;
}
