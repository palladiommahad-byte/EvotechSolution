# Database Setup Guide for EVOTECH SOLUTIONS

This guide will help you set up PostgreSQL database integration for your inventory management system.

## Prerequisites

1. PostgreSQL installed and running (version 12 or higher)
2. Node.js and npm installed
3. Access to create databases and tables

## Step 1: Install Dependencies

```bash
npm install pg @types/pg
```

## Step 2: Create Database

Connect to PostgreSQL and create the database:

```sql
CREATE DATABASE evotech_inventory;
```

## Step 3: Run Schema

Execute the SQL schema file to create all tables:

```bash
psql -U postgres -d evotech_inventory -f database/schema.sql
```

Or manually copy and paste the contents of `database/schema.sql` into your PostgreSQL client.

## Step 4: Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/evotech_inventory

# Example:
# DATABASE_URL=postgresql://postgres:mypassword@localhost:5432/evotech_inventory

# Optional: Database Pool Configuration
DB_POOL_MIN=2
DB_POOL_MAX=10
```

**Important for Vite**: If you're using Vite (which this project does), you need to prefix with `VITE_`:

```env
VITE_DATABASE_URL=postgresql://username:password@localhost:5432/evotech_inventory
```

## Step 5: Update Your Routes

### Option A: Use the Wrapper Component (Recommended - Non-Destructive)

In `src/App.tsx`, replace:

```tsx
import { Dashboard } from "./pages/Dashboard";
```

With:

```tsx
import { DashboardWithData } from "./pages/DashboardWithData";
```

And update the route:

```tsx
<Route path="/" element={<DashboardWithData />} />
```

### Option B: Modify Dashboard Directly

If you prefer to modify the existing Dashboard component, see the integration example in `DashboardWithData.tsx` and apply similar changes to `Dashboard.tsx`.

## Step 6: Test Connection

The database connection will be tested automatically when the app starts. Check the browser console for:

- ✅ `Database connected successfully` - Connection working
- ❌ `Database connection failed` - Check your DATABASE_URL

## Database Schema Overview

### Tables Created:

1. **warehouses** - Warehouse locations (Marrakech, Agadir, Ouarzazate)
2. **products** - Product catalog with Moroccan business fields
3. **stock_items** - Warehouse-specific stock levels
4. **contacts** - Clients and suppliers with ICE/IF/RC fields
5. **invoices** - Sales invoices with 20% VAT
6. **estimates** - Sales estimates
7. **delivery_notes** - Delivery notes
8. **purchase_orders** - Purchase orders
9. **purchase_invoices** - Purchase invoices
10. **credit_notes** - Credit notes
11. **statements** - Account statements
12. **invoice_items** - Line items for invoices

### Views Created:

1. **dashboard_kpis** - Aggregated KPI data
2. **sales_chart_data** - Monthly sales data for charts

## Moroccan Business Fields

The schema includes all required Moroccan business identifiers:

- **ICE** (Identifiant Commun de l'Entreprise)
- **IF** (Identifiant Fiscal)
- **RC** (Registre de Commerce)
- **VAT Rate**: 20% (default, configurable per invoice)

## Troubleshooting

### Connection Issues

1. **"DATABASE_URL not found"**
   - Make sure `.env` file exists in root directory
   - For Vite, use `VITE_DATABASE_URL` instead of `DATABASE_URL`

2. **"Connection refused"**
   - Check PostgreSQL is running: `pg_isready`
   - Verify host, port, and database name in connection string

3. **"Authentication failed"**
   - Verify username and password in connection string
   - Check PostgreSQL user permissions

### Query Issues

1. **"relation does not exist"**
   - Run the schema.sql file to create tables
   - Check table names match exactly

2. **"permission denied"**
   - Grant necessary permissions to your database user
   - Ensure user has SELECT, INSERT, UPDATE, DELETE permissions

## Next Steps

1. **Seed Initial Data**: Create a seed script to populate initial data
2. **Add API Routes**: If using a backend, create REST API endpoints
3. **Add Authentication**: Secure database access with proper authentication
4. **Backup Strategy**: Set up regular database backups

## Support

For issues or questions, check:
- PostgreSQL documentation: https://www.postgresql.org/docs/
- node-postgres documentation: https://node-postgres.com/
