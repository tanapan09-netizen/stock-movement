
# Deployment Guide (Docker)

This guide explains how to deploy the Stock Movement application using Docker.

## Prerequisites
- Docker Desktop installed and running.
- Existing MySQL database (e.g., XAMPP) or enable the db service in docker-compose.yml.

## Configuration

1.  **Environment Variables**:
    Variables are loaded from `.env` and passed to the container via `docker-compose.yml`.
    
    *   **Database URL**:
        *   Host (XAMPP): `mysql://user:pass@host.docker.internal:3306/db_name`
        *   Container: `mysql://user:pass@db:3306/db_name`

2.  **Network**:
    `host.docker.internal` allows the container to access services running on your Windows host (like XAMPP MySQL).

## Setup & Run

1.  **Build and Start**:
    ```powershell
    docker-compose up -d --build
    ```

2.  **Access App**:
    Go to [http://localhost:3000](http://localhost:3000)

3.  **Stop App**:
    ```powershell
    docker-compose down
    ```

## Files
-   `Dockerfile`: Multi-stage build for Next.js (Standalone).
-   `docker-compose.yml`: Service definition and env mapping.
