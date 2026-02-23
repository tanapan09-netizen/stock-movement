#!/bin/bash
# =====================================================
# Stock Movement Pro - Database Backup Script (Linux/Mac)
# =====================================================

# Configuration
BACKUP_DIR="/var/backups/stock_movement"
DB_NAME="stock_movement"
DB_USER="root"
DB_PASS=""
KEEP_DAYS=7

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +"%Y-%m-%d_%H%M")

# Backup filename
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql"

echo "====================================================="
echo " Stock Movement Pro - Database Backup"
echo "====================================================="
echo ""
echo "Database: $DB_NAME"
echo "Backup File: $BACKUP_FILE"
echo ""

# Run mysqldump
echo "Creating backup..."
if [ -z "$DB_PASS" ]; then
    mysqldump -u "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"
else
    mysqldump -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$BACKUP_FILE"
fi

if [ $? -ne 0 ]; then
    echo "ERROR: Backup failed!"
    exit 1
fi

echo "Backup created successfully!"

# Compress backup
echo "Compressing backup..."
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"
echo "Compressed to: $BACKUP_FILE"

# Delete old backups
echo ""
echo "Cleaning up old backups (older than $KEEP_DAYS days)..."
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$KEEP_DAYS -delete
echo "Done!"

echo ""
echo "====================================================="
echo " Backup Complete!"
echo "====================================================="
echo ""
echo "Backup Location: $BACKUP_FILE"
echo ""

# Calculate size
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Backup Size: $SIZE"
