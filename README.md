# POS & Inventory Management System

A production-ready, full-stack **Point of Sale** and **Inventory Management System** built with Next.js 15, Prisma, and NextAuth.

## Features

- **POS System** – Fast product search, cart management, cash/card/mixed payments, receipt printing & PDF
- **Inventory Management** – Full CRUD, bulk CSV import, low-stock alerts, category management
- **Dashboard** – Real-time charts (revenue, top products), daily/weekly/monthly stats
- **Reports** – Sales, profit, and inventory reports with Excel & PDF export
- **User Roles** – Admin, Manager, Cashier with route-level access control
- **Notifications** – Low-stock alerts and daily summaries via Email (Nodemailer) & WhatsApp (Twilio)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), Tailwind CSS, Framer Motion, Recharts |
| UI Components | Radix UI primitives (ShadCN-style) |
| Backend | Next.js API Routes |
| Database | MySQL via Prisma ORM |
| Auth | NextAuth.js v5 (JWT, Credentials) |
| Notifications | Nodemailer + Twilio WhatsApp |

## Quick Start

### 1. Clone & Install

```bash
git clone <repo>
cd POS
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your database and service credentials
```

### 3. Database Setup

```bash
# Push schema to MySQL database
npm run db:push

# Seed demo data (Admin / Manager / Cashier users + sample products)
npm run db:seed
```

### 4. Run Development Server

```bash
npm run dev
# Open http://localhost:3000
```

### 5. Demo Login

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@pos.com | admin123 |
| Manager | manager@pos.com | manager123 |
| Cashier | cashier@pos.com | cashier123 |

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/          # Login page
│   ├── (dashboard)/           # Protected dashboard pages
│   │   ├── dashboard/         # Analytics dashboard
│   │   ├── pos/               # Point of Sale
│   │   ├── inventory/         # Product management
│   │   ├── categories/        # Category management
│   │   ├── reports/           # Reports & exports
│   │   ├── users/             # User management (Admin only)
│   │   ├── notifications/     # Notification center
│   │   └── profile/           # User profile
│   └── api/                   # REST API routes
├── components/
│   ├── ui/                    # Reusable UI primitives
│   ├── layout/                # Sidebar, Header
│   ├── pos/                   # POS-specific components
│   └── inventory/             # Inventory components
├── lib/                       # Prisma, Auth, Email, WhatsApp utils
├── hooks/                     # useCart and other custom hooks
└── types/                     # TypeScript type definitions
prisma/
├── schema.prisma              # Database schema
└── seed.ts                    # Demo data seeder
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect repo in Vercel dashboard
3. Add environment variables
4. Deploy

### Hostinger (VPS/Shared)

1. Build: `npm run build`
2. Copy `.next`, `node_modules`, `package.json`, `prisma` to server
3. Set `NODE_ENV=production` and all env vars
4. Run: `npm start`

## Environment Variables

See `.env.example` for all required variables including:
- `DATABASE_URL` – MySQL connection string
- `NEXTAUTH_SECRET` – Random secret (min 32 chars)
- `SMTP_*` – Email/SMTP credentials
- `TWILIO_*` – WhatsApp notifications via Twilio
