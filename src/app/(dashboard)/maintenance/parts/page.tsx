import { auth } from '@/auth';
import {
    canConfirmMaintenanceDefectiveReceipt,
    canDirectManageMaintenanceStock,
    canManageMaintenanceParts,
    isMaintenanceTechnician,
} from '@/lib/rbac';
import { getUserPermissionContext } from '@/lib/server/permission-service';
import PartsManagementClient from './PartsManagementClient';

export const metadata = {
    title: 'จัดการอะไหล่งานซ่อม | Stock Movement',
    description: 'เบิกและคืนอะไหล่สำหรับงานซ่อม'
};

export default async function PartsManagementPage() {
    const session = await auth();
    const permissionContext = await getUserPermissionContext(session?.user);

    return (
        <PartsManagementClient
            canManageParts={
                canManageMaintenanceParts(
                    permissionContext.role,
                    permissionContext.permissions,
                ) || isMaintenanceTechnician(permissionContext.role)
            }
            canDirectStockActions={canDirectManageMaintenanceStock(
                permissionContext.role,
                permissionContext.permissions,
            )}
            canConfirmDefectiveReceipt={canConfirmMaintenanceDefectiveReceipt(
                permissionContext.role,
                permissionContext.permissions,
            )}
        />
    );
}
