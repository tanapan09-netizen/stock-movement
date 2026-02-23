# Deployment Guide for Stock Movement App (Next.js)

This guide explains how to move and set up the Stock Movement Application on a new machine.

## Prerequisites (New Machine)
1.  **Node.js**: Install Node.js (LTS version recommended, v18+). [Download Here](https://nodejs.org/)
2.  **MySQL Database**: Install MySQL Server or XAMPP.
3.  **Git** (Optional): If you plan to clone the repo, otherwise you can just copy files.

## Step-by-Step Migration

### 1. Copy Files
Copy the entire `stock-movement-next` folder to the new machine.
> **Note:** You can skip the `node_modules` folder and `.next` folder to save time/space. They will be recreated.

### 2. Restore Database
The backup file is located at `public/stock_db_backup.sql` inside the project folder.

**Using Command Line:**
```bash
mysql -u root -p stock_db < public/stock_db_backup.sql
```
(You may need to create the database `stock_db` first: `CREATE DATABASE stock_db;`)

**Using phpMyAdmin (XAMPP):**
1.  Open phpMyAdmin.
2.  Create a new database named `stock_db`.
3.  Go to "Import".
4.  Select the `stock_db_backup.sql` file.
5.  Click "Go".

### 3. Configure Environment
Check the `.env` file in the project root.
```env
DATABASE_URL="mysql://root:@localhost:3306/stock_db"
AUTH_SECRET="your-secret-key"
```
Update the `DATABASE_URL` if your MySQL password or port is different on the new machine.

### 4. Install Dependencies
Open a terminal (Command Prompt or PowerShell) inside the `stock-movement-next` folder.
Run:
```bash
npm install
```

### 5. Generate Database Client
Run:
```bash
npx prisma generate
```

### 6. Build and Run
**For Production (Recommended):**
```bash
npm run build
npm start
```
The app will start at `http://localhost:3000`.

**For Development:**
```bash
npm run dev
```

## Troubleshooting
- **Images not showing?** Ensure the `public/uploads` folder contains your image files.
- **Database error?** Check if MySQL service is running and the credentials in `.env` are correct.
