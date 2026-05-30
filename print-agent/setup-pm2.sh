#!/bin/bash
# Make this script executable: chmod +x setup-pm2.sh
# Run with: bash setup-pm2.sh

echo "Setting up POS Print Agent with PM2..."
echo ""
echo "Step 1: Installing PM2..."
npm install -g pm2
echo ""
echo "Step 2: Starting print agent..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
pm2 start "$SCRIPT_DIR/index.js" --name "pos-print-agent"
echo ""
echo "Step 3: Saving process list..."
pm2 save
echo ""
echo "Step 4: Setting up system startup..."
pm2 startup
echo ""
echo "Run the command shown above (starting with 'sudo env PATH=...') to enable auto-start."
echo ""
echo "Done!"
