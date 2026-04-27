
import LineUserClient from './LineUserClient';

export const metadata = {
    title: 'LINE ภายใน (ผู้ใช้ผ่าน QR) | Stock Movement',
    description: 'จัดการผู้ใช้ LINE ภายในองค์กรที่เพิ่มผ่าน QR Code และสิทธิ์การแจ้งเตือน',
};

export default function LineUsersPage() {
    return <LineUserClient />;
}
