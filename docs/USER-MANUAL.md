# Zenthoz POS System — Complete User Manual

> **Version 2.0** | Built by Zenthoz Technologies | 0779067747

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard Overview](#2-dashboard-overview)
3. [Point of Sale (POS)](#3-point-of-sale-pos)
4. [Inventory Management](#4-inventory-management)
5. [Barcode Management](#5-barcode-management)
6. [Categories](#6-categories)
7. [Customers](#7-customers)
8. [Sales History](#8-sales-history)
9. [Suppliers](#9-suppliers)
10. [Purchases](#10-purchases)
11. [Employees](#11-employees)
12. [Business Reports](#12-business-reports)
13. [Financial Management](#13-financial-management)
14. [Settings](#14-settings)
15. [User Roles & Permissions](#15-user-roles--permissions)
16. [Keyboard Shortcuts](#16-keyboard-shortcuts)

---

## 1. Getting Started

### Logging In

1. Open your browser and go to your POS system URL (e.g., `https://pos.yourshop.com`)
2. Enter your email and password
3. Click **Sign In**

> If this is the first time the system is used, you'll see the **Setup Wizard** instead. Follow the on-screen steps to activate the license and create the first admin account.

### User Roles

| Role | Access Level |
|------|-------------|
| **Admin** | Full access to everything |
| **Manager** | Everything except user management and system settings |
| **Cashier** | POS only (no reports, no inventory management) |

---

## 2. Dashboard Overview

The dashboard shows a real-time summary of your business:

- **Today's Sales** — Total revenue for the current day
- **Today's Transactions** — Number of sales completed today
- **Low Stock Alerts** — Products running below minimum stock level
- **Recent Sales** — Last 5-10 sales made

### Navigation Sidebar

The sidebar on the left contains all main sections. Click the **collapse arrow** at the bottom to minimize it to icon-only mode (useful on smaller screens).

---

## 3. Point of Sale (POS)

The POS is the main screen cashiers use for making sales.

### Starting a Sale

1. Click **POS** in the sidebar
2. Browse or search for products in the product grid (right side)
3. Click a product to add it to the cart (left panel)

### Product Grid

- Products are displayed in a 5-column grid with images
- **Green border** = already in cart
- **"LOW" badge** = stock is running low
- **"OUT OF STOCK"** = cannot be added
- The quantity in cart is shown as a blue badge on the product

### Managing the Cart

| Action | How |
|--------|-----|
| Add product | Click the product card |
| Increase quantity | Click **+** button |
| Decrease quantity | Click **−** button |
| Type exact quantity | Click the quantity number and type |
| Remove item | Decrease quantity to 0 |
| Clear cart | Click the trash icon |

### Search & Filter Products

- Use the search bar to find products by name, SKU, or barcode
- Use the category dropdown to filter by category

### Barcode Scanner

If you have a USB barcode scanner:
1. Click the **Barcode Scanner** toggle button to enable scanner mode
2. A green indicator shows it's active
3. Scan any product barcode — it adds the product to cart automatically
4. A beep sound confirms the scan

### Discounts

1. In the cart, click the discount field
2. Enter discount amount (in your currency)
3. The total updates automatically

### Checkout / Payment

1. Click **Pay** button (or press `Enter` after all items are added)
2. The checkout panel opens showing the total
3. Select payment method:
   - **Cash** — Enter cash amount received; change is calculated automatically
   - **Card** — Full amount charged to card
   - **Mixed** — Part cash, part card (enter both amounts)
4. Enter customer name (optional)
5. Click **Confirm Payment**

What happens next:
- Receipt prints automatically (if printer is configured)
- Cash drawer opens (if connected and cash payment)
- KOT (Kitchen Order Ticket) prints if KOT mode is enabled (restaurant use)
- Inventory stock is reduced

### Hold / Resume Sales

- Click **Hold** to save the current cart for later
- Access held sales from the Hold button (shows a badge with count)
- Note: Currently only one hold is supported

---

## 4. Inventory Management

### Viewing Products

Go to **Inventory** in the sidebar. Products are displayed in a searchable, sortable table.

Columns shown: Name, SKU, Barcode, Category, Cost Price, Selling Price, Stock, Min Stock, Status

### Adding a New Product

1. Click **Add Product** button
2. Fill in:
   - **Name** (required)
   - **SKU** — Stock Keeping Unit, e.g., `PROD-001` (required, must be unique)
   - **Barcode** — Leave blank to auto-assign, or enter an existing barcode
   - **Category** — Select from your categories
   - **Cost Price** — What you paid for it
   - **Selling Price** — What you sell it for
   - **Current Stock** — How many units you have
   - **Minimum Stock** — Alert threshold (when to reorder)
   - **Unit** — pcs, kg, litre, box, etc.
   - **Image** — Upload a product photo (optional)
3. Click **Save**

### Editing a Product

1. Click the **Edit** (pencil) icon next to the product
2. Update any fields
3. Click **Save**

### Stock Adjustments

To manually adjust stock (received new shipment without a purchase order, damaged goods, etc.):
1. Click the product to edit
2. Update the stock number
3. Save

For proper inventory tracking, use **Purchases** to record supplier orders (this automatically increases stock).

### Importing Products (CSV)

1. Click **Import** button
2. Download the sample CSV template
3. Fill in your products
4. Upload the filled CSV
5. Review and confirm

### Low Stock Alerts

Products at or below minimum stock show:
- **Orange "LOW STOCK"** badge in inventory list
- Warning on the dashboard
- **"LOW"** badge on POS product cards

---

## 5. Barcode Management

The barcode page lets you generate, print, and download professional Code128 barcodes for your products.

### Viewing Barcodes

Go to **Barcodes** in the sidebar. All products are listed with their barcodes displayed.

### Generating Barcodes for Products

If a product doesn't have a barcode yet:
1. Click **Auto-Assign Barcodes** button
2. The system assigns the product's SKU as its barcode
3. Barcodes are immediately scannable

### Printing Barcode Labels

1. Select products by checking their checkboxes (or click **Select All**)
2. Set how many copies per product (1–20)
3. Click **Print Selected**
4. A print-optimized layout opens — print with your label printer

### Downloading Barcode Images

Each product barcode has a **Download PNG** button. Click it to save the barcode as a high-resolution PNG image.

Use cases for downloaded barcodes:
- Design custom product labels
- Attach to product packaging templates
- Send to supplier for labeling

### Barcode Format

All barcodes are **Code128** format — the international standard used worldwide:
- Works with all USB barcode scanners
- Works with smartphone barcode scanner apps
- Accepted by all major logistics/retail systems
- Supports alphanumeric characters (letters, numbers, hyphens)

---

## 6. Categories

Categories help organize your products.

### Adding a Category

1. Go to **Categories** in the sidebar
2. Click **Add Category**
3. Enter name and (optional) color/icon
4. Save

Categories appear in:
- Inventory product form dropdown
- POS filter dropdown
- Reports (sales by category)

---

## 7. Customers

Track your repeat customers for receipts and loyalty purposes.

### Adding a Customer

1. Go to **Customers**
2. Click **Add Customer**
3. Enter: Name, Phone, Email, Address (all optional except name)
4. Save

### Using a Customer in a Sale

In the POS checkout panel:
1. Type the customer name in the **Customer Name** field
2. (Optional) Enter their phone number
3. The name appears on the printed receipt

### Customer Credit

Track credit given to customers:
1. Go to the customer record
2. Add credit transactions (amount given, amount paid back)
3. Outstanding balance is tracked automatically

---

## 8. Sales History

View all completed sales.

1. Go to **Sales** in the sidebar
2. Search by date range, customer name, or invoice number
3. Click any sale to view the full receipt

### Reprinting a Receipt

1. Open the sale record
2. Click **Reprint Receipt**
3. The receipt prints via the Print Agent

### Refunds

Currently, refunds are handled by:
1. Recording a note on the sale
2. Manually adjusting inventory stock
3. Recording the refund amount in expenses (Financial Management)

---

## 9. Suppliers

Manage your product suppliers.

### Adding a Supplier

1. Go to **Suppliers**
2. Click **Add Supplier**
3. Enter: Company name, contact person, phone, email, address
4. Save

### Supplier Payments

Track how much you owe each supplier:
1. Open a supplier record
2. View their purchase history and outstanding balance
3. Record payments when made

---

## 10. Purchases

Record stock received from suppliers (creates purchase orders / GRNs).

### Recording a Purchase

1. Go to **Purchases**
2. Click **New Purchase**
3. Select the supplier
4. Add products and quantities received
5. Enter unit cost price for each item
6. Set total amount and amount paid
7. Save

Stock levels are automatically increased when a purchase is saved.

### Purchase History

View all past purchases, filter by supplier or date range.

---

## 11. Employees

Manage your staff profiles, attendance, payroll, and performance.

### Adding an Employee

1. Go to **Employees**
2. Click **Add Employee**
3. Fill in: Full name, job title, department, phone, email, basic salary
4. An Employee ID is auto-generated (EMP-0001 format)
5. Save

### Employee Detail Page

Click an employee to view their full profile with 4 tabs:

**Profile Tab**
- Personal information
- Employment details
- Contact information

**Attendance Tab**
- Mark daily attendance: Present, Absent, Half Day, Leave
- Monthly attendance calendar view
- Automatic working days count

**Payroll Tab**
- Monthly salary calculation
- Allowances and deductions
- Net salary computation
- Payroll history

**Performance Tab**
- Add performance notes, warnings, or commendations
- Track performance history

---

## 12. Business Reports

Comprehensive reporting for informed business decisions.

### Accessing Reports

Go to **Reports** in the sidebar.

### Report Types

**Sales Reports**
- **Sales Overview** — Total revenue, discount, tax breakdown by date range
- **Sales by Cashier** — Performance per staff member
- **Sales by Product** — Which products sell most
- **Sales by Category** — Revenue per category
- **Discount Report** — All discounts given

**Inventory Reports**
- **Current Stock** — Full stock listing with value
- **Low Stock** — Products below minimum level
- **Out of Stock** — Products with zero stock
- **Stock Valuation** — Total inventory value (cost and retail)

**Profit Reports**
- **Gross Profit** — Revenue minus COGS by period
- **Net Profit** — After expenses
- **Product Profitability** — Which products make the most profit

### Date Range Selection

Use the date pickers or quick presets:
- Today / This Week / This Month / Last Month / This Year

### Commission Calculator

Enter a commission percentage — the report automatically calculates the commission amount on the total sales figure.

### Exporting Reports

- **CSV/Excel** — Download as spreadsheet for further analysis
- **Print/PDF** — Print-optimized layout

---

## 13. Financial Management

Advanced financial tracking for business owners.

Access from **Finance** in the sidebar, or via the **Owner Financial Dashboard** banner on the Reports page.

### Owner Dashboard

The main finance dashboard shows:

**KPI Cards (12 metrics)**
- Total Revenue, Gross Profit, Net Profit, Profit Margin %
- Total Expenses, Payroll Expenses, Custom Expenses
- Inventory Value, Total Assets, Total Investments
- Outstanding Payables (to suppliers), Receivables (from customers)

**Charts**
- Line chart: Revenue vs Expenses trend (last 30 days)
- Pie chart: Expense breakdown by category

**Business Position**
- Total Assets vs Total Liabilities
- Net business worth calculation

**Auto-Insights**
- Automatic alerts: low profit margin, high expenses, supplier balances due
- Success indicators: strong margin, good performance

### Expense Management

Track all business expenses:
1. Go to **Finance** → **Expenses**
2. Click **Add Expense**
3. Enter: Title, amount, category, date, payment method, reference
4. 13 default categories are pre-loaded: Rent, Electricity, Salaries, Transport, etc.
5. Attach receipt image (optional)

### Investment Tracking

Record business investments:
1. Go to **Finance** → **Investments**
2. Click **Add Investment**
3. Enter: Title, type (initial capital, equipment, expansion), amount, date
4. View total investment over time

### Asset Register

Track all business assets:
1. Go to **Finance** → **Assets**
2. Click **Add Asset**
3. Enter: Name, type (equipment, vehicle, property), purchase cost, current value, purchase date
4. Track depreciation (current value vs purchase cost)

### Financial Reports

Go to **Finance** → **Reports** for:
- **Profit & Loss Statement** — Full income vs expense comparison
- **Cash Flow Report** — Money in and money out
- **Expense Report** — Detailed expense analysis
- **Investment Report** — Investment summary
- **Asset Register** — Complete asset list

All reports export to PDF or Excel.

---

## 14. Settings

> Only accessible to **Admin** role.

Go to **Settings** in the sidebar.

### General Settings

| Setting | Description |
|---------|-------------|
| System Name | Your shop/business name (appears on receipts) |
| Logo | Upload your business logo (appears on receipt top) |
| Currency | Select your currency (LKR, USD, EUR, etc.) |
| Currency Symbol | How the symbol appears (Rs., $, €) |
| Timezone | Your local timezone |
| Tax Rate | GST/VAT percentage (0 for no tax) |
| Theme | Light or dark mode |

### Contact Information

- Address (appears on receipts)
- Phone number
- WhatsApp number
- Email

### Receipt Customization

| Setting | Description |
|---------|-------------|
| Slogan | A tagline shown below the shop name |
| Receipt Note | Message printed at the bottom (e.g., return policy) |
| Thank You Line 1 | First thank-you message |
| Thank You Line 2 | Second thank-you message |

### Printer Setup

1. **Enable Printer** toggle — turn receipt printing on/off
2. **Printer Type**:
   - **Network** — Thermal printer connected to your Wi-Fi/LAN
   - **USB** — Printer connected to the same PC via USB
3. For Network: enter the printer's IP address
4. For USB: select from the detected printers list
5. **Paper Width** — 48 chars (58mm paper) or 56 chars (80mm paper)
6. Click **Scan Network** to auto-detect printers on your LAN
7. Click **Test Print** to verify

**KOT Printing** (Kitchen Order Ticket)
- Enable to print a second ticket to the kitchen for restaurant use

### Notification Settings

Configure SMS and email alerts for:
- Low stock notifications
- Daily sales summaries

### License & Database

- View current license status (domain, activation date)
- Test database connection
- Re-activate license if needed

---

## 15. User Roles & Permissions

### Role Matrix

| Feature | Admin | Manager | Cashier |
|---------|-------|---------|---------|
| POS / Make Sales | ✅ | ✅ | ✅ |
| View Inventory | ✅ | ✅ | ❌ |
| Edit Products | ✅ | ✅ | ❌ |
| View Sales History | ✅ | ✅ | ❌ |
| Manage Customers | ✅ | ✅ | ✅ |
| View Reports | ✅ | ✅ | ❌ |
| Financial Dashboard | ✅ | ✅ | ❌ |
| Manage Employees | ✅ | ✅ | ❌ |
| Manage Suppliers | ✅ | ✅ | ❌ |
| Record Purchases | ✅ | ✅ | ❌ |
| Barcode Management | ✅ | ✅ | ❌ |
| System Settings | ✅ | ❌ | ❌ |
| User Management | ✅ | ❌ | ❌ |

### Managing Users

**Admin only:**
1. Go to **Users** in sidebar
2. Click **Add User**
3. Enter name, email, role, password
4. Staff can update their own password via the Profile page

---

## 16. Keyboard Shortcuts

### POS Screen

| Shortcut | Action |
|----------|--------|
| Type (any key) | Auto-focuses search bar |
| `Enter` | Confirm payment in checkout |
| `Esc` | Close checkout panel |

### General

| Shortcut | Action |
|----------|--------|
| `Ctrl + S` (or `Cmd + S`) | Save current form |

### Barcode Scanner (when enabled)
- Simply scan the barcode — the product is added automatically
- No keyboard shortcut needed — the scanner sends keystrokes directly

---

## Quick Reference Card for Cashiers

**Making a Sale:**
1. Search or click product → 2. Adjust qty if needed → 3. Click Pay → 4. Enter cash/select card → 5. Confirm

**Using Barcode Scanner:**
1. Click scanner toggle (turns green) → 2. Scan product → 3. Beep confirms → 4. Continue with checkout

**Giving a Discount:**
Cart panel → Click discount field → Type amount → Total updates automatically

**Common Issues:**
- Receipt not printing? → Check if Print Agent is running (open new tab: http://localhost:3001)
- Product not found? → Check spelling or use barcode scanner
- Out of stock? → Product card shows red "OUT OF STOCK" — inform manager to restock

---

*Zenthoz POS System v2.0 — For support: 0779067747*
