# คู่มือการย้ายระบบไปเครื่องใหม่ (Migration Guide)

เอกสารนี้จะแนะนำขั้นตอนการย้ายระบบ Stock Movement จากเครื่องเดิม ไปยังเครื่อง Server หรือ PC ใหม่

---

## 1. การเตรียมข้อมูลจากเครื่องเดิม (Source Machine)

สิ่งที่คุณต้องนำไปด้วยมี 2 ส่วนหลัก คือ **Code** และ **Database**

### 1.1 สำรองฐานข้อมูล (Database Backup)
เนื่องจากคุณใช้ XAMPP/MySQL บนเครื่อง:
1.  เปิด **phpMyAdmin** (ปกติคือ `http://localhost/phpmyadmin`)
2.  เลือก Database ที่ชื่อ **`stock_db_1`** (หรือชื่อที่คุณใช้งานจริง)
3.  คลิกแท็บ **Export** ด้านบน
4.  เลือก Method: **Quick**
5.  คลิก **Go**
6.  คุณจะได้ไฟล์ `.sql` (เช่น `stock_db_1.sql`) -> **เก็บไฟล์นี้ไว้ให้ดี**

### 1.2 เตรียมไฟล์โปรเจกต์ (Project Files)
เราได้เตรียม Script สำหรับแพ็คไฟล์ให้แล้ว:
1.  ดับเบิ้ลคลิกไฟล์ `prepare_migration.bat` ในโฟลเดอร์โปรเจกต์
2.  โปรแกรมจะทำการ Zip โฟลเดอร์โปรเจกต์ (โดยข้าม `node_modules` ที่ไม่จำเป็น)
3.  คุณจะได้ไฟล์ `stock-movement-backup.zip`

**สรุปสิ่งที่ต้อง copy ไปเครื่องใหม่:**
1.  ไฟล์ Database: `stock_db_1.sql`
2.  ไฟล์โปรเจกต์: `stock-movement-backup.zip`

---

## 2. การติดตั้งบนเครื่องใหม่ (Target Machine)

### 2.1 เตรียมเครื่องใหม่
1.  ติดตั้ง **Docker Desktop** (Download จาก docker.com) และเปิดโปรแกรมทิ้งไว้
2.  ติดตั้ง **Git** (ถ้าต้องการ)
3.  (ถ้าจะใช้ Database เดิม) ติดตั้ง **XAMPP** หรือ **MySQL**
    *   ถ้าใช้ XAMPP: เปิด phpMyAdmin แล้วสร้าง Database ว่างๆ ชื่อ `stock_db_1`
    *   เลือก tab **Import** -> เลือกไฟล์ `stock_db_1.sql` ที่เตรียมมา -> กด **Go**

### 2.2 วางไฟล์โปรเจกต์
1.  สร้างโฟลเดอร์สำหรับโปรเจกต์ เช่น `C:\Projects\stock-movement`
2.  นำไฟล์ `stock-movement-backup.zip` ไปวางและแตกไฟล์ (Extract)

### 2.3 ตั้งค่า Environment
1.  เข้าไปที่โฟลเดอร์ที่แตกไฟล์ออกมา
2.  เปิดไฟล์ `.env` ด้วย Notepad
3.  ตรวจสอบ `DATABASE_URL`:
    *   ถ้าเครื่องใหม่ใช้ XAMPP เหมือนเดิม: `mysql://root:@host.docker.internal:3306/stock_db_1`
    *   **สำคัญ:** ถ้า MySQL เครื่องใหม่มีรหัสผ่าน อย่าลืมใส่รหัสผ่านหลัง `:` (เช่น `root:mypassword@...`)

---

## 3. เริ่มต้นระบบ (Start Up)

1.  เปิด **CMD** หรือ **Terminal** ที่โฟลเดอร์โปรเจกต์
2.  รันคำสั่งเพื่อเริ่มระบบ:
    ```powershell
    docker-compose up -d --build
    ```
3.  รอจนเสร็จสิ้น (อาจนานหน่อยในครั้งแรกเพราะต้อง Download Image ใหม่)
4.  ตรวจสอบสถานะ: `docker-compose ps`

เข้าใช้งานได้ที่: [http://localhost:3000](http://localhost:3000)

---

## 4. ปัญหาที่พบบ่อย

*   **ต่อ Database ไม่ได้**: เช็ค `.env` ว่า IP หรือ `host.docker.internal` ถูกต้องหรือไม่ และ MySQL บนเครื่องใหม่ Start อยู่หรือไม่
*   **รูปภาพหาย**: รูปภาพเก่าจะอยู่ในโฟลเดอร์ `public/uploads` ซึ่งถูก Zip มาด้วยแล้ว หากไม่เจอให้เช็คว่าตอนแตกไฟล์ Zip โฟลเดอร์นี้มาครบหรือไม่
*   **รัน npm ไม่ได้ (SecurityError / PSSecurityException)**:
    *   ถ้าเจอ Error สีแดงเกี่ยวกับ `npm.ps1 cannot be loaded...`
    *   ให้เปิด PowerShell แบบ Administrator แล้วรันคำสั่ง: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` แล้วตอบ `Y`

