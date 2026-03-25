# Stock Movement Management System

A comprehensive stock management and maintenance tracking system built with Next.js, Prisma, and Tailwind CSS.

## Features

### Phase 1: Core Stock Management
- **Product Management**: CRUD for products, categories, suppliers.
- **Stock Operations**: Stock In, Stock Out, Adjustments.
- **Warehouse Management**: Support for multiple warehouses (WH-01 Main, WH-02 Sub, WH-03 Reserved, etc.).
- **User Management**: Role-based access control (Admin, Manager, Operation, Technician, Employee).

### Phase 2: Maintenance & Withdrawal
- **Maintenance Requests**: Create and track maintenance jobs.
- **Part Withdrawal**: Techs can withdraw parts for specific jobs (reserving stock in WH-03).
- **Technician Dashboard**: Mobile-optimized view for technicians to manage jobs.
- **Line Notifications**: Alerts for new requests and stock warnings.

### Phase 3: Verification & Reporting
- **Usage Confirmation**: Techs confirm actual parts used vs withdrawn.
- **Store Verification**: Store managers verify returned/used parts (Flow: WH-03 -> WH-02/WH-08).
- **Reports**: comprehensive dashboard for cost analysis, technician performance, and inventory value.

### Phase 4: Advanced Features
- **Preventive Maintenance (PM)**: Scheduled maintenance plans with auto-task generation.
- **Quotation Management**: Attach quotes (PDF/Image/URL) to part requests.
- **Low Stock Alerts**: Automated warnings when stock falls below safety levels.

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone ...
    cd StockMovement
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Setup Environment Variables:**
    Copy `.env.example` to `.env` and fill in your details.
    ```bash
    cp .env.example .env
    ```

4.  **Database Setup:**
    Ensure MySQL is running and `DATABASE_URL` is correct.
    ```bash
    # Local development
    npx prisma migrate dev

    # Deployed environment / existing migration history
    # npx prisma migrate deploy
    ```

5.  **Run Development Server:**
    ```bash
    npm run dev
    ```

6.  **Open Browser:**
    Navigate to [http://localhost:3000](http://localhost:3000).

## Default Login

-   **Admin**: `admin` / (See system administrator for password or check `auth.ts` logic)
-   **Demo Users**: You may seed default users via `npx prisma db seed`.

## Tech Stack

-   **Framework**: Next.js 14 (App Router)
-   **Database**: MySQL
-   **ORM**: Prisma
-   **Styling**: Tailwind CSS
-   **Auth**: NextAuth.js (v5)
-   **Charts**: Recharts

## License

Internal Use Only.
