# Docker Deployment Guide for Stock Movement System

## Prerequisites
- Docker Desktop installed and running
- At least 4GB RAM available for Docker

## Quick Start

### 1. Build and Run with Docker Compose

```bash
# Navigate to project directory
cd stock-movement-next

# Build and start all services
docker-compose up -d --build
```

### 2. Initialize Database Schema

After all services are running, initialize the database schema:

```bash
# Run Prisma migration
docker-compose exec app npx prisma db push
```

### 3. Access the Application

| Service | URL |
|---------|-----|
| Web App | http://localhost:3000 |
| phpMyAdmin | http://localhost:8080 |

### Default Login Credentials
- **Username:** admin
- **Password:** admin123

---

## Commands Reference

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
```

### Rebuild Application
```bash
docker-compose up -d --build app
```

### Reset Database (Warning: Deletes all data!)
```bash
docker-compose down -v
docker-compose up -d
```

---

## Configuration

### Environment Variables

Edit `docker-compose.yml` to change:

| Variable | Description | Default |
|----------|-------------|---------|
| `MYSQL_ROOT_PASSWORD` | MySQL root password | rootpassword |
| `MYSQL_DATABASE` | Database name | stock_movement_db |
| `MYSQL_USER` | Database user | stockuser |
| `MYSQL_PASSWORD` | Database password | stockpassword |
| `AUTH_SECRET` | NextAuth secret | your-secret-key-here |
| `NEXTAUTH_URL` | Application URL | http://localhost:3000 |

### Volumes

Data is persisted in Docker volumes:
- `mysql_data` - Database files
- `uploads` - Uploaded images/files

---

## Production Deployment

For production, ensure:

1. **Change all passwords** in `docker-compose.yml`
2. **Set a secure `AUTH_SECRET`** (generate with `openssl rand -base64 32`)
3. **Configure proper backup** for `mysql_data` volume
4. **Set up reverse proxy** (nginx/traefik) with SSL

---

## Troubleshooting

### App won't start
```bash
# Check logs
docker-compose logs app

# Restart services
docker-compose restart app
```

### Database connection error
```bash
# Wait for MySQL to be fully ready
docker-compose logs db

# Ensure db service is healthy
docker-compose ps
```

### Reset everything
```bash
docker-compose down -v --rmi all
docker-compose up -d --build
```
