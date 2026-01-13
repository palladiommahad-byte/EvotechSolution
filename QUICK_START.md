# Quick Start - Database Integration

## 🚀 Fast Setup (5 minutes)

### Step 1: Install Dependencies
```bash
npm install pg @types/pg
```

### Step 2: Create Database
```sql
-- In PostgreSQL terminal
CREATE DATABASE evotech_inventory;
\q
```

### Step 3: Run Schema
```bash
psql -U postgres -d evotech_inventory -f database/schema.sql
```

### Step 4: Create .env File
Create `.env` in project root:
```env
VITE_DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/evotech_inventory
```

### Step 5: Update App.tsx Route
```tsx
// In src/App.tsx, replace:
import { Dashboard } from "./pages/Dashboard";

// With:
import { DashboardWithData } from "./pages/DashboardWithData";

// And update route:
<Route path="/" element={<DashboardWithData />} />
```

### Step 6: Restart Dev Server
```bash
npm run dev
```

## ✅ Verification

Check browser console for:
- ✅ `Database connected successfully`
- ✅ `Database connection verified`

If you see these messages, you're all set! 🎉

## 🔧 Troubleshooting

**"DATABASE_URL not found"**
- Make sure `.env` uses `VITE_DATABASE_URL` (not `DATABASE_URL`)
- Restart dev server after creating/modifying `.env`

**"Connection refused"**
- Check PostgreSQL is running: `pg_isready`
- Verify username/password in connection string

**Tables don't exist**
- Run schema: `psql -U postgres -d evotech_inventory -f database/schema.sql`

## 📚 Full Documentation

- `DATABASE_SETUP.md` - Detailed setup guide
- `INTEGRATION_GUIDE.md` - Architecture and patterns
- `database/schema.sql` - Complete database schema
