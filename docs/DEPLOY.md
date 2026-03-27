# Stock Movement Pro - Deployment Guide

## 🚀 Deployment Options

| Method | ความยาก | เหมาะกับ |
|--------|--------|---------|
| **NPM Start** | ง่าย | ทดสอบ |
| **PM2** | ปานกลาง | Production (Windows/Linux) |
| **Docker** | ปานกลาง | Production (ทุก Platform) |

---

## 📦 Prerequisites

- Node.js 18+
- MySQL (XAMPP หรือ Docker)
- Database `stock_movement`

---

## 1️⃣ Quick Start (Development)

```bash
cd C:\xampp\htdocs\stock_movement\stock-movement-next
npm run dev
```

---

## 2️⃣ Production with NPM

```bash
# Build
npm run build

# Start
npm run start
```

หรือ double-click: `start-production.bat`

---

## 3️⃣ Production with PM2 (แนะนำ)

### ติดตั้ง PM2

```bash
npm install -g pm2
```

### Start Application

```bash
# ใช้ ecosystem config
pm2 start ecosystem.config.js

# หรือ start แบบ simple
pm2 start npm --name "stock-movement" -- start
```

### จัดการ PM2

```bash
# ดูสถานะ
pm2 status

# ดู logs
pm2 logs stock-movement

# Restart
pm2 restart stock-movement

# Stop
pm2 stop stock-movement

# Delete
pm2 delete stock-movement
```

### Auto-start เมื่อ Windows Reboot

```bash
# บันทึก process list
pm2 save

# สร้าง Windows Service
npm install -g pm2-windows-startup
pm2-startup install
```

### Alternative: NSSM (Windows Service)

1. Download NSSM: https://nssm.cc
2. Run: `nssm install StockMovement`
3. Path: `C:\Program Files\nodejs\node.exe`
4. Arguments: `C:\xampp\htdocs\stock_movement\stock-movement-next\node_modules\.bin\next start`
5. Startup directory: `C:\xampp\htdocs\stock_movement\stock-movement-next`

---

## 4️⃣ Docker Deployment

### Prerequisites

- Docker Desktop installed
- Docker Compose available

### Option A: ใช้ XAMPP MySQL (แนะนำ)

```bash
# Build image
docker build -t stock-movement .

# Run container (ใช้ host network เชื่อมต่อ XAMPP MySQL)
docker run -d \
  --name stock-movement-app \
  -p 3000:3000 \
  -e DATABASE_URL="mysql://root:@host.docker.internal:3306/stock_movement" \
  -e NEXTAUTH_URL="http://localhost:3000" \
  -e NEXTAUTH_SECRET="your-secret-key" \
  stock-movement
```

### Option B: Docker Compose (App + MySQL)

```bash
# สร้าง .env file
echo "NEXTAUTH_SECRET=your-super-secret-key" > .env
echo "MYSQL_ROOT_PASSWORD=root" >> .env

# Start services
docker-compose up -d

# ดู logs
docker-compose logs -f

# Stop
docker-compose down
```

### Docker Commands

```bash
# Check status
docker ps

# View logs
docker logs stock-movement-app

# Stop container
docker stop stock-movement-app

# Remove container
docker rm stock-movement-app

# Rebuild after code changes
docker build -t stock-movement . --no-cache
docker stop stock-movement-app && docker rm stock-movement-app
docker run -d --name stock-movement-app -p 3000:3000 stock-movement
```

---

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL connection string | `mysql://root:@localhost:3306/stock_movement` |
| `NEXTAUTH_URL` | Public URL | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Auth secret (ต้องเปลี่ยน!) | - |
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port | `3000` |

---

## 🔒 Production Checklist

- [ ] เปลี่ยน `NEXTAUTH_SECRET` เป็นค่าที่ปลอดภัย
- [ ] ตั้งค่า HTTPS (ใช้ Nginx/Cloudflare)
- [ ] ตั้งค่า Firewall
- [ ] Backup database ประจำ
- [ ] ตั้งค่า Log rotation
- [ ] Set up monitoring (PM2/Docker healthcheck)

---

## 🆘 Troubleshooting

### Port 3000 in use
```bash
# ใช้ port อื่น
npm run start -- -p 3001
# หรือ
pm2 start ecosystem.config.js --env production -- -p 3001
```

### Database connection failed
- ตรวจสอบ XAMPP MySQL running
- ตรวจสอบ DATABASE_URL

### Build failed
```bash
# ล้าง cache
rd /s /q .next
npm run build
```

### Docker: Cannot connect to MySQL
```bash
# ใช้ host.docker.internal แทน localhost
DATABASE_URL="mysql://root:@host.docker.internal:3306/stock_movement"
```
