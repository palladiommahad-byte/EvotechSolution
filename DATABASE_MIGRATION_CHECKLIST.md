# Database Migration Checklist
## Treasury & Inventory Pages - Supabase Integration

This checklist tracks the migration of Treasury and Inventory pages from localStorage to Supabase database, following the CRM implementation pattern.

---

## 📋 TREASURY PAGE (`/treasury`)

### Phase 1: Create Treasury Service
- [ ] Create `src/services/treasury.service.ts`
- [ ] Define `BankAccount` interface matching database schema
- [ ] Define `WarehouseCash` interface matching database schema
- [ ] Define `TreasuryPayment` interface for payments
- [ ] Implement `getAllBankAccounts()` - Fetch all bank accounts
- [ ] Implement `getBankAccountById(id)` - Get single bank account
- [ ] Implement `createBankAccount(account)` - Create new bank account
- [ ] Implement `updateBankAccount(id, account)` - Update bank account
- [ ] Implement `deleteBankAccount(id)` - Delete bank account
- [ ] Implement `getAllWarehouseCash()` - Fetch warehouse cash amounts
- [ ] Implement `updateWarehouseCash(warehouse, amount)` - Update cash for warehouse
- [ ] Implement `getAllPayments(type)` - Get payments (sales/purchase)
- [ ] Implement `createPayment(payment, type)` - Create payment record
- [ ] Implement `updatePayment(id, payment, type)` - Update payment
- [ ] Implement `deletePayment(id, type)` - Delete payment
- [ ] Implement `updatePaymentStatus(id, status, type)` - Update payment status
- [ ] Handle field mapping (snake_case ↔ camelCase)

### Phase 2: Update TreasuryContext
- [ ] Replace localStorage with React Query in `TreasuryContext.tsx`
- [ ] Use `useQuery` for fetching bank accounts
- [ ] Use `useQuery` for fetching warehouse cash
- [ ] Use `useQuery` for fetching payments (sales and purchase)
- [ ] Create `useMutation` for bank account CRUD operations
- [ ] Create `useMutation` for warehouse cash updates
- [ ] Create `useMutation` for payment CRUD operations
- [ ] Update context interface to use async functions
- [ ] Remove localStorage save/load logic
- [ ] Add loading states
- [ ] Add error handling
- [ ] Keep calculated values (totalBank, totalWarehouseCash, etc.)

### Phase 3: Update Treasury Page
- [ ] Replace local state with `useTreasury` hook in `Treasury.tsx`
- [ ] Update "Add Bank Account" dialog to use context functions
- [ ] Update "Add Payment" dialog to use context functions
- [ ] Update payment status change handlers (Deposit/Clear)
- [ ] Remove localStorage event listeners
- [ ] Update date filter to work with database queries
- [ ] Ensure all statistics calculate from database data
- [ ] Update Bank Statement section to fetch from database
- [ ] Update Recent Sales Inflow to use database
- [ ] Update Supplier Outflow to use database
- [ ] Test all CRUD operations

### Phase 4: Treasury Database Verification
- [ ] Verify `treasury_bank_accounts` table exists in schema.sql
- [ ] Verify `treasury_warehouse_cash` table exists in schema.sql
- [ ] Verify `treasury_payments` table exists in schema.sql
- [ ] Check all required columns match service interfaces
- [ ] Verify foreign key relationships
- [ ] Test schema in Supabase

---

## 📦 INVENTORY PAGE (`/inventory`)

### Phase 1: Review/Update Products Service
- [ ] Review existing `src/services/products.service.ts`
- [ ] Verify all CRUD operations are implemented
- [ ] Check if stock management functions exist
- [ ] Verify field mapping (snake_case ↔ camelCase)
- [ ] Add `getProductsByWarehouse(warehouseId)` if needed
- [ ] Add `updateStockForWarehouse(productId, warehouseId, quantity)` if needed
- [ ] Add `getLowStockProducts(threshold)` if needed

### Phase 2: Update ProductsContext
- [ ] Replace localStorage with React Query in `ProductsContext.tsx`
- [ ] Use `useQuery` for fetching products
- [ ] Create `useMutation` for product CRUD operations
- [ ] Create `useMutation` for stock updates
- [ ] Update context interface to use async functions
- [ ] Remove localStorage save/load logic
- [ ] Add loading states
- [ ] Add error handling
- [ ] Integrate with WarehouseContext if needed
- [ ] Handle warehouse-specific stock queries

### Phase 3: Update Inventory Page
- [ ] Replace local state with `useProducts` hook in `Inventory.tsx`
- [ ] Update product creation form to use context
- [ ] Update product edit form to use context
- [ ] Update delete confirmation to use context
- [ ] Update bulk operations (delete, export) to use context
- [ ] Update stock update operations
- [ ] Update search and filtering to use database queries
- [ ] Update category filtering
- [ ] Update status filtering
- [ ] Update warehouse filtering (if applicable)
- [ ] Remove localStorage event listeners
- [ ] Test all CRUD operations
- [ ] Test stock management
- [ ] Test bulk operations

### Phase 4: Inventory Database Verification
- [ ] Verify `products` table exists in schema.sql
- [ ] Verify `stock_items` table exists in schema.sql
- [ ] Check all required columns match service interfaces
- [ ] Verify foreign key relationships (warehouses, products)
- [ ] Verify indexes for performance (category, status, warehouse_id)
- [ ] Test schema in Supabase

---

## ✅ TESTING & VERIFICATION

### Treasury Testing
- [ ] Test Create bank account operation
- [ ] Test Read bank accounts (fetch and display)
- [ ] Test Update bank account operation
- [ ] Test Delete bank account operation
- [ ] Test Create payment operation
- [ ] Test Update payment operation
- [ ] Test Delete payment operation
- [ ] Test Update payment status (Deposit/Clear)
- [ ] Test warehouse cash updates
- [ ] Test filtering and search
- [ ] Verify data persists after page refresh
- [ ] Check browser console for errors
- [ ] Verify Supabase Table Editor shows data
- [ ] Test error handling (network errors, validation errors)

### Inventory Testing
- [ ] Test Create product operation
- [ ] Test Read products (fetch and display)
- [ ] Test Update product operation
- [ ] Test Delete product operation
- [ ] Test stock updates
- [ ] Test warehouse-specific stock queries
- [ ] Test filtering and search
- [ ] Test category filtering
- [ ] Test status filtering
- [ ] Test bulk operations (delete, export)
- [ ] Verify data persists after page refresh
- [ ] Check browser console for errors
- [ ] Verify Supabase Table Editor shows data
- [ ] Test error handling (network errors, validation errors)

---

## 🔧 ERROR HANDLING & OPTIMIZATION

- [ ] Add try-catch blocks for all async operations
- [ ] Show user-friendly error messages
- [ ] Handle loading states gracefully
- [ ] Handle empty states (no data)
- [ ] Add query caching with appropriate staleTime
- [ ] Implement pagination if data sets are large
- [ ] Optimize queries to fetch only needed fields
- [ ] Add debouncing for search inputs

---

## 📚 DOCUMENTATION

- [ ] Update service files with JSDoc comments
- [ ] Document any new database functions or views
- [ ] Update README if schema changes are made
- [ ] Document any breaking changes

---

## 🎯 SUCCESS CRITERIA

- [ ] All data loads from Supabase database
- [ ] Create, Read, Update, Delete operations work correctly
- [ ] Data persists after page refresh
- [ ] No localStorage dependencies for these features
- [ ] Error handling is implemented
- [ ] Loading states are shown appropriately
- [ ] Code follows the same patterns as CRM implementation
- [ ] All tests pass (manual testing)

---

## 📖 REFERENCE IMPLEMENTATION

For reference, see how CRM was implemented:
- ✅ `src/services/contacts.service.ts` - Service layer example
- ✅ `src/contexts/ContactsContext.tsx` - Context with React Query example
- ✅ `src/pages/CRM.tsx` - Page implementation example

---

## 📝 NOTES

**Implementation Order:**
1. Start with Treasury Page (simpler data model)
2. Then migrate Inventory Page (more complex with stock management)

**Database Tables:**
- Treasury: `treasury_bank_accounts`, `treasury_warehouse_cash`, `treasury_payments`
- Inventory: `products`, `stock_items`, `warehouses`

**Last Updated:** Created from TODO_DATABASE_MIGRATION.md
