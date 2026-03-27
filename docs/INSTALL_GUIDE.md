# Stock Movement System - Installation Guide
# คู่มือการติดตั้งระบบจัดการสต็อก

## 📋 ความต้องการของระบบ (System Requirements)

| รายการ | เวอร์ชันขั้นต่ำ | ดาวน์โหลด |
|--------|---------------|-----------|
| Node.js | 18.x หรือสูงกว่า | [nodejs.org](https://nodejs.org/) |
| XAMPP | 8.x (MySQL 8.0+) | [apachefriends.org](https://www.apachefriends.org/) |
| Git | (optional) | [git-scm.com](https://git-scm.com/) |

---

## 🚀 วิธีติดตั้งแบบอัตโนมัติ

1. **คัดลอกโฟลเดอร์ทั้งหมด** ไปยังเครื่องใหม่
2. **เปิด XAMPP Control Panel** และกด **Start** ที่ MySQL
3. **ดับเบิลคลิก** ไฟล์ `install.bat`
4. รอจนติดตั้งเสร็จ แล้วเปิด http://localhost:3000

---

## 📂 วิธีติดตั้งแบบ Manual

### ขั้นตอนที่ 1: ติดตั้ง Dependencies

```powershell
cd stock-movement-next
npm install
```

### ขั้นตอนที่ 2: สร้างฐานข้อมูล

```sql
CREATE DATABASE IF NOT EXISTS stock_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;
```

### ขั้นตอนที่ 3: Import ข้อมูล

```powershell
C:\xampp\mysql\bin\mysql.exe -u root stock_db < backup_stock_db_20251226.sql
```

### ขั้นตอนที่ 4: ตั้งค่าไฟล์ .env

สร้างไฟล์ `.env` ด้วยเนื้อหา:


DATABASE_URL="mysql://root:@localhost:3306/stock_db"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"


### ขั้นตอนที่ 5: Generate Prisma Client

```powershell
npx prisma generate
```

### ขั้นตอนที่ 6: เริ่มใช้งาน

```powershell
npm run dev
```

---

## 🔐 ข้อมูลเข้าสู่ระบบเริ่มต้น

| Username | Password | Role |
|----------|----------|------|
| admin | admin | Admin |

> ⚠️ **คำเตือน:** กรุณาเปลี่ยนรหัสผ่านหลังจากเข้าสู่ระบบครั้งแรก

---

## 📁 โครงสร้างไฟล์สำคัญ

```
stock-movement-next/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── migrations/        # Migration history
├── src/
│   ├── app/              # Next.js pages
│   ├── components/       # React components
│   ├── actions/          # Server actions
│   └── lib/              # Utilities
├── public/
│   └── uploads/          # Uploaded images
├── .env                  # Environment config
├── install.bat           # Auto installer
├── backup_db.bat         # Backup script
├── start_app.bat         # Start server
└── backup_stock_db_*.sql # Database backup
```

---

## 🔧 Scripts ที่มีให้

| ไฟล์ | คำอธิบาย |
|------|---------|
| `install.bat` | ติดตั้งระบบอัตโนมัติ |
| `start_app.bat` | เริ่มต้นเซิร์ฟเวอร์ |
| `backup_db.bat` | สำรองข้อมูลฐานข้อมูล |

---

## ❓ การแก้ไขปัญหา (Troubleshooting)

### MySQL ไม่ทำงาน
- เปิด XAMPP Control Panel
- กด Start ที่ MySQL
- ตรวจสอบว่า Port 3306 ไม่ถูกใช้งาน

### ไม่สามารถเข้าหน้าเว็บได้
- ตรวจสอบว่า `npm run dev` ทำงานอยู่
- เปิด http://localhost:3000

### Login ไม่ได้
- รีเซ็ตรหัสผ่านผ่าน phpMyAdmin:
```sql
UPDATE tbl_users SET password = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy' WHERE username = 'admin';
```
(รหัสผ่านจะเป็น 'admin')

---

## 📞 ติดต่อ

หากพบปัญหาในการติดตั้ง กรุณาติดต่อผู้ดูแลระบบ
