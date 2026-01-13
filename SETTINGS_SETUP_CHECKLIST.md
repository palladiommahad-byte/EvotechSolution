# Settings Database Setup - Complete Checklist

Use this checklist to ensure your settings system is properly set up and configured.

## ✅ Pre-Setup Verification

- [ ] Supabase project created
- [ ] Supabase credentials obtained (URL and anon key)
- [ ] `.env` file created with credentials
- [ ] Database connection tested

## 📋 Database Setup

### Step 1: Run Main Schema
- [ ] Open Supabase SQL Editor
- [ ] Copy contents of `database/schema.sql`
- [ ] Execute the SQL script
- [ ] Verify no errors occurred
- [ ] Check that all tables were created:
  - [ ] `company_settings`
  - [ ] `user_preferences`
  - [ ] `warehouses`
  - [ ] `users`
  - [ ] `notifications`
  - [ ] `roles`

### Step 2: Run Optimizations (Optional but Recommended)
- [ ] Copy contents of `database/settings_optimizations.sql`
- [ ] Execute the SQL script
- [ ] Verify indexes were created
- [ ] Verify views were created
- [ ] Verify helper functions were created

### Step 3: Verify Default Data
- [ ] Check that default warehouses exist:
  ```sql
  SELECT * FROM warehouses;
  ```
- [ ] Check that default company settings exist:
  ```sql
  SELECT * FROM company_settings;
  ```
- [ ] Check that default roles exist:
  ```sql
  SELECT * FROM roles;
  ```

## 🔧 Application Setup

### Step 4: Verify Service Files
- [ ] `src/services/settings.service.ts` exists
- [ ] `src/hooks/useSettings.ts` exists
- [ ] No TypeScript errors in service files
- [ ] No linting errors

### Step 5: Verify Context Updates
- [ ] `src/contexts/CompanyContext.tsx` updated
- [ ] `src/contexts/WarehouseContext.tsx` updated
- [ ] `src/contexts/NotificationContext.tsx` updated
- [ ] `src/contexts/AuthContext.tsx` updated
- [ ] All contexts compile without errors

### Step 6: Test Application
- [ ] Start development server: `npm run dev`
- [ ] Check browser console for Supabase connection message
- [ ] Verify no connection errors
- [ ] Test login functionality
- [ ] Test settings page loads

## 🧪 Functionality Testing

### Company Settings
- [ ] Navigate to Settings → Company tab
- [ ] View company information loads from database
- [ ] Update company name
- [ ] Refresh page - changes persist
- [ ] Update ICE/IF/RC fields
- [ ] Upload logo
- [ ] Update footer text

### Warehouses
- [ ] Navigate to Settings → Warehouses tab
- [ ] View warehouses list loads from database
- [ ] Add new warehouse
- [ ] Edit existing warehouse
- [ ] Delete warehouse (if allowed)
- [ ] Set active warehouse
- [ ] Refresh page - active warehouse persists

### Users
- [ ] Navigate to Settings → Users & Roles tab
- [ ] View users list loads from database
- [ ] Add new user
- [ ] Edit existing user
- [ ] Change user status (active/inactive)
- [ ] Delete user (if allowed)
- [ ] Test login with database user

### Notifications
- [ ] Check notification dropdown
- [ ] View notifications load from database
- [ ] Create test notification
- [ ] Mark notification as read
- [ ] Mark all notifications as read
- [ ] Delete notification
- [ ] Verify unread count updates

### User Preferences
- [ ] Change theme color
- [ ] Refresh page - theme persists
- [ ] Change active warehouse
- [ ] Refresh page - warehouse persists
- [ ] Update notification preferences
- [ ] Verify preferences saved per user

## 🔒 Security Setup (Production)

### Row Level Security
- [ ] Enable RLS on `company_settings`
- [ ] Enable RLS on `user_preferences`
- [ ] Enable RLS on `warehouses`
- [ ] Enable RLS on `users`
- [ ] Enable RLS on `notifications`
- [ ] Create RLS policies for each table
- [ ] Test policies with different user roles

### Authentication
- [ ] Implement proper password hashing (bcrypt)
- [ ] Set up password reset flow (if needed)
- [ ] Configure session management
- [ ] Set up user role verification
- [ ] Test authentication with different roles

## 📊 Monitoring & Maintenance

### Database Monitoring
- [ ] Set up database backups
- [ ] Configure backup schedule
- [ ] Test backup restoration
- [ ] Monitor database size
- [ ] Set up query performance monitoring

### Application Monitoring
- [ ] Set up error logging
- [ ] Monitor API response times
- [ ] Track settings change events
- [ ] Set up alerts for critical errors

### Maintenance Tasks
- [ ] Schedule notification cleanup (old read notifications)
- [ ] Review and optimize slow queries
- [ ] Update indexes as needed
- [ ] Review and clean up unused data

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Fails
- [ ] Check `.env` file has correct credentials
- [ ] Verify Supabase project is active
- [ ] Check network connectivity
- [ ] Verify API keys are correct
- [ ] Check browser console for errors

#### Settings Not Saving
- [ ] Check browser console for errors
- [ ] Verify database connection
- [ ] Check RLS policies (if enabled)
- [ ] Verify user has proper permissions
- [ ] Check network tab for API errors

#### Notifications Not Showing
- [ ] Verify user is logged in
- [ ] Check `notifications` table has data
- [ ] Verify user_id matches logged-in user
- [ ] Check notification query in browser console
- [ ] Verify React Query cache

#### Active Warehouse Not Persisting
- [ ] Check `user_preferences` table
- [ ] Verify user_id is correct
- [ ] Check warehouse_id exists in warehouses table
- [ ] Verify update mutation succeeded
- [ ] Check browser console for errors

## 📝 Documentation

- [ ] Read `SETTINGS_DATABASE_MIGRATION.md`
- [ ] Read `SETTINGS_IMPLEMENTATION_SUMMARY.md`
- [ ] Read `database/README_SETTINGS.md`
- [ ] Review service API documentation
- [ ] Review hooks API documentation

## ✅ Final Verification

### Database Verification Query
Run this query to verify everything is set up:
```sql
SELECT 
    'company_settings' as table_name,
    COUNT(*) as row_count
FROM company_settings

UNION ALL

SELECT 
    'user_preferences' as table_name,
    COUNT(*) as row_count
FROM user_preferences

UNION ALL

SELECT 
    'warehouses' as table_name,
    COUNT(*) as row_count
FROM warehouses

UNION ALL

SELECT 
    'users' as table_name,
    COUNT(*) as row_count
FROM users

UNION ALL

SELECT 
    'notifications' as table_name,
    COUNT(*) as row_count
FROM notifications;
```

### Application Verification
- [ ] All settings pages load without errors
- [ ] All CRUD operations work
- [ ] Data persists across page refreshes
- [ ] User-specific preferences work correctly
- [ ] Notifications update in real-time
- [ ] No console errors
- [ ] Performance is acceptable

## 🎉 Completion

Once all items are checked:
- [ ] Settings system is fully operational
- [ ] Database is properly configured
- [ ] Application is ready for use
- [ ] Security measures are in place (for production)
- [ ] Documentation is complete

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the documentation files
3. Check browser console for errors
4. Verify database connection
5. Review Supabase logs

## 🚀 Next Steps

After setup is complete:
1. **Test thoroughly** - Test all functionality
2. **Enable RLS** - Set up Row Level Security for production
3. **Set up backups** - Configure regular database backups
4. **Monitor performance** - Track query performance
5. **Gather feedback** - Get user feedback on settings functionality

---

**Last Updated:** Settings Database Migration Complete
**Status:** ✅ Ready for Production (after security setup)
