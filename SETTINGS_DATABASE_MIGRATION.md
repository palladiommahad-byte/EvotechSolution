# Settings Database Migration Complete ✅

All settings-related functionality has been migrated from localStorage to the database using Supabase.

## What Was Migrated

### 1. **Company Settings** (`CompanyContext`)
- ✅ Company information (name, legal form, contact details)
- ✅ Moroccan business identifiers (ICE, IF, RC, TP, CNSS)
- ✅ Logo and footer text
- **Database Table**: `company_settings`
- **Service**: `settingsService.getCompanySettings()`, `settingsService.updateCompanySettings()`

### 2. **User Preferences** (`WarehouseContext` + Theme)
- ✅ Active warehouse selection (per user)
- ✅ Theme color preferences
- ✅ Notification preferences
- **Database Table**: `user_preferences`
- **Service**: `settingsService.getUserPreferences()`, `settingsService.updateUserPreferences()`

### 3. **Warehouses** (`WarehouseContext`)
- ✅ Warehouse CRUD operations
- ✅ Warehouse information (name, city, address, phone, email)
- **Database Table**: `warehouses`
- **Service**: `settingsService.getWarehouses()`, `settingsService.createWarehouse()`, etc.

### 4. **Users** (`AuthContext` + Settings Page)
- ✅ User authentication
- ✅ User CRUD operations
- ✅ User status management
- ✅ Last login tracking
- **Database Table**: `users`
- **Service**: `settingsService.getUsers()`, `settingsService.getUserByEmail()`, etc.

### 5. **Notifications** (`NotificationContext`)
- ✅ Notification CRUD operations
- ✅ Read/unread status tracking
- ✅ Notification types (info, success, warning, error)
- ✅ Action URLs and labels
- **Database Table**: `notifications`
- **Service**: `settingsService.getNotifications()`, `settingsService.createNotification()`, etc.

## Files Created/Modified

### New Files
1. **`src/services/settings.service.ts`**
   - Complete database service for all settings operations
   - Type-safe interfaces for all data structures
   - Error handling and fallback support

2. **`src/hooks/useSettings.ts`**
   - React Query hooks for all settings operations
   - Automatic caching and refetching
   - Mutation hooks with query invalidation

### Updated Files
1. **`src/contexts/CompanyContext.tsx`**
   - Now uses `useCompanySettings()` and `useUpdateCompanySettings()`
   - localStorage as fallback
   - Async `updateCompanyInfo()` function

2. **`src/contexts/WarehouseContext.tsx`**
   - Now uses `useWarehouses()` and warehouse mutations
   - Active warehouse stored in `user_preferences` table
   - Async CRUD operations

3. **`src/contexts/NotificationContext.tsx`**
   - Now uses `useNotifications()` and notification mutations
   - Real-time unread count tracking
   - Async operations

4. **`src/contexts/AuthContext.tsx`**
   - Now uses `settingsService.getUserByEmail()` for authentication
   - Database-first with localStorage fallback
   - User status checking from database

## Usage Examples

### Company Settings
```typescript
import { useCompany } from '@/contexts/CompanyContext';

const { companyInfo, updateCompanyInfo, isLoading } = useCompany();

// Update company info
await updateCompanyInfo({
  name: 'New Company Name',
  ice: '001234567890123',
});
```

### Warehouses
```typescript
import { useWarehouse } from '@/contexts/WarehouseContext';

const { warehouses, addWarehouse, setActiveWarehouse } = useWarehouse();

// Add warehouse
await addWarehouse({
  name: 'Casablanca Warehouse',
  city: 'Casablanca',
  address: '123 Main St',
});

// Set active warehouse
await setActiveWarehouse('casablanca');
```

### Notifications
```typescript
import { useNotifications } from '@/contexts/NotificationContext';

const { notifications, addNotification, markAsRead } = useNotifications();

// Add notification
await addNotification({
  title: 'Low Stock Alert',
  message: 'Product XYZ is running low',
  type: 'warning',
});

// Mark as read
await markAsRead(notificationId);
```

### Users (in Settings page)
```typescript
import { useUsers, useCreateUser, useUpdateUser } from '@/hooks/useSettings';

const { data: users } = useUsers();
const createUser = useCreateUser();
const updateUser = useUpdateUser();

// Create user
await createUser.mutateAsync({
  name: 'John Doe',
  email: 'john@example.com',
  password_hash: hashPassword('password123'),
  role_id: 'manager',
  status: 'active',
});
```

## Database Schema

All tables are already defined in `database/schema.sql`:

- `company_settings` - Single row table for company info
- `user_preferences` - User-specific preferences (one per user)
- `warehouses` - Warehouse locations
- `users` - User accounts with roles
- `notifications` - Application notifications

## Features

### ✅ Database-First Approach
- All settings are stored in PostgreSQL
- Real-time synchronization across users
- Persistent data across sessions

### ✅ localStorage Fallback
- Automatic fallback if database is unavailable
- Seamless offline support
- No breaking changes for existing users

### ✅ User-Specific Settings
- Active warehouse preference per user
- Theme preferences per user
- Notification preferences per user

### ✅ Type Safety
- Full TypeScript support
- Type-safe interfaces for all data structures
- Compile-time error checking

### ✅ React Query Integration
- Automatic caching
- Background refetching
- Optimistic updates
- Query invalidation on mutations

## Migration Notes

### For Existing Users
- Existing localStorage data will be used as fallback
- New data will be saved to database
- You can manually migrate localStorage data to database if needed

### For New Installations
- Database will be the primary source
- Default data is inserted via `schema.sql`
- No localStorage required

## Testing

To test the migration:

1. **Company Settings**: Go to Settings → Company tab, update info, refresh page
2. **Warehouses**: Go to Settings → Warehouses tab, add/edit/delete warehouses
3. **Users**: Go to Settings → Users & Roles tab, manage users
4. **Notifications**: Check notification dropdown, add/mark as read
5. **Authentication**: Log in with database users

## Troubleshooting

### Database Connection Issues
- Settings will automatically fallback to localStorage
- Check Supabase credentials in `.env` file
- Verify database schema is applied

### User Authentication
- Database authentication is tried first
- Falls back to localStorage if database fails
- Check user status in database (must be 'active')

### Notifications Not Showing
- Check if user is logged in (notifications are user-specific)
- Verify `notifications` table exists in database
- Check browser console for errors

## Next Steps

1. **Production Deployment**:
   - Ensure Supabase project is set up
   - Run `database/schema.sql` in Supabase SQL Editor
   - Configure environment variables

2. **Data Migration** (if needed):
   - Export localStorage data
   - Import to database using service functions
   - Verify data integrity

3. **Security**:
   - Enable Row Level Security (RLS) in Supabase
   - Configure RLS policies for each table
   - Review access permissions

4. **Performance**:
   - Monitor query performance
   - Add indexes if needed
   - Optimize React Query cache settings

## Support

For issues or questions:
- Check database connection in Supabase dashboard
- Review browser console for errors
- Verify environment variables are set correctly
- Check that all tables exist in database
