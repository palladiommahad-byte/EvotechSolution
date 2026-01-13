# TODO: Database Migration for Treasury and Inventory Pages

This document outlines the tasks needed to migrate the Treasury and Inventory pages to use Supabase database, similar to the CRM implementation.

## 📋 Treasury Page (`/treasury`)

### Phase 1: Create Services

- [ ] **Create `treasury.service.ts`**
  - [ ] Create `BankAccount` interface matching database schema
  - [ ] Create `WarehouseCash` interface matching database schema
  - [ ] Create `TreasuryPayment` interface (for sales and purchase payments)
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

- [ ] **Update `TreasuryContext.tsx`**
  - [ ] Replace localStorage with React Query
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

- [ ] **Update `Treasury.tsx`**
  - [ ] Replace local state with `useTreasury` hook
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

### Phase 4: Database Schema Verification

- [ ] Verify `treasury_bank_accounts` table exists in schema.sql
- [ ] Verify `treasury_warehouse_cash` table exists in schema.sql
- [ ] Verify `treasury_payments` table exists in schema.sql
- [ ] Check all required columns match service interfaces
- [ ] Verify foreign key relationships
- [ ] Test schema in Supabase

---

## 📦 Inventory Page (`/inventory`)

### Phase 1: Create/Update Services

- [ ] **Review existing `products.service.ts`**
  - [ ] Verify all CRUD operations are implemented
  - [ ] Check if stock management functions exist
  - [ ] Verify field mapping (snake_case ↔ camelCase)
  - [ ] Add `getProductsByWarehouse(warehouseId)` if needed
  - [ ] Add `updateStockForWarehouse(productId, warehouseId, quantity)` if needed
  - [ ] Add `getLowStockProducts(threshold)` if needed

### Phase 2: Update ProductsContext

- [ ] **Update `ProductsContext.tsx`**
  - [ ] Replace localStorage with React Query
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

- [ ] **Update `Inventory.tsx`**
  - [ ] Replace local state with `useProducts` hook
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

### Phase 4: Database Schema Verification

- [ ] Verify `products` table exists in schema.sql
- [ ] Verify `stock_items` table exists in schema.sql
- [ ] Check all required columns match service interfaces
- [ ] Verify foreign key relationships (warehouses, products)
- [ ] Verify indexes for performance (category, status, warehouse_id)
- [ ] Test schema in Supabase

---

## 🔄 Common Tasks for Both Pages

### Testing & Verification

- [ ] Test Create operations (add new records)
- [ ] Test Read operations (fetch and display data)
- [ ] Test Update operations (edit existing records)
- [ ] Test Delete operations (remove records)
- [ ] Test filtering and search
- [ ] Test pagination (if applicable)
- [ ] Verify data persists after page refresh
- [ ] Check browser console for errors
- [ ] Verify Supabase Table Editor shows data
- [ ] Test with multiple warehouses (if applicable)
- [ ] Verify real-time updates work
- [ ] Test error handling (network errors, validation errors)

### Error Handling

- [ ] Add try-catch blocks for all async operations
- [ ] Show user-friendly error messages
- [ ] Handle loading states gracefully
- [ ] Handle empty states (no data)
- [ ] Add retry logic for failed requests (optional)

### Performance Optimization

- [ ] Add query caching with appropriate staleTime
- [ ] Implement pagination if data sets are large
- [ ] Optimize queries to fetch only needed fields
- [ ] Add debouncing for search inputs
- [ ] Consider virtual scrolling for large lists

### Documentation

- [ ] Update service files with JSDoc comments
- [ ] Document any new database functions or views
- [ ] Update README if schema changes are made
- [ ] Document any breaking changes

---

## 📝 Implementation Order

### Recommended Order:
1. **Treasury Page** (simpler data model)
   - Create treasury.service.ts
   - Update TreasuryContext
   - Update Treasury page
   - Test thoroughly

2. **Inventory Page** (more complex with stock management)
   - Review/update products.service.ts
   - Update ProductsContext
   - Update Inventory page
   - Test thoroughly

---

## 🔍 Database Tables Reference

### Treasury Tables:
- `treasury_bank_accounts` - Bank account information
- `treasury_warehouse_cash` - Cash amounts per warehouse
- `treasury_payments` - Payment records (sales and purchase)

### Inventory Tables:
- `products` - Product catalog
- `stock_items` - Warehouse-specific stock levels
- `warehouses` - Warehouse locations (reference)

---

## ✅ Success Criteria

- [ ] All data loads from Supabase database
- [ ] Create, Read, Update, Delete operations work correctly
- [ ] Data persists after page refresh
- [ ] No localStorage dependencies for these features
- [ ] Error handling is implemented
- [ ] Loading states are shown appropriately
- [ ] Code follows the same patterns as CRM implementation
- [ ] All tests pass (manual testing)

---

## 📚 Reference Implementation

For reference, see how CRM was implemented:
- `src/services/contacts.service.ts` - Service layer example
- `src/contexts/ContactsContext.tsx` - Context with React Query example
- `src/pages/CRM.tsx` - Page implementation example
