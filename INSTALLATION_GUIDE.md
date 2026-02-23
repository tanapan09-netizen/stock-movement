
# คู่มือการติดตั้งและใช้งาน Stock Movement Application (Docker Version)

เอกสารนี้จะอธิบายขั้นตอนการติดตั้งระบบ Stock Movement อย่างละเอียด ตั้งแต่การเตรียมเครื่องมือ ไปจนถึงการเริ่มใช้งานระบบด้วย Docker

---

## 1. สิ่งที่ต้องเตรียม (Prerequisites)

ก่อนเริ่มติดตั้ง โปรดตรวจสอบว่าเครื่องคอมพิวเตอร์ของคุณมีโปรแกรมเหล่านี้:

1.  **Docker Desktop** (สำหรับ Windows/Mac) หรือ **Docker Engine** (สำหรับ Linux)
    *   ดาวน์โหลด: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
    *   *สำคัญ:* หลังติดตั้ง ต้องเปิดโปรแกรม Docker Desktop ทิ้งไว้เสมอขณะใช้งาน

2.  **Git** (ทางเลือก - สำหรับดึงโค้ด)
    *   ดาวน์โหลด: [https://git-scm.com/downloads](https://git-scm.com/downloads)

3.  **Source Code** ของโปรเจกต์นี้
    *   โฟลเดอร์ `stock-movement-next` ที่มีไฟล์ `Dockerfile` และ `docker-compose.yml`

---

## 2. การตั้งค่า Database (MySQL)

ระบบรองรับการเชื่อมต่อฐานข้อมูล 2 รูปแบบ เลือกแบบที่ตรงกับการใช้งานของคุณ:

### ทางเลือก A: ใช้ Database เดิมบนเครื่อง (XAMPP / MySQL Server)
หากคุณมี XAMPP หรือ MySQL รันอยู่บนเครื่อง Windows แล้ว:
1.  ต้องมั่นใจว่า MySQL ทำงานอยู่ (Port 3306)
2.  สร้าง Database ชื่อ `stock_movement` (ถ้ายังไม่มี)
3.  Docker จะเชื่อมต่อผ่าน Host `host.docker.internal`

### ทางเลือก B: ใช้ Docker Container (New Database)
หากต้องการติดตั้ง Database ใหม่แยกเป็น Container:
1.  เปิดไฟล์ `docker-compose.yml`
2.  Uncomment (เอาเครื่องหมาย # ออก) ในส่วนของ `services: db:` ทั้งหมด
3.  ระบบจะสร้าง Database ใหม่ให้เมื่อเริ่มทำงาน

---

## 3. การตั้งค่า Environment Variables

1.  เข้าไปที่โฟลเดอร์โปรเจกต์ `stock-movement-next`
2.  เปิดไฟล์ `.env` (หากไม่มีให้สร้างจาก `.env.example`)
3.  แก้ไขค่าต่างๆ ให้ถูกต้อง:

```env
# การเชื่อมต่อฐานข้อมูล
# กรณีใช้ XAMPP (Host):
DATABASE_URL="mysql://root:@host.docker.internal:3306/stock_movement"
# หมายเหตุ: root คือ user, ส่วนหลัง : คือ password (ถ้าไม่มีให้ว่างไว้)

# กรณีใช้ Docker DB:
# DATABASE_URL="mysql://root:password@db:3306/stock_movement"

# ตั้งค่าความปลอดภัย (สร้างรหัสสุ่มยาวๆ)
NEXTAUTH_SECRET="your-secret-key-change-this"
NEXTAUTH_URL="http://localhost:3000"

# การแจ้งเตือน LINE (Optional)
LINE_NOTIFY_TOKEN="your-line-notify-token"
LINE_CHANNEL_ACCESS_TOKEN="your-channel-access-token"
NEXT_PUBLIC_LINE_NOTIFY_TOKEN="your-public-token"
```

---

## 4. ขั้นตอนการติดตั้งและรัน (Deployment)

1.  เปิด **Command Prompt (cmd)** หรือ **PowerShell** หรือ **Terminal**
2.  เข้าไปยังโฟลเดอร์ของโปรเจกต์:
    ```powershell
    cd path/to/stock-movement-next
    ```
    *(ตัวอย่าง: `cd C:\xampp\htdocs\stock_movement\stock-movement-next`)*

3.  สั่ง Build และ Start ระบบด้วย Docker Compose:
    ```powershell
    docker-compose up -d --build
    ```
    *   `up`: เริ่มการทำงาน
    *   `-d`: รันแบบ Background (ปิดหน้าต่าง Terminal ได้โดย App ไม่ดับ)
    *   `--build`: สั่งให้ Build Image ใหม่ทุกครั้ง (แนะนำให้ใส่ทุกครั้งที่มีการแก้โค้ด)

4.  รอจนกว่าจะเสร็จสิ้น (ครั้งแรกอาจใช้เวลา 5-10 นาที ขึ้นอยู่กับความเร็วอินเทอร์เน็ต)

5.  ตรวจสอบสถานะ:
    ```powershell
    docker-compose ps
    ```
    สถานะควรเป็น `Up`

---

## 5. การอัปเดต Database (Prisma Migration)

เมื่อรันครั้งแรก หรือมีการแก้ไขโครงสร้าง Database (Schema):

ระบบถูกตั้งค่าให้ `npx prisma generate` อัตโนมัติตอน Build แล้ว
แต่หากต้องการ **Push** โครงสร้างตารางลง Database ให้ทำดังนี้:

1.  รันคำสั่งผ่าน Container:
    ```powershell
    docker-compose exec app npx prisma db push
    ```
    *คำสั่งนี้จะสร้าง Table อัตโนมัติตามไฟล์ `prisma/schema.prisma`*

2.  (ทางเลือก) หากต้องการ Seed ข้อมูลเริ่มต้น:
    ```powershell
    docker-compose exec app npx prisma db seed
    ```

---

## 6. การใช้งาน

*   เข้าใช้งานผ่าน Browser: [http://localhost:3000](http://localhost:3000)
*   **Username / Password**: ตามที่มีในฐานข้อมูล หรือสมัครใหม่

### ตำแหน่งไฟล์สำคัญ (Volume Mapping)
*   รูปภาพที่อัปโหลดจะถูกเก็บไว้ที่: `stock-movement-next/public/uploads` บนเครื่องของคุณ (ข้อมูลไม่หายแม้ลบ Container)

---

## 7. คำสั่งที่ใช้บ่อย (Common Commands)

*   **หยุดการทำงาน:**
    ```powershell
    docker-compose down
    ```
*   **ดู Logs (หากระบบมีปัญหา):**
    ```powershell
    docker-compose logs -f
    ```
    *(กด Ctrl+C เพื่อออกจากหน้านี้)*
*   **เข้าใช้งาน Shell ใน Container:**
    ```powershell
    docker-compose exec app sh
    ```

---

## 8. การแก้ไขปัญหาเบื้องต้น (Troubleshooting)

*   **Error: connect ECONNREFUSED 127.0.0.1:3306**
    *   แปลว่า Container ต่อ Database ไม่ได้
    *   ตรวจสอบ `DATABASE_URL` ใน `.env`
    *   หากใช้ XAMPP ให้ใช้ `host.docker.internal` แทน `localhost` หรือ `127.0.0.1`

*   **Error: Table doesn't exist**
    *   ลืมรันคำสั่ง `npx prisma db push` (ดูข้อ 5)

*   **อัปโหลดรูปไม่ได้**
    *   ตรวจสอบว่าโฟลเดอร์ `public/uploads` มีอยู่จริงในเครื่อง Host
