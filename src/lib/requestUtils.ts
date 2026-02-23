
import { PrismaClient } from '@prisma/client';

// Use a specific Prisma Client instance or pass it in. 
// Assuming effective singleton usage from @/lib/prisma
import { prisma } from '@/lib/prisma';

/**
 * Generates a formatted Purchase Request Number.
 * Format: [CATEGORY]-[YY]-[SEQ]
 * Example: MNT-24-001
 * 
 * @param category The category code (e.g., 'MNT', 'OFF')
 * @returns The generated request number string
 */
export async function generatePurchaseRequestNumber(category: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const shortYear = year.toString().slice(-2);

    // Define the start and end of the current year
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year + 1, 0, 1);

    // Count existing requests for this category in the current year
    // Note: This is a simple count and might have concurrency issues in high-traffic,
    // but sufficient for this CMMS scale. A more robust solution would use a sequence table.
    const count = await prisma.tbl_part_requests.count({
        where: {
            category: category,
            created_at: {
                gte: startOfYear,
                lt: endOfYear
            }
        }
    });

    const sequence = count + 1;
    const paddedSequence = sequence.toString().padStart(3, '0');

    return `${category}-${shortYear}-${paddedSequence}`;
}
