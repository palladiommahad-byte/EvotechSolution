# How to Verify Supabase Integration

This guide will help you verify that your application is properly connected to Supabase and that data operations are working correctly.

## 1. Check Browser Console

Open your browser's developer console (F12 or Right-click → Inspect → Console) and look for:

### ✅ Successful Connection:
```
✅ Supabase client initialized successfully
```

### ❌ Connection Issues:
- If you see warnings about missing credentials, check your `.env` file
- If you see connection errors, verify your Supabase URL and API key

## 2. Verify in Supabase Dashboard

### Step 1: Log into Supabase
1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your project

### Step 2: Check the Table Editor
1. Navigate to **Table Editor** in the left sidebar
2. Look for the `contacts` table
3. You should see your contacts data here if everything is working

### Step 3: Test Data Creation
1. In your application, go to `/crm`
2. Click "Add Contact" and create a new client or supplier
3. Go back to Supabase Table Editor and refresh
4. You should see the new contact in the `contacts` table

### Step 4: Verify Data Structure
Check that the contacts table has these columns:
- `id` (uuid)
- `name` (text)
- `company` (text, nullable)
- `email` (text, nullable)
- `phone` (text, nullable)
- `city` (text, nullable)
- `address` (text, nullable)
- `ice` (text, nullable)
- `if_number` (text, nullable)
- `rc` (text, nullable)
- `contact_type` (text: 'client' or 'supplier')
- `status` (text: 'active' or 'inactive')
- `total_transactions` (integer, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## 3. Test CRUD Operations

### Create (POST)
1. In your app, create a new contact
2. Check Supabase Table Editor → `contacts` table
3. The new record should appear

### Read (GET)
1. Refresh the CRM page
2. Contacts should load from Supabase
3. Check browser Network tab (F12 → Network) for API calls to Supabase

### Update (PUT/PATCH)
1. Edit an existing contact
2. Save the changes
3. Check Supabase Table Editor → the record should be updated

### Delete (DELETE)
1. Delete a contact
2. Check Supabase Table Editor → the record should be removed

## 4. Check Network Requests

### Browser DevTools → Network Tab:
1. Open DevTools (F12)
2. Go to **Network** tab
3. Filter by "Fetch/XHR"
4. Perform CRUD operations in your app
5. You should see requests to your Supabase URL:
   - `POST /rest/v1/contacts` (Create)
   - `GET /rest/v1/contacts` (Read)
   - `PATCH /rest/v1/contacts` (Update)
   - `DELETE /rest/v1/contacts` (Delete)

## 5. Check Supabase Logs

### In Supabase Dashboard:
1. Go to **Logs** in the left sidebar
2. Select **API Logs** or **Database Logs**
3. You should see query logs for your operations

## 6. Common Issues & Solutions

### Issue: "Supabase URL and Anon Key are required"
**Solution:** 
- Check that `.env` file exists in the project root
- Verify it contains:
  ```
  VITE_SUPABASE_URL=your-project-url
  VITE_SUPABASE_ANON_KEY=your-anon-key
  ```
- Restart the dev server after adding/changing `.env`

### Issue: "relation 'contacts' does not exist"
**Solution:**
- The `contacts` table hasn't been created in Supabase
- Run the SQL schema from `database/schema.sql` in Supabase SQL Editor

### Issue: Data not persisting
**Solution:**
- Check browser console for errors
- Verify Row Level Security (RLS) policies in Supabase
- Check if RLS is enabled and if policies allow your operations

### Issue: 401 Unauthorized errors
**Solution:**
- Check your API key is correct
- Verify the key has the right permissions
- Check RLS policies in Supabase

## 7. Quick Test Script

You can also test the connection directly in the browser console:

```javascript
// Open browser console and run:
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

// Test: Fetch contacts
supabase.from('contacts').select('*').then(({ data, error }) => {
  console.log('Contacts:', data);
  console.log('Error:', error);
});
```

## 8. Verify RLS (Row Level Security)

### In Supabase Dashboard:
1. Go to **Authentication** → **Policies**
2. Select the `contacts` table
3. Check if RLS is enabled
4. If enabled, verify policies allow:
   - SELECT (for reading)
   - INSERT (for creating)
   - UPDATE (for updating)
   - DELETE (for deleting)

**Note:** For development, you might want to disable RLS temporarily or create permissive policies.

## 9. Expected Behavior

### ✅ Working Correctly:
- Contacts load when you open `/crm`
- Creating a contact saves to Supabase
- Editing a contact updates Supabase
- Deleting a contact removes from Supabase
- Data persists after page refresh
- No errors in browser console

### ❌ Not Working:
- Contacts don't load (check console for errors)
- Creating/editing doesn't save (check network requests)
- 401/403 errors (check API key and RLS policies)
- 404 errors (check table name and schema)

## 10. Next Steps

Once verified:
1. Test with multiple contacts
2. Verify filtering and search work
3. Test with different contact types (client vs supplier)
4. Check that data persists across sessions
