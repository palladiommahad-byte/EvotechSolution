# Database Migration Guide - Morocco Inventory Hub

## 📊 Database Recommendation

**Recommended Database: PostgreSQL**

**Why PostgreSQL?**
- ✅ Your schema is already designed for PostgreSQL (`database/schema.sql`)
- ✅ Excellent for complex business logic (inventory, accounting, multi-warehouse)
- ✅ ACID compliance for financial data
- ✅ Advanced features (JSON, arrays, full-text search)
- ✅ Open-source and widely supported
- ✅ Perfect for Moroccan business requirements (VAT, multi-currency)

**Alternative Options:**
- **MySQL/MariaDB**: Good alternative, but your schema uses PostgreSQL-specific features
- **SQLite**: Not recommended for production (single-file, no concurrency)
- **MongoDB**: Not recommended (relational data structure, complex queries needed)

---

## 🔄 Migration Strategy: Preserving Your Current Data

### Phase 1: Export Current localStorage Data (BACKUP FIRST!)

Before migrating, you MUST export all your current data from localStorage.

#### Step 1: Create a Data Export Script

Create a file: `scripts/export-localStorage-data.js`

```javascript
// Run this in browser console or create a simple HTML page
// This exports ALL localStorage data to JSON files

function exportLocalStorageData() {
  const dataToExport = {
    // Authentication
    auth_user: localStorage.getItem('auth_user'),
    isAuthenticated: localStorage.getItem('isAuthenticated'),
    teamUsers: localStorage.getItem('teamUsers'),
    
    // Company & Settings
    companyInfo: localStorage.getItem('companyInfo'),
    theme: localStorage.getItem('theme'),
    
    // Warehouses
    warehouses: localStorage.getItem('warehouses'),
    activeWarehouse: localStorage.getItem('activeWarehouse'),
    
    // Contacts (CRM)
    crm_clients: localStorage.getItem('crm_clients'),
    crm_suppliers: localStorage.getItem('crm_suppliers'),
    
    // Products & Inventory
    products: localStorage.getItem('products'),
    
    // Sales Documents
    salesInvoices: localStorage.getItem('salesInvoices'),
    salesEstimates: localStorage.getItem('salesEstimates'),
    salesDeliveryNotes: localStorage.getItem('salesDeliveryNotes'),
    salesCreditNotes: localStorage.getItem('salesCreditNotes'),
    salesStatements: localStorage.getItem('salesStatements'),
    salesDivers: localStorage.getItem('salesDivers'), // If exists
    
    // Purchase Documents
    purchaseOrders: localStorage.getItem('purchaseOrders'),
    purchaseInvoices: localStorage.getItem('purchaseInvoices'),
    purchaseDeliveryNotes: localStorage.getItem('purchaseDeliveryNotes'),
    purchaseStatements: localStorage.getItem('purchaseStatements'),
    
    // Invoicing Documents
    invoices: localStorage.getItem('invoices'),
    estimates: localStorage.getItem('estimates'),
    purchaseOrdersInv: localStorage.getItem('purchaseOrdersInv'),
    deliveryNotesInv: localStorage.getItem('deliveryNotesInv'),
    statementsInv: localStorage.getItem('statementsInv'),
    
    // Treasury
    treasury_bankAccounts: localStorage.getItem('treasury_bankAccounts'),
    treasury_warehouseCash: localStorage.getItem('treasury_warehouseCash'),
    treasury_salesPayments: localStorage.getItem('treasury_salesPayments'),
    treasury_purchasePayments: localStorage.getItem('treasury_purchasePayments'),
    
    // Notifications
    notifications: localStorage.getItem('notifications'),
    
    // Export timestamp
    exportedAt: new Date().toISOString(),
    version: '1.0.0'
  };
  
  // Create downloadable JSON file
  const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `localStorage-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log('✅ Data exported successfully!');
  return dataToExport;
}

// Run it
exportLocalStorageData();
```

**How to use:**
1. Open your app in browser
2. Open Developer Tools (F12)
3. Go to Console tab
4. Paste and run the script above
5. A JSON file will download with ALL your data
6. **SAVE THIS FILE SAFELY!**

---

### Phase 2: Set Up PostgreSQL Database

#### Step 1: Install PostgreSQL

**Windows:**
```bash
# Download from: https://www.postgresql.org/download/windows/
# Or use Chocolatey:
choco install postgresql
```

**Mac:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

#### Step 2: Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE morocco_inventory_hub;

# Create user (optional, for security)
CREATE USER inventory_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE morocco_inventory_hub TO inventory_user;

# Exit
\q
```

#### Step 3: Run Schema

```bash
# Connect to your database
psql -U postgres -d morocco_inventory_hub

# Run the schema file
\i database/schema.sql

# Or from command line:
psql -U postgres -d morocco_inventory_hub -f database/schema.sql
```

---

### Phase 3: Create Migration Script

Create: `scripts/migrate-localStorage-to-db.js`

This script will:
1. Read the exported JSON backup
2. Transform localStorage data to database format
3. Insert data into PostgreSQL
4. Handle relationships and foreign keys

```javascript
// This is a Node.js script - run with: node scripts/migrate-localStorage-to-db.js

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'morocco_inventory_hub',
  password: 'your_password',
  port: 5432,
});

async function migrateData() {
  try {
    // 1. Read exported JSON file
    const backupFile = path.join(__dirname, '..', 'localStorage-backup-YYYY-MM-DD.json');
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    
    console.log('📦 Starting migration...');
    
    // 2. Migrate Users/Team Members
    if (backupData.teamUsers) {
      const teamUsers = JSON.parse(backupData.teamUsers);
      console.log(`Migrating ${teamUsers.length} users...`);
      
      for (const user of teamUsers) {
        await pool.query(`
          INSERT INTO users (id, name, email, password_hash, role, status, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            password_hash = EXCLUDED.password_hash,
            role = EXCLUDED.role,
            status = EXCLUDED.status
        `, [
          user.id || require('crypto').randomUUID(),
          user.name,
          user.email,
          user.password || user.password_hash, // Use existing hash if available
          user.role,
          user.status || 'active',
          user.createdAt || new Date()
        ]);
      }
    }
    
    // 3. Migrate Company Settings
    if (backupData.companyInfo) {
      const companyInfo = JSON.parse(backupData.companyInfo);
      await pool.query(`
        INSERT INTO company_settings (
          name, legal_form, email, phone, address,
          ice, if_number, rc, tp, cnss, logo, footer_text
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          legal_form = EXCLUDED.legal_form,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          address = EXCLUDED.address,
          ice = EXCLUDED.ice,
          if_number = EXCLUDED.if_number,
          rc = EXCLUDED.rc,
          tp = EXCLUDED.tp,
          cnss = EXCLUDED.cnss,
          logo = EXCLUDED.logo,
          footer_text = EXCLUDED.footer_text,
          updated_at = CURRENT_TIMESTAMP
      `, [
        companyInfo.name,
        companyInfo.legalForm,
        companyInfo.email,
        companyInfo.phone,
        companyInfo.address,
        companyInfo.ice,
        companyInfo.if,
        companyInfo.rc,
        companyInfo.tp,
        companyInfo.cnss,
        companyInfo.logo,
        companyInfo.footerText
      ]);
    }
    
    // 4. Migrate Warehouses
    if (backupData.warehouses) {
      const warehouses = JSON.parse(backupData.warehouses);
      for (const warehouse of warehouses) {
        await pool.query(`
          INSERT INTO warehouses (id, name, city, address, phone, email)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            city = EXCLUDED.city,
            address = EXCLUDED.address,
            phone = EXCLUDED.phone,
            email = EXCLUDED.email
        `, [
          warehouse.id,
          warehouse.name,
          warehouse.city,
          warehouse.address,
          warehouse.phone,
          warehouse.email
        ]);
      }
    }
    
    // 5. Migrate Contacts (Clients & Suppliers)
    if (backupData.crm_clients) {
      const clients = JSON.parse(backupData.crm_clients);
      for (const client of clients) {
        await pool.query(`
          INSERT INTO contacts (id, name, type, email, phone, address, ice, if_number, rc, status)
          VALUES ($1, $2, 'client', $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            address = EXCLUDED.address,
            ice = EXCLUDED.ice,
            if_number = EXCLUDED.if_number,
            rc = EXCLUDED.rc,
            status = EXCLUDED.status
        `, [
          client.id,
          client.name,
          client.email,
          client.phone,
          client.address,
          client.ice,
          client.ifNumber,
          client.rc,
          client.status || 'active'
        ]);
      }
    }
    
    if (backupData.crm_suppliers) {
      const suppliers = JSON.parse(backupData.crm_suppliers);
      for (const supplier of suppliers) {
        await pool.query(`
          INSERT INTO contacts (id, name, type, email, phone, address, ice, if_number, rc, status)
          VALUES ($1, $2, 'supplier', $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            address = EXCLUDED.address,
            ice = EXCLUDED.ice,
            if_number = EXCLUDED.if_number,
            rc = EXCLUDED.rc,
            status = EXCLUDED.status
        `, [
          supplier.id,
          supplier.name,
          supplier.email,
          supplier.phone,
          supplier.address,
          supplier.ice,
          supplier.ifNumber,
          supplier.rc,
          supplier.status || 'active'
        ]);
      }
    }
    
    // 6. Migrate Products
    if (backupData.products) {
      const products = JSON.parse(backupData.products);
      for (const product of products) {
        await pool.query(`
          INSERT INTO products (
            id, name, sku, category, description, unit, price, cost,
            stock_quantity, warehouse_id, image, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            sku = EXCLUDED.sku,
            category = EXCLUDED.category,
            description = EXCLUDED.description,
            unit = EXCLUDED.unit,
            price = EXCLUDED.price,
            cost = EXCLUDED.cost,
            stock_quantity = EXCLUDED.stock_quantity,
            warehouse_id = EXCLUDED.warehouse_id,
            image = EXCLUDED.image
        `, [
          product.id,
          product.name,
          product.sku,
          product.category,
          product.description,
          product.unit,
          product.price,
          product.cost,
          product.stockQuantity || product.stock,
          product.warehouseId || 'marrakech',
          product.image,
          product.createdAt || new Date()
        ]);
      }
    }
    
    // 7. Migrate Sales Documents (Invoices, Estimates, etc.)
    // Similar pattern for all document types...
    
    // 8. Migrate Treasury Data
    if (backupData.treasury_bankAccounts) {
      const bankAccounts = JSON.parse(backupData.treasury_bankAccounts);
      for (const account of bankAccounts) {
        await pool.query(`
          INSERT INTO treasury_bank_accounts (id, name, bank, account_number, balance)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            bank = EXCLUDED.bank,
            account_number = EXCLUDED.account_number,
            balance = EXCLUDED.balance
        `, [
          account.id,
          account.name,
          account.bank,
          account.accountNumber,
          account.balance
        ]);
      }
    }
    
    // Similar for treasury_warehouseCash, treasury_payments, etc.
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration
migrateData();
```

---

### Phase 4: Update Application to Use Database

**Option A: Gradual Migration (Recommended)**
- Keep localStorage as fallback
- Add database layer that checks database first, falls back to localStorage
- Gradually migrate contexts one by one

**Option B: Complete Migration**
- Replace all localStorage calls with API calls
- Build backend API (Node.js/Express + PostgreSQL)
- Update all contexts to use API

---

## 🛡️ Safety Checklist

Before migrating:

- [ ] ✅ Export ALL localStorage data (use export script above)
- [ ] ✅ Backup the exported JSON file to multiple locations
- [ ] ✅ Test database setup on a development/staging environment first
- [ ] ✅ Verify schema.sql runs without errors
- [ ] ✅ Test migration script with sample data first
- [ ] ✅ Keep localStorage working during migration (dual-write mode)
- [ ] ✅ Verify data integrity after migration
- [ ] ✅ Test application with database data
- [ ] ✅ Only remove localStorage after confirming everything works

---

## 📝 Environment Variables

Create `.env` file:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/morocco_inventory_hub
DB_HOST=localhost
DB_PORT=5432
DB_NAME=morocco_inventory_hub
DB_USER=postgres
DB_PASSWORD=your_password

# App Configuration
NODE_ENV=development
PORT=3001
```

---

## 🔧 Installation Commands

```bash
# Install PostgreSQL client
npm install pg @types/pg

# Install database migration tools (optional but recommended)
npm install --save-dev node-pg-migrate
# or
npm install --save-dev db-migrate db-migrate-pg
```

---

## 📚 Next Steps After Migration

1. **Build Backend API** (Node.js/Express recommended)
   - REST API endpoints for all operations
   - Authentication middleware
   - Error handling

2. **Update Frontend Contexts**
   - Replace localStorage calls with API calls
   - Add loading states
   - Add error handling

3. **Testing**
   - Test all CRUD operations
   - Test user authentication
   - Test data relationships

4. **Deployment**
   - Set up production database
   - Configure environment variables
   - Deploy backend API
   - Update frontend API endpoints

---

## ⚠️ Important Notes

1. **Keep localStorage as Backup**: Don't delete localStorage code immediately. Keep it as fallback during migration.

2. **Test Thoroughly**: Test every feature after migration.

3. **User Passwords**: If users have passwords in localStorage, you'll need to hash them properly (bcrypt) before inserting into database.

4. **Document IDs**: Ensure all document IDs are preserved during migration.

5. **Relationships**: Pay attention to foreign keys (users, warehouses, contacts, etc.)

---

## 🆘 Troubleshooting

**Problem**: Migration script fails with foreign key errors
**Solution**: Migrate data in correct order: Users → Warehouses → Contacts → Products → Documents

**Problem**: Data doesn't appear in database
**Solution**: Check database connection, verify SQL queries, check for errors in console

**Problem**: Application breaks after migration
**Solution**: Keep localStorage code, use feature flags to switch between localStorage and database

---

## 📞 Support

If you encounter issues during migration:
1. Check the exported backup file has all data
2. Verify database schema matches your data structure
3. Test migration script on small dataset first
4. Check database logs for errors
