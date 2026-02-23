# 📦 คู่มือติดตั้ง Stock Movement Pro บน QNAP NAS

## 📋 ข้อกำหนดเบื้องต้น

| รายการ | ขั้นต่ำ | แนะนำ |
|--------|--------|-------|
| **RAM** | 1GB | 2GB+ |
| **พื้นที่ว่าง** | 2GB | 5GB+ |
| **QTS Version** | 4.3+ | 5.0+ |
| **Network** | LAN | LAN |

---

## 🚀 วิธีที่ 1: ติดตั้งผ่าน Container Station (Docker)

### ขั้นตอนที่ 1: เปิด Container Station
1. เปิด **Container Station** จาก QTS Desktop
2. ถ้ายังไม่มี ให้ติดตั้งจาก App Center

### ขั้นตอนที่ 2: สร้าง docker-compose.yml
1. ใน Container Station คลิก **"Create"** > **"Create Application"**
2. ตั้งชื่อ: `stock-movement`
3. วาง YAML ด้านล่าง:

```yaml
version: '3.8'

services:
  app:
    image: node:20-alpine
    container_name: stock-movement
    working_dir: /app
    volumes:
      - /share/Container/stock-movement:/app
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=mysql://root:password@db:3306/stock_db
      - AUTH_SECRET=your-secret-key-here
      - NEXTAUTH_URL=http://YOUR_QNAP_IP:3000
    depends_on:
      - db
    command: sh -c "npm install && npm run build && npm run start"
    restart: unless-stopped

  db:
    image: mysql:8.0
    container_name: stock-movement-db
    environment:
      - MYSQL_ROOT_PASSWORD=password
      - MYSQL_DATABASE=stock_db
    volumes:
      - /share/Container/stock-movement-db:/var/lib/mysql
    ports:
      - "3306:3306"
    restart: unless-stopped
```

### ขั้นตอนที่ 3: Upload โปรเจค
1. ใช้ File Station หรือ WinSCP
2. สร้างโฟลเดอร์: `/share/Container/stock-movement/`
3. Upload ไฟล์โปรเจคทั้งหมด (ยกเว้น `node_modules` และ `.next`)

### ขั้นตอนที่ 4: รัน Container
1. กลับไปที่ Container Station
2. คลิก **"Create"** เพื่อสร้าง Container
3. รอสักครู่ให้ Container เริ่มทำงาน
4. เปิด Browser ไปที่: `http://YOUR_QNAP_IP:3000`

---

## 🛠️ วิธีที่ 2: ติดตั้งแบบ Native (ไม่ใช้ Docker)

### ขั้นตอนที่ 1: ติดตั้ง Packages ที่จำเป็น

1. เปิด **App Center** บน QNAP
2. ติดตั้ง:
   - **Entware** (QPKG)
   - **MariaDB** (หรือใช้ MySQL ภายนอก)

### ขั้นตอนที่ 2: ติดตั้ง Node.js ผ่าน Entware

SSH เข้า QNAP:
```bash
ssh admin@YOUR_QNAP_IP
```

ติดตั้ง Node.js:
```bash
opkg update
opkg install node node-npm
```

### ขั้นตอนที่ 3: Upload โปรเจค

1. สร้างโฟลเดอร์:
```bash
mkdir -p /share/Public/stock-movement
```

2. Upload ไฟล์โปรเจคผ่าน File Station หรือ SCP:
```bash
scp -r ./stock-movement-next/* admin@QNAP_IP:/share/Public/stock-movement/
```

### ขั้นตอนที่ 4: ติดตั้ง Dependencies

```bash
cd /share/Public/stock-movement
npm install
```

### ขั้นตอนที่ 5: ตั้งค่า Environment

```bash
cp .env.example .env
nano .env
```

แก้ไข:
```
DATABASE_URL="mysql://user:password@localhost:3306/stock_db"
AUTH_SECRET="your-random-secret-key"
NEXTAUTH_URL="http://YOUR_QNAP_IP:3000"
```

### ขั้นตอนที่ 6: Build และรัน

```bash
npx prisma generate
npx prisma db push
npm run build
npm run start
```

### ขั้นตอนที่ 7: ตั้งค่า Auto-Start (Optional)

สร้างไฟล์ startup script:
```bash
nano /share/Public/stock-movement/start.sh
```

เนื้อหา:
```bash
#!/bin/bash
cd /share/Public/stock-movement
npm run start
```

เพิ่มสิทธิ์:
```bash
chmod +x /share/Public/stock-movement/start.sh
```

---

## 🔧 การแก้ปัญหาที่พบบ่อย

### ปัญหา: Container ไม่ Start
- ตรวจสอบ Log ใน Container Station
- ลองรันใหม่ด้วย `docker-compose up -d`

### ปัญหา: เชื่อมต่อ Database ไม่ได้
- ตรวจสอบว่า MySQL/MariaDB กำลังทำงาน
- ตรวจสอบ DATABASE_URL ใน .env

### ปัญหา: หน้าเว็บโหลดช้า
- RAM อาจไม่เพียงพอ
- ลองเพิ่ม Swap space

---

## 📞 ต้องการความช่วยเหลือ?

หากพบปัญหา ให้บันทึก:
1. Error message
2. Log จาก Container Station
3. สถานะ Memory/CPU ของ QNAP
