# Morocco Inventory Hub - Application Logic Checklist

## 📋 Table of Contents
1. [Authentication & User Management](#authentication--user-management)
2. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
3. [Company Settings & Branding](#company-settings--branding)
4. [Notifications System](#notifications-system)
5. [Inventory Management](#inventory-management)
6. [Warehouse Management](#warehouse-management)
7. [CRM (Contacts)](#crm-contacts)
8. [Sales Management](#sales-management)
9. [Purchases Management](#purchases-management)
10. [Invoicing](#invoicing)
11. [Treasury Management](#treasury-management)
12. [Stock Tracking](#stock-tracking)
13. [Tax Reports](#tax-reports)
14. [Database Schema](#database-schema)

---

## 🔐 Authentication & User Management

### Login System
- [x] Email/password authentication
- [x] Password hashing (client-side for demo)
- [x] Default admin credentials: `admin@evotech.ma` / `Admin1234`
- [x] Session management with localStorage
- [x] Auto-logout on status change to inactive
- [x] Access revocation notification on login page
- [x] "Forgot Password" link removed (admin manages passwords)

### User Management (Settings → Users & Roles)
- [x] Admin can add new team members
- [x] Admin can set email and password for users
- [x] Admin can edit user details (name, email, password, role, status)
- [x] Admin cannot change their own role/status
- [x] Delete button enabled only if multiple admins exist
- [x] Delete button disabled if only one admin
- [x] Non-admin users (Manager, Accountant, Staff) have view-only access to Users & Roles
- [x] Password updates take effect immediately
- [x] Email updates take effect immediately
- [x] Status change to inactive logs out user immediately
- [x] Cross-tab synchronization for status changes (localStorage events)

### User Roles
- [x] **Admin**: Full system access
- [x] **Manager**: All features except user management (view-only)
- [x] **Accountant**: Dashboard, Reports, Treasury only
- [x] **Staff**: Dashboard, Inventory, Stock Tracking only

---

## 🛡️ Role-Based Access Control (RBAC)

### Route Permissions
- [x] `/` (Dashboard) - All roles
- [x] `/inventory` (All Items) - Admin, Manager, Staff
- [x] `/crm` - Admin, Manager
- [x] `/invoicing` - Admin, Manager
- [x] `/purchases` - Admin, Manager
- [x] `/sales` - Admin, Manager
- [x] `/stock-tracking` - Admin, Manager, Staff
- [x] `/tax-reports` (Report) - Admin, Manager, Accountant
- [x] `/treasury` - Admin, Manager, Accountant
- [x] `/settings` - Admin, Manager (Users & Roles: Admin only)

### UI Element Permissions
- [x] Sidebar navigation filtered by role
- [x] Settings tabs filtered by role
- [x] Users & Roles section: View-only for non-admins
- [x] Action buttons hidden/disabled based on role
- [x] Edit/Delete buttons conditionally rendered

---

## 🏢 Company Settings & Branding

### Company Information (Settings → Company)
- [x] Company name, legal form, contact info
- [x] Moroccan identifiers (ICE, IF, RC, TP, CNSS)
- [x] Address and contact details
- [x] localStorage persistence

### Branding & Logo (Settings → Branding & Logo)
- [x] Company logo upload (Base64 or URL)
- [x] Logo displayed in:
  - Sidebar (company header)
  - Login page (left panel, mobile header, form card)
- [x] Company name displayed in:
  - Sidebar (responsive font sizing)
  - Login page (header, footer copyright)
- [x] Dynamic copyright year
- [x] Fallback to Building2 icon if no logo
- [x] Logo formats supported: PNG, JPG, SVG (Base64 or URL)

### Appearance (Settings → Appearance)
- [x] Theme color selection (Navy, Indigo, Blue, Sky, Teal, Slate, Rose, Cyan, Yellow)
- [x] Active warehouse selection
- [x] Theme persistence in localStorage

---

## 🔔 Notifications System

### Notification Management
- [x] Real-time notification display (bell icon with badge)
- [x] Notification types: Info, Success, Warning, Error
- [x] Mark as read/unread
- [x] Mark all as read
- [x] Delete individual notifications
- [x] Clear all notifications
- [x] Filter by: All, Read, Unread
- [x] Notification actions (clickable URLs)
- [x] Timestamp display (relative time)
- [x] localStorage persistence

### Notification Settings (Settings → Notifications)
- [x] Browser notifications toggle
- [x] Low stock alerts toggle
- [x] Order updates toggle
- [x] Email notifications removed (as requested)

### Notification Context
- [x] Centralized notification state management
- [x] Helper functions for adding notifications
- [x] Cross-component notification support

---

## 📦 Inventory Management

### Product Management
- [x] Product listing with search and filters
- [x] Product creation (SKU, name, description, category, unit, price)
- [x] Product editing
- [x] Product deletion
- [x] Stock quantity management
- [x] Minimum stock alerts
- [x] Product status (in_stock, low_stock, out_of_stock)
- [x] Product images support
- [x] Category-based organization
- [x] Warehouse-specific stock tracking

### Stock Management
- [x] Real-time stock updates
- [x] Low stock warnings
- [x] Stock movement tracking
- [x] Multi-warehouse stock support

---

## 🏭 Warehouse Management

### Warehouse Features
- [x] Multiple warehouse support (Marrakech, Agadir, Ouarzazate)
- [x] Add new warehouses
- [x] Edit warehouse details
- [x] Delete warehouses
- [x] Active warehouse selection
- [x] Warehouse-specific stock views
- [x] Warehouse cash tracking (Treasury integration)

### Warehouse Context
- [x] Centralized warehouse state
- [x] Active warehouse persistence
- [x] Warehouse validation and defaults

---

## 👥 CRM (Contacts)

### Contact Management
- [x] Client and Supplier management
- [x] Contact creation (name, company, email, phone, address)
- [x] Contact editing
- [x] Contact deletion
- [x] Moroccan business identifiers (ICE, IF, RC)
- [x] Contact search and filtering
- [x] Contact selection in documents

### Contact Integration
- [x] Contacts linked to Sales documents
- [x] Contacts linked to Purchase documents
- [x] Contact data auto-population in documents
- [x] Client/Supplier selection in forms

---

## 💰 Sales Management

### Document Types
- [x] **Delivery Notes** (Bon de Livraison)
  - Creation, editing, deletion
  - Status management (drafted, in_transit, delivered)
  - PDF generation
- [x] **Divers**
  - Optional tax calculation (20% TVA)
  - Tax toggle in creation form
  - Same structure as delivery notes
- [x] **Invoices** (Factures)
  - Creation with line items
  - Payment methods (Cash, Check, Bank Transfer)
  - Due date tracking
  - Status management (draft, sent, paid, overdue, cancelled)
  - PDF generation
- [x] **Estimates** (Devis)
  - Creation with line items
  - Status management (draft, sent, accepted, rejected)
  - PDF generation
- [x] **Credit Notes** (Avoirs)
  - Creation and management
  - Status tracking
  - PDF generation
- [x] **Statements** (Relevés)
  - Invoice statistics only (Create Statement removed)
  - Payment tracking
  - Status overview

### Invoice Statistics (Statement Tab)
- [x] Total invoices count
- [x] Paid invoices count
- [x] Unpaid invoices count
- [x] Overdue invoices count
- [x] Total amount statistics
- [x] Payment method breakdown (Cash, Check, Bank Transfer)
- [x] Invoice breakdown table
- [x] Client breakdown table
- [x] Status summary panel
- [x] Payment summary with collection rate

### Sales Features
- [x] Line items with product selection
- [x] Quantity, unit price, total calculations
- [x] Tax calculation (20% TVA) for invoices and estimates
- [x] Optional tax for Divers documents
- [x] Document numbering (format: XXX-MM/YY/NNNN)
- [x] Bulk operations (delete, export)
- [x] Export formats: PDF, Excel, CSV
- [x] Document preview
- [x] Document search and filtering
- [x] Status updates
- [x] Client information integration

---

## 🛒 Purchases Management

### Document Types
- [x] **Purchase Orders** (Commandes)
  - Creation, editing, deletion
  - Status management
  - PDF generation
- [x] **Delivery Notes** (Bon de Livraison)
  - Purchase delivery tracking
- [x] **Purchase Invoices** (Factures d'Achat)
  - Invoice creation with line items
  - Payment methods
  - Due date tracking
  - Status management
  - PDF generation
- [x] **Statements** (Relevés)
  - Purchase invoice statistics only (Create Statement removed)
  - Payment tracking

### Purchase Invoice Statistics (Statement Tab)
- [x] Total purchase invoices count
- [x] Paid invoices count
- [x] Unpaid invoices count
- [x] Overdue invoices count
- [x] Total amount statistics
- [x] Payment method breakdown
- [x] Purchase invoice breakdown table
- [x] Supplier breakdown with paid/unpaid amounts
- [x] Status summary panel
- [x] Payment summary with payment rate

### Purchase Features
- [x] Supplier selection
- [x] Line items with product selection
- [x] Quantity, unit price, total calculations
- [x] Tax calculation (20% TVA)
- [x] Document numbering
- [x] Bulk operations
- [x] Export formats: PDF, Excel, CSV
- [x] Document search and filtering
- [x] Status updates

---

## 🧾 Invoicing

### Document Types
- [x] **Invoices** (Sales)
- [x] **Estimates** (Sales)
- [x] **Purchase Orders**
- [x] **Delivery Notes**
- [x] **Statements**
  - Invoice statistics only (Create Statement removed)

### Invoice Statistics (Statement Tab)
- [x] Total invoices count
- [x] Paid invoices count
- [x] Unpaid invoices count
- [x] Overdue invoices count
- [x] Total amount statistics
- [x] Payment method breakdown
- [x] Invoice breakdown table
- [x] Client breakdown with paid/unpaid amounts
- [x] Status summary panel
- [x] Payment summary with collection rate

---

## 💵 Treasury Management

### Liquidity Snapshot
- [x] Total Bank (sum of all Moroccan bank accounts)
- [x] Total Warehouse Cash (Marrakech, Agadir, Ouarzazate)
- [x] Real-Time Balance: (Current Bank + Sales Cashed) - (Supplier Bills Paid)
- [x] Net Liquidity calculation

### Bank Account Management
- [x] Add new bank accounts
- [x] Bank account list (Attijariwafa Bank, BCP, BMCE, etc.)
- [x] Account name, number, initial balance
- [x] Custom bank option ("Other")
- [x] Balance tracking
- [x] localStorage persistence

### Payment Tracking

#### Sales Payments Tracker
- [x] Invoice number, client, payment method
- [x] Bank, check number, maturity date
- [x] Amount, status, date
- [x] Status: In-Hand, Pending Bank, Cleared
- [x] Actions: Deposit, Clear, View
- [x] Search and filter (status, payment method)
- [x] Status update logic:
  - Deposit: In-Hand → Pending Bank
  - Clear: Pending Bank → Cleared (updates bank balance)

#### Purchase Payments Tracker
- [x] Invoice number, supplier, payment method
- [x] Bank, check number, maturity date
- [x] Amount, status, date
- [x] Status: In-Hand, Pending Bank, Cleared
- [x] Actions: Deposit, Clear, View
- [x] Search and filter (status, payment method)
- [x] Status update logic:
  - Deposit: In-Hand → Pending Bank
  - Clear: Pending Bank → Cleared (updates bank balance)

### Payment Management
- [x] Add Payment dialog
  - Payment type: Sales or Purchase
  - Invoice selection
  - Client/Supplier (dynamic)
  - Amount, payment method
  - Conditional fields (bank, check number, maturity date, warehouse)
  - Notes
- [x] View Payment dialog (full payment details)
- [x] Payment reconciliation with Sales/Purchases pages

### Sales & Purchases Integration
- [x] Recent Sales Inflow section
  - Displays payments from Sales Payments Tracker
  - Status: In-Hand or Pending Bank
  - Shows: Invoice, Client, Date, Amount, Status, Method
  - Statistics: Total Expected Inflow
- [x] Supplier Outflow section
  - Displays payments from Purchase Payments Tracker
  - Status: In-Hand or Pending Bank
  - Shows: Invoice, Supplier, Date, Amount, Status, Method
  - Statistics: Total Upcoming Payments
- [x] Real-Time Balance calculation
- [x] Payment reconciliation functions
  - Mark invoice as paid (updates Sales page)
  - Mark purchase order as settled (updates Purchases page)

### Tax Calculations
- [x] Net TVA Due widget
  - Collected TVA (20% of cashed sales)
  - Recoverable TVA (20% of supplier bills paid)
  - Net TVA Due = Collected - Recoverable
  - Color coding (positive = due, negative = credit)

### Financial Analytics

#### Aging Receivables
- [x] Bar chart showing unpaid invoices
- [x] Grouped by: 0-30, 31-60, 61-90, 90+ days late
- [x] Color-coded by age category

#### Bank Statement
- [x] Combines cleared sales and purchase payments
- [x] Transaction types: Credit (sales), Debit (purchases)
- [x] Running balance calculation
- [x] Date, description, type, amount, balance
- [x] Debit entries in red color
- [x] Shows latest 10 transactions
- [x] Current balance badge in header

#### Cash Flow Trend
- [x] Line chart for last 6 months
- [x] Cash-In vs Cash-Out visualization
- [x] Color scheme: Green (Cash In), Red (Cash Out)
- [x] Monthly aggregation

#### Bank Reconciliation
- [x] Per-bank balance display
- [x] Pending transactions (sales add, purchases subtract)
- [x] Projected balance calculation
- [x] Current balance tracking

### Warehouse Cash
- [x] Cash tracking per warehouse
- [x] Marrakech, Agadir, Ouarzazate
- [x] Auto-update on cash payments
- [x] Total warehouse cash calculation

### Treasury Context
- [x] Centralized treasury state management
- [x] Bank accounts, payments, warehouse cash
- [x] Statistics calculations
- [x] localStorage persistence
- [x] Integration with Sales/Purchases via events

---

## 📊 Stock Tracking

### Features
- [x] Stock movement tracking
- [x] Warehouse-specific stock views
- [x] Stock in/out transactions
- [x] Movement history
- [x] Stock level monitoring

---

## 📈 Tax Reports

### Features
- [x] Tax report generation
- [x] VAT calculations (20%)
- [x] Sales tax reports
- [x] Purchase tax reports
- [x] Tax summary and analytics

---

## ⚙️ Settings

### Settings Tabs
- [x] **Company**: Company information and Moroccan identifiers
- [x] **Branding & Logo**: Logo upload and company name
- [x] **Appearance**: Theme colors and active warehouse
- [x] **Users & Roles**: Team member management (Admin only)
  - View-only for non-admins
  - Add, edit, delete users (Admin only)
  - Role assignment
  - Status management
- [x] **Warehouses**: Warehouse management
- [x] **Notifications**: Notification preferences and management

### Settings Features
- [x] All settings persisted in localStorage
- [x] Real-time updates across application
- [x] Role-based access to settings tabs
- [x] Validation and error handling

---

## 🗄️ Database Schema

### Core Tables
- [x] `warehouses`: Warehouse information
- [x] `company_settings`: Company info and branding
- [x] `user_preferences`: User-specific preferences
- [x] `notifications`: Application notifications
- [x] `users`: User accounts with roles
- [x] `roles`: Role definitions
- [x] `routes`: Application routes
- [x] `role_routes`: Role-based route permissions
- [x] `user_sessions`: Active user sessions
- [x] `user_credential_changes`: Audit log for credential changes
- [x] `user_status_changes`: Status change tracking

### Inventory Tables
- [x] `products`: Product catalog
- [x] `stock_items`: Warehouse-specific stock

### CRM Tables
- [x] `contacts`: Clients and suppliers

### Document Tables
- [x] `invoices`: Sales invoices
- [x] `estimates`: Sales estimates
- [x] `delivery_notes`: Delivery notes
- [x] `purchase_orders`: Purchase orders
- [x] `purchase_invoices`: Purchase invoices
- [x] `credit_notes`: Credit notes
- [x] `statements`: Statements

### Treasury Tables
- [x] `treasury_bank_accounts`: Bank accounts
- [x] `treasury_warehouse_cash`: Warehouse cash amounts
- [x] `treasury_payments`: Payment records (sales and purchases)

### Functions
- [x] Document number generation
- [x] User preference management
- [x] Notification management
- [x] Session management
- [x] Credential change logging
- [x] Treasury statistics
- [x] Bank statement generation
- [x] Payment status updates

### Triggers
- [x] Auto-update `updated_at` timestamps
- [x] Log credential changes
- [x] Invalidate sessions on credential changes

### Views
- [x] User preferences view
- [x] User notifications view
- [x] Active sessions summary
- [x] Recent credential changes
- [x] Treasury summary view
- [x] Pending payments view

---

## 🔄 Data Persistence

### localStorage Keys
- [x] `auth_user`: Current authenticated user
- [x] `isAuthenticated`: Authentication status
- [x] `teamUsers`: Team member list
- [x] `companyInfo`: Company settings
- [x] `warehouses`: Warehouse list
- [x] `activeWarehouse`: Active warehouse ID
- [x] `theme`: Theme preferences
- [x] `notifications`: Notification list
- [x] `treasury_bankAccounts`: Bank accounts
- [x] `treasury_warehouseCash`: Warehouse cash
- [x] `treasury_salesPayments`: Sales payments
- [x] `treasury_purchasePayments`: Purchase payments
- [x] `salesInvoices`: Sales invoices (for Treasury integration)
- [x] `purchaseOrders`: Purchase orders (for Treasury integration)

### Event System
- [x] `userStatusChanged`: Cross-tab user status updates
- [x] `userUpdated`: User credential updates
- [x] `salesInvoicesUpdated`: Sales invoice updates (Treasury sync)
- [x] `purchaseOrdersUpdated`: Purchase order updates (Treasury sync)
- [x] `storage` events for cross-tab synchronization

---

## 🎨 UI/UX Features

### Sidebar
- [x] Dynamic company name and logo
- [x] Responsive font sizing for long names
- [x] Collapsed state with centered icons
- [x] Tooltips on hover (collapsed state)
- [x] Role-based navigation filtering
- [x] User name and role display
- [x] Settings icon removed from user section
- [x] Scrollbar removed
- [x] Collapse button always visible

### Header
- [x] Notification dropdown with badge
- [x] Active warehouse display
- [x] User profile dropdown
- [x] User name and role display

### Login Page
- [x] Dynamic company logo and name
- [x] Left branding panel (desktop)
- [x] Mobile header
- [x] Logo in form card
- [x] Dynamic copyright year
- [x] Access revocation alert
- [x] "Forgot Password" removed

### Responsive Design
- [x] Mobile-friendly layouts
- [x] Responsive tables
- [x] Adaptive navigation
- [x] Touch-friendly interactions

---

## 📝 Document Management

### Document Numbering
- [x] Format: `XXX-MM/YY/NNNN`
  - XXX: Document type prefix (INV, EST, PO, DN, CN, ST, PI, DIV)
  - MM: Month (01-12)
  - YY: Year (last 2 digits)
  - NNNN: Sequential number (0001-9999)
- [x] Unique per document type
- [x] Auto-increment
- [x] Month/year reset

### Document Operations
- [x] Create, Edit, Delete
- [x] View/Preview
- [x] Download PDF
- [x] Print PDF
- [x] Export Excel
- [x] Export CSV
- [x] Bulk operations (delete, export)
- [x] Search and filter
- [x] Status management

### PDF Generation
- [x] Invoice PDF
- [x] Estimate PDF
- [x] Delivery Note PDF
- [x] Credit Note PDF
- [x] Statement PDF
- [x] Company branding in PDFs
- [x] Moroccan VAT calculations
- [x] Line items with details

---

## ✅ Validation & Error Handling

### Form Validation
- [x] Required field validation
- [x] Email format validation
- [x] Number format validation
- [x] Date validation
- [x] Password requirements
- [x] Unique constraints (SKU, document numbers)

### Error Handling
- [x] Try-catch blocks for async operations
- [x] Error boundaries
- [x] User-friendly error messages
- [x] Console logging for debugging
- [x] Toast notifications for errors

---

## 🔒 Security Considerations

### Authentication Security
- [x] Password hashing (client-side for demo)
- [x] Session management
- [x] Auto-logout on status change
- [x] Credential change tracking
- [x] Session invalidation on password/email change

### Access Control
- [x] Role-based route protection
- [x] UI element filtering by role
- [x] View-only access for non-admins
- [x] Permission checks before actions

### Data Validation
- [x] Input sanitization
- [x] Type checking
- [x] Constraint validation
- [x] SQL injection prevention (prepared statements in schema)

---

## 📱 External Access

### Development Server
- [x] Vite configured for external access
- [x] Server host: `true` (0.0.0.0)
- [x] Port: 5173
- [x] Accessible from network devices
- [x] Firewall considerations documented

---

## 🎯 Integration Points

### Sales ↔ Treasury
- [x] Sales invoices loaded in Treasury
- [x] Payment reconciliation
- [x] Invoice status updates
- [x] Event-based synchronization

### Purchases ↔ Treasury
- [x] Purchase orders loaded in Treasury
- [x] Payment reconciliation
- [x] Order status updates
- [x] Event-based synchronization

### CRM ↔ Documents
- [x] Client/Supplier selection in forms
- [x] Contact data auto-population
- [x] Contact information in PDFs

### Inventory ↔ Documents
- [x] Product selection in line items
- [x] Product details in documents
- [x] Stock updates (when implemented)

---

## 📋 Notes & Best Practices

### Code Organization
- [x] Context-based state management
- [x] Component-based architecture
- [x] Reusable UI components
- [x] TypeScript type safety
- [x] Consistent naming conventions

### Data Flow
- [x] Centralized state in contexts
- [x] localStorage for persistence
- [x] Event-driven updates
- [x] Cross-tab synchronization

### Moroccan Business Requirements
- [x] 20% VAT (TVA) calculations
- [x] Moroccan identifiers (ICE, IF, RC, TP, CNSS)
- [x] Moroccan banks support
- [x] MAD currency formatting
- [x] Date formats (DD/MM/YYYY)
- [x] French/Arabic business terms

---

## 🚀 Future Considerations

### Database Integration
- [ ] Backend API implementation
- [ ] PostgreSQL connection
- [ ] API endpoints for all operations
- [ ] Migration from localStorage to database
- [ ] Real-time synchronization

### Additional Features
- [ ] Email notifications
- [ ] SMS notifications
- [ ] Advanced reporting
- [ ] Data export/import
- [ ] Multi-language support
- [ ] Advanced analytics
- [ ] Inventory alerts
- [ ] Automated workflows

---

**Last Updated**: Generated from current codebase state
**Version**: 1.0.0
