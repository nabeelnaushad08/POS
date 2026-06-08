#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Zenthoz POS — Client Deployment Package Builder
# Usage: bash scripts/package-for-client.sh clientname
#
# Creates a ready-to-upload ZIP: dist/zenthoz-pos-<clientname>.zip
# ─────────────────────────────────────────────────────────────────────────────
set -e

CLIENT="${1:-client}"
OUT_DIR="dist"
PACKAGE_NAME="zenthoz-pos-${CLIENT}"
PACKAGE_DIR="${OUT_DIR}/${PACKAGE_NAME}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Zenthoz POS — Packaging for: ${CLIENT}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Build the Next.js app (standalone output)
echo "[1/4] Building Next.js app (standalone)..."
NEXT_BUILD_STANDALONE=1 npm run build

# 2. Create package directory
echo "[2/4] Assembling package..."
rm -rf "${PACKAGE_DIR}"
mkdir -p "${PACKAGE_DIR}/app"

# Copy standalone output
cp -r .next/standalone/. "${PACKAGE_DIR}/app/"
cp -r .next/static        "${PACKAGE_DIR}/app/.next/static"
cp -r public              "${PACKAGE_DIR}/app/public"

# Copy prisma schema (needed for db push on server)
cp -r prisma              "${PACKAGE_DIR}/prisma"

# Copy print-agent
cp -r print-agent         "${PACKAGE_DIR}/print-agent"

# Copy env template
cp .env.example           "${PACKAGE_DIR}/.env.example"

# Copy docs
cp -r docs                "${PACKAGE_DIR}/docs"

# 3. Write a quick-start README into the package
cat > "${PACKAGE_DIR}/QUICK-START.txt" << 'EOF'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Zenthoz POS — Quick Deployment Steps
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Upload the "app" folder to your server (e.g., /var/www/pos)

2. Create /var/www/pos/.env.local with:
     DATABASE_URL=mysql://user:pass@host:3306/dbname
     NEXTAUTH_SECRET=<random 32-char string>
     NEXTAUTH_URL=https://yourdomain.com
     ZENTHOZ_MASTER_PASSWORD=<your password>

3. Run database setup (one time):
     cd /var/www/pos
     npx prisma db push --schema=../prisma/schema.prisma

4. Start the app with PM2:
     pm2 start app/server.js --name pos-app -i max
     pm2 save && pm2 startup

5. Start the Print Agent (on the PC with the printer):
     cd print-agent
     npm install
     (Windows) double-click install-service.bat as Administrator
     (Mac/Linux) bash setup-pm2.sh

6. Open https://yourdomain.com/setup in browser
   - Enter the license key provided by Zenthoz
   - Create admin account

Support: Zenthoz Technologies — 0779067747
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF

# 4. ZIP it up
echo "[3/4] Creating ZIP archive..."
mkdir -p "${OUT_DIR}"
(cd "${OUT_DIR}" && zip -r "${PACKAGE_NAME}.zip" "${PACKAGE_NAME}" -x "*.DS_Store" -x "__MACOSX/*")

echo "[4/4] Cleaning up temp folder..."
rm -rf "${PACKAGE_DIR}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Done!  →  ${OUT_DIR}/${PACKAGE_NAME}.zip"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
