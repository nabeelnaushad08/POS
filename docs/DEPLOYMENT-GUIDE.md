# Zenthoz POS System — Deployment & Installation Guide

> **Version 2.0** | Built by Zenthoz Technologies | Contact: 0779067747

---

## Table of Contents

1. [System Requirements](#1-system-requirements)
2. [Deployment Option A — Vercel (Recommended)](#2-deployment-option-a--vercel-recommended)
3. [Deployment Option B — VPS / Linux Server](#3-deployment-option-b--vps--linux-server)
4. [Deployment Option C — Hostinger / cPanel Hosting](#4-deployment-option-c--hostinger--cpanel-hosting)
5. [Database Setup](#5-database-setup)
6. [First-Run Setup Wizard](#6-first-run-setup-wizard)
7. [Print Agent Installation](#7-print-agent-installation)
8. [Going Live Checklist](#8-going-live-checklist)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. System Requirements

### Server-Side (where the POS app runs)
| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Node.js | 18.x | 20.x LTS |
| RAM | 512 MB | 1 GB+ |
| Storage | 1 GB | 5 GB+ |
| Database | MySQL 8.0+ | MySQL 8.0+ |

### Client-Side (browser used to access POS)
- Modern browser: Chrome 100+, Edge 100+, Firefox 100+, Safari 16+
- Screen resolution: 1280×720 minimum (1920×1080 recommended for POS)
- For printing: Chrome is strongly recommended

### Printer (optional)
- ESC/POS compatible thermal printer (58mm or 80mm paper)
- Connected via USB or Network (TCP port 9100)
- Windows PC or Mac/Linux running the Print Agent

---

## 2. Deployment Option A — Vercel (Recommended)

Vercel is the easiest and most reliable way to deploy this system. It handles SSL, CDN, auto-scaling, and zero-downtime deployments automatically.

### Step 1: Create Accounts

1. Create a free account at [vercel.com](https://vercel.com)
2. Create a free account at [railway.app](https://railway.app) (for MySQL database)
   - OR use your client's existing MySQL from Hostinger/cPanel

### Step 2: Set Up the Database

**Option 1 — Railway MySQL (simplest for new setups):**
1. Log in to Railway → New Project → Add MySQL
2. Click on the MySQL service → Connect tab
3. Copy the `DATABASE_URL` (format: `mysql://user:pass@host:port/railway`)

**Option 2 — Hostinger MySQL:**
1. Log in to hPanel → Databases → MySQL Databases
2. Create a new database and user
3. Note: host, database name, username, password
4. DATABASE_URL format: `mysql://USERNAME:PASSWORD@HOST:3306/DBNAME`

**Option 3 — Supabase PostgreSQL:**
> Note: Requires changing `provider = "postgresql"` in `prisma/schema.prisma` and removing MySQL-specific `@db.Decimal` annotations. Contact Zenthoz for a PostgreSQL-ready build.

### Step 3: Deploy to Vercel

1. Push the code to your GitHub repository (or fork `nabeelnaushad08/POS`)
2. Go to [vercel.com/new](https://vercel.com/new) → Import Git Repository
3. Select the repository

### Step 4: Configure Environment Variables

In Vercel → Project → Settings → Environment Variables, add:

```
DATABASE_URL          = mysql://user:pass@host:3306/dbname
NEXTAUTH_SECRET       = [generate: openssl rand -base64 32]
NEXTAUTH_URL          = https://yourdomain.com
ZENTHOZ_MASTER_PASSWORD = [your internal master password]
```

### Step 5: Add Custom Domain

1. Vercel → Project → Settings → Domains
2. Add your client's domain (e.g., `pos.clientshop.com`)
3. Update their DNS: Add a CNAME record pointing to `cname.vercel-dns.com`
4. SSL certificate is automatically provisioned

### Step 6: Trigger First Deploy

Click "Deploy" in Vercel. The build process will:
1. Install dependencies
2. Run `prisma db push` to create all database tables automatically
3. Build the Next.js app
4. Deploy globally

### Step 7: Activate License

1. Visit `https://yourdomain.com/setup`
2. Follow the setup wizard (database check → license activation → create admin)
3. Generate the license key using: `POST /api/admin/generate-license` with the master password and client's domain

---

## 3. Deployment Option B — VPS / Linux Server

For clients who want full server control (DigitalOcean, Linode, AWS EC2, Hetzner, etc.)

### Step 1: Prepare the Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Install nginx (reverse proxy)
sudo apt install -y nginx

# Install certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

### Step 2: Upload the Application

```bash
# On your local machine, build the production bundle
npm run build

# Upload to server (or use Git)
git clone https://github.com/YOUR_REPO/pos.git /var/www/pos
cd /var/www/pos
npm install --production
```

### Step 3: Configure Environment

```bash
# Create environment file
sudo nano /var/www/pos/.env.local
```

Add:
```
DATABASE_URL=mysql://user:pass@localhost:3306/pos_db
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=https://yourdomain.com
ZENTHOZ_MASTER_PASSWORD=your-master-password
```

### Step 4: Set Up Database

```bash
# Install MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Create database
mysql -u root -p
CREATE DATABASE pos_db CHARACTER SET utf8mb4;
CREATE USER 'pos_user'@'localhost' IDENTIFIED BY 'strong_password';
GRANT ALL ON pos_db.* TO 'pos_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Run Prisma migrations
cd /var/www/pos
npx prisma db push
```

### Step 5: Start with PM2

```bash
cd /var/www/pos
pm2 start npm --name "pos-app" -- start
pm2 startup   # Follow the displayed command to enable auto-start
pm2 save
```

### Step 6: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/pos
```

```nginx
server {
    server_name yourdomain.com www.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/pos /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Step 7: Activate License

Visit `https://yourdomain.com/setup` and follow the wizard.

---

## 4. Deployment Option C — Hostinger / cPanel Hosting

> **Important:** Traditional shared hosting (cPanel) does NOT support Node.js applications natively. You need Hostinger's **Business** plan or higher which includes Node.js hosting, OR use their VPS.

### Hostinger VPS (recommended)

Follow the VPS guide above (Option B). Hostinger VPS comes with Ubuntu.

### Hostinger Business Hosting with Node.js

1. Log in to hPanel
2. Go to **Websites** → your domain → **Node.js**
3. Set **Node.js version**: 20.x
4. Set **Application root**: `/public_html/pos`
5. Set **Application URL**: your domain
6. Set **Application startup file**: `server.js` (or the Next.js server entry)
7. Upload files via File Manager or FTP
8. Add environment variables in hPanel → Node.js → Environment Variables
9. Click **Start**

---

## 5. Database Setup

### Supported Database Types

| Database | Provider | Notes |
|----------|----------|-------|
| MySQL 8.0+ | Hostinger, Railway, local | Default, fully supported |
| MySQL 5.7 | Some shared hosts | Mostly works, decimal precision differs |
| PostgreSQL | Supabase, Neon | Requires schema change (contact Zenthoz) |

### Database URL Formats

```
# MySQL (local)
mysql://root:password@localhost:3306/pos_database

# MySQL (Hostinger)
mysql://u123456789_pos:MyPassword@srv123.hstgr.io:3306/u123456789_pos

# Railway MySQL
mysql://root:AbCdEfGh@roundhouse.proxy.rlwy.net:12345/railway

# Supabase (PostgreSQL — requires schema change)
postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres
```

### Creating Tables

Tables are created automatically when:
- **Vercel**: During build process (`prisma db push` runs automatically)
- **VPS**: Run `npx prisma db push` manually after setting DATABASE_URL
- **First-run wizard**: If detected as uninitialized, the setup wizard guides through this

---

## 6. First-Run Setup Wizard

When you first visit a newly deployed POS system, you'll see the setup wizard at `/setup`.

### Step 1: Database Check
The wizard checks if the database is connected and tables exist. If there's an issue, it shows the error and guidance.

### Step 2: License Activation
Enter the license key provided by Zenthoz Technologies.

**For Zenthoz staff — generating a license key:**
```bash
curl -X POST https://yourdomain.com/api/admin/generate-license \
  -H "Content-Type: application/json" \
  -d '{"domain": "clientdomain.com", "masterPassword": "YOUR_MASTER_PASSWORD"}'
```

The response contains the `licenseKey` to give to the client.

### Step 3: Create Admin Account
Create the first administrator account for the client. This is the owner/manager login.

### After Setup
- The system is ready to use
- Log in at `/login`
- Go to Settings to configure shop name, currency, printers, etc.

---

## 7. Print Agent Installation

The Print Agent is a small program that runs on the same PC as the receipt printer. It bridges the browser-based POS system to the physical printer.

### Prerequisites
- Node.js 18+ installed on the PC with the printer
- Download the `print-agent/` folder from the repository

### First-Time Installation

```bash
cd print-agent
npm install
```

### Option A: Windows Service (Runs on boot, always on)

1. Right-click `install-service.bat` → **Run as Administrator**
2. The service "POS Print Agent" will be installed and start automatically
3. To verify: Open `services.msc` → look for "POS Print Agent"
4. To uninstall: Run `uninstall-service.bat` as Administrator

### Option B: PM2 (Cross-platform, works on Windows/Mac/Linux)

**Windows:**
```
Double-click setup-pm2.bat
```

**Mac/Linux:**
```bash
bash setup-pm2.sh
```

Follow the instructions shown (one additional command needed for Linux to enable auto-start).

### Option C: Manual Start (Testing only)
```bash
cd print-agent
npm start
```

### Configuring the Printer

After the Print Agent is running:
1. Open the POS system in browser
2. Go to **Settings** → **Printer Setup**
3. For Network Printer: Enter the printer's IP address
4. For USB Printer: Select from the dropdown list
5. Click **Test Print** to verify

### Accessing from Different Devices

The print agent runs on `http://127.0.0.1:3001` (localhost only). If you need to print from a different computer, the Print Agent must be running on the PC connected to the printer. The POS browser must be on that same PC.

---

## 8. Going Live Checklist

Before handing over to the client, verify each item:

### Technical Setup
- [ ] App is deployed and accessible at the client's domain
- [ ] SSL certificate is active (https://)
- [ ] Database is connected and all tables are created
- [ ] License is activated (setup wizard completed)
- [ ] Admin account is created

### Configuration (via Settings page)
- [ ] Shop name, logo uploaded
- [ ] Currency set correctly (LKR, USD, etc.)
- [ ] Tax rate configured
- [ ] Address and phone number entered
- [ ] Timezone set correctly

### Printer Setup
- [ ] Print Agent installed on the cashier PC
- [ ] Print Agent configured (IP or USB printer selected)
- [ ] Test print successful
- [ ] Cash drawer opens correctly (if applicable)
- [ ] KOT printing tested (if restaurant mode)

### Data Setup
- [ ] Categories created
- [ ] Products/inventory added (or imported)
- [ ] Suppliers added
- [ ] Staff user accounts created with correct roles

### Final Testing
- [ ] Complete a test sale end-to-end
- [ ] Receipt prints correctly
- [ ] Barcode scanner works (if applicable)
- [ ] Reports are generating

---

## 9. Troubleshooting

### App won't start / 500 errors
- Check DATABASE_URL is correct
- Check NEXTAUTH_SECRET is set
- Check `npx prisma db push` was run
- Check Node.js version (needs 18+)

### Database connection failed
- Verify the host, port, username, password
- Check firewall rules (port 3306 must be accessible from the app server)
- For Railway: check if the project is active (free tier pauses after inactivity)

### License activation fails
- Double-check the domain matches exactly (no www prefix needed)
- Key is case-insensitive but format must be `ZPOS-XXXX-XXXX-XXXX-XXXX`
- Contact Zenthoz if the key doesn't work

### Printer shows "offline"
- Ensure Print Agent is running (`http://localhost:3001` in browser shows status)
- Verify printer IP has not changed (check printer settings menu)
- For USB: ensure printer driver is installed on the PC
- Try "Test Print" button in Settings

### Barcodes not scanning
- Ensure product has a barcode/SKU set
- Code128 barcodes work with all standard USB scanners
- If using a smartphone scanner app, ensure adequate lighting

### Images not loading after deploy
- Check Next.js `remotePatterns` in `next.config.ts`
- Large images (logos) are stored as base64 in DB — no external URL needed

---

*For technical support, contact Zenthoz Technologies: 0779067747*
