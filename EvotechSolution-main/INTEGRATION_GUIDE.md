# Database Integration Guide

## 📋 Summary

This integration adds PostgreSQL database support to EVOTECH SOLUTIONS without modifying your existing UI components. All changes are **non-destructive** and use wrapper patterns.

## 📁 Files Created

### Database Files
- `database/schema.sql` - Complete PostgreSQL schema with Moroccan business fields

### Configuration
- `.env.example` - Environment variables template
- `DATABASE_SETUP.md` - Step-by-step setup instructions

### Core Database Layer
- `src/lib/db.ts` - PostgreSQL connection pool and query helpers

### Services (Data Layer)
- `src/services/products.service.ts` - Product CRUD operations
- `src/services/dashboard.service.ts` - Dashboard analytics queries
- `src/services/invoices.service.ts` - Invoice and document operations

### Hooks (Data Fetching)
- `src/hooks/useDashboardData.ts` - React Query hook for dashboard data

### Wrapper Components
- `src/pages/DashboardWithData.tsx` - Wrapper that fetches real data for Dashboard

## 🔄 Integration Steps

### 1. Install Dependencies

```bash
npm install pg @types/pg
```

### 2. Set Up Database

1. Create PostgreSQL database:
   ```sql
   CREATE DATABASE evotech_inventory;
   ```

2. Run schema:
   ```bash
   psql -U postgres -d evotech_inventory -f database/schema.sql
   ```

### 3. Configure Environment

Create `.env` file:
```env
VITE_DATABASE_URL=postgresql://username:password@localhost:5432/evotech_inventory
```

### 4. Switch to Database-Powered Dashboard

In `src/App.tsx`:

**Before:**
```tsx
import { Dashboard } from "./pages/Dashboard";
// ...
<Route path="/" element={<Dashboard />} />
```

**After:**
```tsx
import { DashboardWithData } from "./pages/DashboardWithData";
// ...
<Route path="/" element={<DashboardWithData />} />
```

## 🎯 How It Works

### Non-Destructive Pattern

The wrapper component (`DashboardWithData`) follows this pattern:

1. **Fetches real data** from database using services
2. **Transforms data** to match existing component props
3. **Passes data** to existing UI components unchanged

```tsx
// Wrapper fetches data
const { kpis, isLoading } = useDashboardData();

// Transforms to match existing props
const kpiData = useMemo(() => ({
  totalSales: {
    value: formatMAD(kpis.total_sales),
    // ... matches existing structure
  }
}), [kpis]);

// Existing components receive data as before
<KPICard
  title="Total Sales"
  value={kpiData.totalSales.value}
  // ... all props match existing interface
/>
```

## 🔌 Services Architecture

### Products Service
```typescript
import { productsService } from '@/services/products.service';

// Get all products
const products = await productsService.getAll();

// Create product
const newProduct = await productsService.create({
  sku: 'PROD-001',
  name: 'Product Name',
  category: 'Electronics',
  price: 1000,
  // ...
});
```

### Dashboard Service
```typescript
import { dashboardService } from '@/services/dashboard.service';

// Get KPIs
const kpis = await dashboardService.getKPIs();

// Get sales comparison
const comparison = await dashboardService.getSalesComparison();
```

### Invoices Service
```typescript
import { invoicesService } from '@/services/invoices.service';

// Get all invoices
const invoices = await invoicesService.getAll();

// Create invoice
const invoice = await invoicesService.create({
  document_id: 'INV-2024-001',
  client_id: 'client-uuid',
  items: [/* ... */],
  // ...
});
```

## 🔄 Integrating Other Pages

### Pattern for Invoicing Page

Create `src/pages/InvoicingWithData.tsx`:

```tsx
import { Invoicing } from './Invoicing';
import { invoicesService } from '@/services/invoices.service';
import { useQuery } from '@tanstack/react-query';

export const InvoicingWithData = () => {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoicesService.getAll(),
  });

  // Transform database data to match Invoicing component props
  const transformedInvoices = useMemo(() => {
    return invoices?.map(inv => ({
      id: inv.document_id,
      client: inv.client?.company || inv.client?.name,
      date: inv.date,
      total: inv.total,
      status: inv.status,
      // ... map other fields
    })) || [];
  }, [invoices]);

  return <Invoicing 
    invoices={transformedInvoices}
    isLoading={isLoading}
  />;
};
```

### Pattern for Inventory Page

The Inventory page already uses `ProductsContext`. Update the context to use database:

```tsx
// In ProductsContext.tsx
import { productsService } from '@/services/products.service';

export const ProductsProvider = ({ children }) => {
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsService.getAll(),
  });

  const addProduct = async (product) => {
    const newProduct = await productsService.create(product);
    // Update local state or refetch
  };

  // ... rest of context
};
```

## 📊 Database Schema Highlights

### Moroccan Business Fields
- **ICE** (Identifiant Commun de l'Entreprise)
- **IF** (Identifiant Fiscal) 
- **RC** (Registre de Commerce)

### VAT Handling
- Default 20% VAT rate (Morocco standard)
- Stored per invoice (can override)
- Automatically calculated: `vat_amount = subtotal * (vat_rate / 100)`

### Warehouse Support
- Multi-warehouse stock tracking
- Default warehouses: Marrakech, Agadir, Ouarzazate
- Stock distributed across warehouses

## 🚨 Important Notes

1. **Vite Environment Variables**: Use `VITE_` prefix for client-side env vars
2. **Connection Pooling**: Configured automatically (min: 2, max: 10)
3. **Error Handling**: All services include try-catch with console logging
4. **Type Safety**: Full TypeScript support with interfaces matching database schema

## 🔍 Testing Connection

The connection is tested automatically on app start. Check browser console:

- ✅ `Database connected successfully` 
- ✅ `Database connection verified`

If you see errors, check:
1. PostgreSQL is running
2. DATABASE_URL is correct
3. Database and tables exist

## 📝 Next Steps

1. ✅ Database schema created
2. ✅ Connection layer implemented  
3. ✅ Services created
4. ✅ Dashboard wrapper created
5. ⏭️ Integrate Inventory page with database
6. ⏭️ Integrate Invoicing page with database
7. ⏭️ Add authentication/authorization
8. ⏭️ Create API routes (if using backend)

## 🆘 Need Help?

See `DATABASE_SETUP.md` for detailed setup instructions.
