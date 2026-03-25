#!/bin/bash
# ===========================================
# Stock Movement Pro - QNAP Deployment Script
# ===========================================

echo "=========================================="
echo "  Stock Movement Pro - QNAP Installer"
echo "=========================================="
echo ""

# Check if running on QNAP
if [ ! -d "/share" ]; then
    echo "[ERROR] This script must be run on QNAP NAS"
    exit 1
fi

# Variables
APP_DIR="/share/Public/stock-movement"
DB_NAME="stock_db"
DB_USER="stockuser"
DB_PASS="stockpass123"

echo "[INFO] Creating application directory..."
mkdir -p $APP_DIR

echo "[INFO] Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "[WARNING] Node.js not found!"
    echo "[INFO] Please install Node.js via Entware:"
    echo "       opkg update && opkg install node node-npm"
    exit 1
fi

echo "[INFO] Node.js version: $(node -v)"
echo "[INFO] npm version: $(npm -v)"

# Check if project files exist
if [ ! -f "$APP_DIR/package.json" ]; then
    echo "[ERROR] Project files not found in $APP_DIR"
    echo "[INFO] Please upload project files first:"
    echo "       - Use File Station to upload to $APP_DIR"
    echo "       - Or use SCP: scp -r ./* admin@QNAP_IP:$APP_DIR/"
    exit 1
fi

# Navigate to app directory
cd $APP_DIR

# Create .env if not exists
if [ ! -f ".env" ]; then
    echo "[INFO] Creating .env file..."
    cat > .env << EOF
DATABASE_URL="mysql://$DB_USER:$DB_PASS@localhost:3306/$DB_NAME"
AUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://$(hostname -I | awk '{print $1}'):3000"
EOF
    echo "[INFO] .env file created"
fi

echo "[INFO] Installing dependencies..."
npm install --production

echo "[INFO] Generating Prisma client..."
npx prisma generate

echo "[INFO] Applying database migrations..."
npx prisma migrate deploy

echo "[INFO] Building application..."
npm run build

echo ""
echo "=========================================="
echo "  Installation Complete!"
echo "=========================================="
echo ""
echo "To start the application, run:"
echo "  cd $APP_DIR && npm run start"
echo ""
echo "Or use the start script:"
echo "  $APP_DIR/start.sh"
echo ""
echo "Access the application at:"
echo "  http://$(hostname -I | awk '{print $1}'):3000"
echo ""

# Create start script
cat > $APP_DIR/start.sh << 'EOF'
#!/bin/bash
cd /share/Public/stock-movement
echo "Starting Stock Movement Pro..."
npm run start
EOF

chmod +x $APP_DIR/start.sh

echo "[INFO] Start script created: $APP_DIR/start.sh"
