# Sales Page Migration Notes

## Current Status

The Sales page currently uses mock data stored in component state. To migrate to Supabase, the following needs to be addressed:

## Database Schema Analysis

### ✅ Tables That Exist:
1. **`invoices`** - ✅ Exists with `invoice_items` table
2. **`estimates`** - ✅ Exists (NO items table)
3. **`delivery_notes`** - ✅ Exists (NO items table)
4. **`credit_notes`** - ✅ Exists (NO items table)
5. **`statements`** - ✅ Exists (NO items table)

### ❌ Missing:
1. **`divers`** - ❌ No table exists
   - Options:
     - Use `delivery_notes` table for divers documents
     - Create a new `divers` table with similar structure to `delivery_notes`
     - Store divers as a type/variant of delivery_notes

2. **Item Tables Missing:**
   - `estimate_items` - ❌ Not in schema
   - `delivery_note_items` - ❌ Not in schema  
   - `credit_note_items` - ❌ Not in schema
   - `statement_items` - ❌ Not in schema (statements might not need items)

## Migration Requirements

### Phase 1: Database Schema Updates (If Needed)

1. **Decide on "divers" handling:**
   - Option A: Use `delivery_notes` table with a type field
   - Option B: Create dedicated `divers` table
   - Option C: Add `document_type` field to `delivery_notes` to distinguish types

2. **Create item tables (if storing items separately):**
   ```sql
   -- Example structure (similar to invoice_items):
   CREATE TABLE estimate_items (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
     product_id UUID REFERENCES products(id),
     description TEXT NOT NULL,
     quantity DECIMAL(10, 2) NOT NULL,
     unit_price DECIMAL(12, 2) NOT NULL,
     total DECIMAL(12, 2) NOT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   
   -- Similar for delivery_note_items, credit_note_items
   ```

### Phase 2: Service Layer

Create services for:
- `estimates.service.ts`
- `delivery-notes.service.ts` (or extend to handle divers)
- `credit-notes.service.ts`
- `statements.service.ts` (if needed, statements might be calculated views)

### Phase 3: Context Layer

Create or update contexts to use React Query:
- `SalesContext.tsx` or extend existing contexts
- Use `useQuery` for fetching documents
- Use `useMutation` for CRUD operations

### Phase 4: Page Update

Update `Sales.tsx` to:
- Replace mock data with context hooks
- Remove localStorage usage
- Update all CRUD operations to use async functions from context

## Current Implementation Notes

- Sales page stores items as arrays in the document object
- Documents are stored in separate state arrays for each type
- PDF generation works correctly (already fixed)
- Document numbering system is in place

## Recommendation

For a quick migration:
1. Use `delivery_notes` table for "divers" documents (add a type field or use status)
2. Store items as JSONB in the document tables (simpler than creating item tables)
3. Create services for each document type
4. Follow the pattern used for CRM/Treasury/Inventory migrations

For a more robust solution:
1. Create item tables for all document types
2. Create proper foreign key relationships
3. Enable better querying and reporting capabilities
