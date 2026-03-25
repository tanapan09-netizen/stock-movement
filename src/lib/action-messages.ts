export const COMMON_ACTION_MESSAGES = {
    unauthorized: 'ไม่มีสิทธิ์ใช้งาน',
    unknownUser: 'ไม่ทราบผู้ใช้งาน',
    systemUser: 'ระบบ',
    unknownSource: 'ไม่ทราบที่มา',
    invalidInput: 'ข้อมูลไม่ถูกต้อง',
    adminOnly: 'อนุญาตเฉพาะผู้ดูแลระบบ',
    unexpectedError: 'เกิดข้อผิดพลาดที่ไม่คาดไว้',
} as const;

export const LINE_CUSTOMER_ACTION_MESSAGES = {
    requireLineUserId: 'กรุณาระบุ LINE User ID',
    requireFullName: 'กรุณาระบุชื่อ-นามสกุล',
    requirePhoneNumber: 'กรุณาระบุเบอร์โทร',
    registerFailed: 'ไม่สามารถบันทึกข้อมูลลูกค้าได้',
    loadCustomerFailed: 'ไม่สามารถโหลดข้อมูลลูกค้าได้',
    loadCustomersFailed: 'ไม่สามารถโหลดรายการลูกค้า LINE ได้',
    updateFailed: 'ไม่สามารถแก้ไขข้อมูลลูกค้าได้',
    toggleStatusFailed: 'ไม่สามารถเปลี่ยนสถานะลูกค้าได้',
    deleteFailed: 'ไม่สามารถลบลูกค้าได้',
    updatedLogPrefix: 'อัปเดตข้อมูลลูกค้า LINE:',
    activatedLog: 'เปิดใช้งานลูกค้า LINE',
    deactivatedLog: 'ปิดใช้งานลูกค้า LINE',
    deletedLog: 'ลบลูกค้า LINE',
} as const;

export const MOVEMENT_ACTION_MESSAGES = {
    invalidInput: 'ข้อมูลไม่ถูกต้อง',
    productNotFound: 'ไม่พบสินค้า',
    insufficientStock: (currentStock: number) => `สินค้าคงเหลือไม่เพียงพอ (มี ${currentStock})`,
    adjustFailed: 'ปรับสต็อกไม่สำเร็จ',
    invalidMovementId: 'รหัสรายการเคลื่อนไหวไม่ถูกต้อง',
    movementNotFound: 'ไม่พบรายการเคลื่อนไหว',
    deleteFailed: 'ลบรายการเคลื่อนไหวไม่สำเร็จ',
    updateFailed: 'อัปเดตรายการเคลื่อนไหวไม่สำเร็จ',
    loadFailed: 'โหลดข้อมูลไม่สำเร็จ',
} as const;
