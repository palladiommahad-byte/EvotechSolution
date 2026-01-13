# Supabase Setup Guide for EVOTECH SOLUTIONS

This guide will help you set up Supabase as your database backend for the inventory management system.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. Node.js and npm installed
3. Access to create a new Supabase project

## Step 1: Install Dependencies

```bash
npm install @supabase/supabase-js
```

## Step 2: Create Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in project details:
   - **Name**: `evotech-inventory` (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the closest region to your users
4. Click "Create new project"
5. Wait for the project to be provisioned (2-3 minutes)

## Step 3: Run Database Schema

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click "New query"
4. Open `database/schema.sql` from this project
5. Copy the entire contents and paste into the SQL Editor
6. Click "Run" to execute the schema
7. Verify tables are created by checking the **Table Editor** (left sidebar)

## Step 4: Get API Credentials

1. In your Supabase project, go to **Settings** → **API** (left sidebar)
2. Copy the following values:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys" → "anon public")

## Step 5: Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: 
- Use the `VITE_` prefix for Vite environment variables
- Never commit the `.env` file to version control (it should be in `.gitignore`)
- The `anon` key is safe to use in client-side code (Row Level Security policies protect your data)

Example:
```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.abcdefghijklmnopqrstuvwxyz
```

## Step 6: Set Up Row Level Security (RLS)

For production, you should enable Row Level Security:

1. Go to **Authentication** → **Policies** in Supabase
2. Create policies for each table to control access
3. For development, you can disable RLS temporarily (not recommended for production)

Example RLS policy (allow all for authenticated users):
```sql
-- Enable RLS on a table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policy (example)
CREATE POLICY "Allow authenticated users" ON products
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

## Step 7: Test Connection

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open the browser console
3. Look for:
   - ✅ `Supabase client initialized successfully` - Connection working
   - ⚠️ `Supabase connection test failed` - Check your credentials and tables

## Migration from PostgreSQL (pg library)

### Key Differences

1. **No Raw SQL in Client**: Supabase doesn't support raw SQL queries from the client. Use:
   - **PostgREST API**: `supabase.from('table').select('*')`
   - **RPC Functions**: Create SQL functions and call via `supabase.rpc('function_name')`
   - **Edge Functions**: For complex operations

2. **No Client-Side Transactions**: Transactions should be in Edge Functions or RPC functions

3. **Connection Pooling**: Managed automatically by Supabase

### Migration Steps

1. **Replace `query()` calls**: 
   - Instead of: `query('SELECT * FROM products')`
   - Use: `supabase.from('products').select('*')`

2. **Update Services**: 
   - Update service files to use Supabase PostgREST API
   - Create RPC functions for complex queries

3. **Update Transactions**:
   - Move transaction logic to Edge Functions or RPC functions

## Database Schema Overview

The same schema from `database/schema.sql` applies. Supabase uses PostgreSQL, so all your existing SQL works.

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

## Moroccan Business Fields

The schema includes all required Moroccan business identifiers:

- **ICE** (Identifiant Commun de l'Entreprise)
- **IF** (Identifiant Fiscal)
- **RC** (Registre de Commerce)
- **VAT Rate**: 20% (default, configurable per invoice)

## Troubleshooting

### Connection Issues

1. **"Supabase credentials not found"**
   - Make sure `.env` file exists in root directory
   - Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
   - Restart your dev server after changing `.env`

2. **"Invalid API key"**
   - Verify you copied the correct `anon` key (not `service_role`)
   - Check for extra spaces or newlines in `.env` file

3. **"Failed to fetch"**
   - Check your internet connection
   - Verify the Supabase URL is correct
   - Check if your Supabase project is active

### Query Issues

1. **"relation does not exist"**
   - Run the schema.sql file in SQL Editor
   - Verify table names match exactly (case-sensitive)

2. **"permission denied"**
   - Check Row Level Security policies
   - Verify you're using the correct API key
   - Check table permissions in Supabase dashboard

3. **Raw SQL queries not working**
   - Supabase client doesn't support raw SQL
   - Migrate to PostgREST API or create RPC functions
   - See migration guide above

## Next Steps

1. **Migrate Services**: Update service files to use Supabase PostgREST API
2. **Create RPC Functions**: For complex queries, create SQL functions
3. **Set Up Authentication**: Integrate Supabase Auth for user management
4. **Enable RLS**: Set up Row Level Security policies for production
5. **Set Up Realtime**: Enable realtime subscriptions if needed

## Resources

- Supabase Documentation: https://supabase.com/docs
- PostgREST API Reference: https://postgrest.org/en/stable/api.html
- Supabase JavaScript Client: https://supabase.com/docs/reference/javascript/introduction

## Support

For issues or questions:
- Supabase Documentation: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- GitHub Issues: https://github.com/supabase/supabase/issues
