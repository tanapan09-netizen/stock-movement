# Stock Movement Pro - คู่มือการติดตั้ง

## 📋 ความต้องการของระบบ

| ซอฟต์แวร์ | เวอร์ชัน |
|-----------|---------|
| Node.js | 18.x หรือสูงกว่า |
| MySQL | 8.0 หรือ MariaDB 10.x |
| npm | 9.x หรือสูงกว่า |

--

## 🚀 ขั้นตอนการติดตั้ง

### 1. คัดลอกโฟลเดอร์โปรเจค

คัดลอกโฟลเดอร์ `stock-movement-next` ทั้งหมดไปยังเครื่องใหม่

```
C:\xampp\htdocs\stock_movement\stock-movement-next\
```

### 2. สร้างฐานข้อมูล

```sql
CREATE DATABASE stock_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. นำเข้าข้อมูล

```bash
mysql -u root -p stock_db < stock_db_backup.sql
```

หรือใช้ phpMyAdmin:
1. เปิด http://localhost/phpmyadmin
2. เลือก database `stock_db`
3. ไปที่ Import → เลือกไฟล์ `stock_db_backup.sql`

### 4. ตั้งค่า Environment

สร้างไฟล์ `.env` ในโฟลเดอร์โปรเจค:

```env
# Database
DATABASE_URL="mysql://root:@localhost:3306/stock_db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-change-in-production"

# Optional - สำหรับ Production
# DATABASE_URL="mysql://username:password@host:3306/stock_db"
```

### 5. ติดตั้ง Dependencies

```bash
cd stock-movement-next
npm install
```

### 6. Generate Prisma Client

```bash
npx prisma generate
```

### 7. Build และ Start

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm run start
```

---

## 🔧 การตั้งค่าเพิ่มเติม

### เปลี่ยน Port

แก้ไขใน `package.json`:
```json
"start": "next start -p 8080"
```

### ตั้งค่า HTTPS (Production)

ใช้ reverse proxy เช่น Nginx หรือ Apache

### เปลี่ยน Database Host

แก้ไข `DATABASE_URL` ใน `.env`:
```env
DATABASE_URL="mysql://user:password@192.168.1.100:3306/stock_db"
```

---

## 📁 โครงสร้างไฟล์สำคัญ

```
stock-movement-next/
├── .env                    # ตั้งค่า environment
├── .next/                  # Build output
├── prisma/
│   └── schema.prisma       # Database schema
├── src/
│   ├── app/                # Next.js pages
│   ├── components/         # React components
│   └── lib/                # Utilities
├── stock_db_backup.sql     # Database backup
└── package.json
```

---

## 👤 ข้อมูล Login เริ่มต้น

| Username | Password | Role |
|----------|----------|------|
| admin | admin | Admin |

> ⚠️ **สำคัญ:** เปลี่ยนรหัสผ่านหลังจากติดตั้งเสร็จ

---

## 🛠 การแก้ปัญหาเบื้องต้น

### Error: Cannot connect to database

1. ตรวจสอบว่า MySQL ทำงานอยู่
2. ตรวจสอบ DATABASE_URL ใน `.env`
3. ตรวจสอบ firewall

### Error: Port 3000 in use

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# หรือเปลี่ยน port ใน package.json
```

### Thai characters show as ???

ตรวจสอบว่า database ใช้ `utf8mb4`:
```sql
ALTER DATABASE stock_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## 📞 ข้อมูลติดต่อ

สร้างโดย: Stock Movement Pro Team
เวอร์ชัน: 1.0.0
วันที่: 2024-12-30
