# Settings Database Schema - Quick Reference

## Overview

This document provides a quick reference for the settings-related database tables, functions, and views.

## Tables

### 1. `company_settings`
Single-row table storing company information.

**Key Fields:**
- `name` - Company name
- `legal_form` - Legal form (SARL, SA, etc.)
- `ice`, `if_number`, `rc`, `tp`, `cnss` - Moroccan business identifiers
- `logo` - Base64 encoded logo or URL
- `footer_text` - Footer text for documents

**Constraints:**
- Only one row allowed (enforced by unique index)

### 2. `user_preferences`
User-specific preferences (one row per user).

**Key Fields:**
- `user_id` - Foreign key to users table
- `theme_color` - Theme preference (navy, indigo, blue, etc.)
- `active_warehouse_id` - Currently active warehouse
- `browser_notifications_enabled` - Browser notification preference
- `low_stock_alerts_enabled` - Low stock alert preference
- `order_updates_enabled` - Order update notification preference

**Constraints:**
- One row per user (UNIQUE constraint on user_id)

### 3. `warehouses`
Warehouse locations and information.

**Key Fields:**
- `id` - Warehouse ID (VARCHAR, primary key)
- `name` - Warehouse name
- `city` - City location
- `address`, `phone`, `email` - Contact information

### 4. `users`
User accounts with authentication.

**Key Fields:**
- `id` - UUID primary key
- `email` - User email (unique)
- `name` - User name
- `password_hash` - Hashed password
- `role_id` - Foreign key to roles table
- `status` - 'active' or 'inactive'
- `last_login` - Last login timestamp

### 5. `notifications`
Application notifications.

**Key Fields:**
- `id` - UUID primary key
- `user_id` - NULL for global notifications, UUID for user-specific
- `title` - Notification title
- `message` - Notification message
- `type` - 'info', 'success', 'warning', or 'error'
- `read` - Boolean read status
- `action_url` - Optional URL for action
- `action_label` - Optional label for action button

## Functions

### User Preferences
- `get_or_create_user_preferences(p_user_id)` - Get or create preferences
- `update_user_preferences(...)` - Update user preferences

### Notifications
- `create_notification(...)` - Create new notification
- `mark_notification_read(p_notification_id, p_user_id)` - Mark as read
- `mark_all_notifications_read(p_user_id)` - Mark all as read
- `get_unread_notification_count(p_user_id)` - Get unread count

### Company Settings
- `update_company_settings(...)` - Update company settings
- `get_company_settings()` - Get company settings (from optimizations)

### Helper Functions
- `get_user_with_preferences(p_user_id)` - Get user with preferences
- `get_settings_statistics()` - Get settings statistics
- `can_delete_warehouse(p_warehouse_id)` - Validate warehouse deletion
- `can_delete_user(p_user_id)` - Validate user deletion
- `cleanup_old_notifications()` - Clean up old notifications

## Views

### Main Views
- `user_preferences_view` - User preferences with warehouse info
- `user_notifications_view` - User notifications with time calculations
- `company_settings_view` - Company settings with formatted display
- `users_with_preferences_view` - Users with preferences summary
- `warehouse_usage_view` - Warehouse usage statistics
- `notification_summary_view` - Notification summary by type
- `settings_audit_view` - Recent settings changes (last 30 days)

## Indexes

### Performance Indexes
- `idx_notifications_user_read` - For faster unread count queries
- `idx_notifications_created_at` - For sorting notifications
- `idx_company_settings_updated` - For change tracking
- `idx_user_preferences_updated` - For change tracking

## Usage Examples

### Get Company Settings
```sql
SELECT * FROM company_settings_view;
```

### Get User Preferences
```sql
SELECT * FROM user_preferences_view WHERE user_id = 'user-uuid';
```

### Get Unread Notifications Count
```sql
SELECT get_unread_notification_count('user-uuid');
```

### Get Settings Statistics
```sql
SELECT * FROM get_settings_statistics();
```

### Update Company Settings
```sql
SELECT update_company_settings(
    p_name := 'New Company Name',
    p_ice := '001234567890123'
);
```

### Update User Preferences
```sql
SELECT update_user_preferences(
    p_user_id := 'user-uuid',
    p_theme_color := 'blue',
    p_active_warehouse_id := 'marrakech'
);
```

## Setup Instructions

1. **Run Main Schema:**
   ```sql
   -- Run database/schema.sql first
   ```

2. **Run Optimizations:**
   ```sql
   -- Run database/settings_optimizations.sql
   ```

3. **Verify Setup:**
   ```sql
   -- Check all tables exist
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
     AND table_name IN (
       'company_settings', 
       'user_preferences', 
       'warehouses', 
       'users', 
       'notifications'
     );
   ```

## Maintenance

### Clean Up Old Notifications
```sql
SELECT cleanup_old_notifications();
```

### Check Settings Statistics
```sql
SELECT * FROM get_settings_statistics();
```

### View Recent Changes
```sql
SELECT * FROM settings_audit_view LIMIT 20;
```

## Security Notes

- All functions use `SECURITY DEFINER` for elevated privileges
- For production, enable Row Level Security (RLS)
- Review and restrict function access as needed
- Consider using service role key for sensitive operations

## Related Files

- `database/schema.sql` - Main database schema
- `database/settings_optimizations.sql` - Additional optimizations
- `src/services/settings.service.ts` - TypeScript service
- `src/hooks/useSettings.ts` - React Query hooks
- `SETTINGS_DATABASE_MIGRATION.md` - Migration guide
