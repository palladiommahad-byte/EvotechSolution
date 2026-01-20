-- ============================================
-- SETTINGS SYSTEM OPTIMIZATIONS & HELPER VIEWS
-- ============================================
-- This file contains additional optimizations and views for the settings system
-- Run this after the main schema.sql file

-- ============================================
-- ADDITIONAL INDEXES FOR PERFORMANCE
-- ============================================

-- Index for notifications by user and read status (for faster unread count queries)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON notifications(user_id, read) 
WHERE read = FALSE;

-- Index for notifications by created_at (for sorting)
CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
ON notifications(created_at DESC);

-- Index for company_settings updated_at (for change tracking)
CREATE INDEX IF NOT EXISTS idx_company_settings_updated 
ON company_settings(updated_at DESC);

-- Index for user_preferences updated_at (for change tracking)
CREATE INDEX IF NOT EXISTS idx_user_preferences_updated 
ON user_preferences(updated_at DESC);

-- ============================================
-- HELPER VIEWS FOR SETTINGS
-- ============================================

-- View: Company settings with formatted display
CREATE OR REPLACE VIEW company_settings_view AS
SELECT 
    id,
    name,
    legal_form,
    email,
    phone,
    address,
    ice,
    if_number,
    rc,
    tp,
    cnss,
    logo,
    footer_text,
    created_at,
    updated_at,
    -- Formatted display fields
    CASE 
        WHEN ice IS NOT NULL AND ice != '' THEN CONCAT('ICE: ', ice)
        ELSE NULL
    END AS ice_display,
    CASE 
        WHEN if_number IS NOT NULL AND if_number != '' THEN CONCAT('IF: ', if_number)
        ELSE NULL
    END AS if_display,
    CASE 
        WHEN rc IS NOT NULL AND rc != '' THEN CONCAT('RC: ', rc)
        ELSE NULL
    END AS rc_display,
    -- Check if logo exists
    CASE 
        WHEN logo IS NOT NULL AND logo != '' THEN TRUE
        ELSE FALSE
    END AS has_logo
FROM company_settings
LIMIT 1;

-- View: Users with preferences summary
CREATE OR REPLACE VIEW users_with_preferences_view AS
SELECT 
    u.id,
    u.email,
    u.name,
    u.role_id,
    r.name as role_name,
    u.status,
    u.last_login,
    u.created_at,
    u.updated_at,
    -- Preferences
    up.theme_color,
    up.active_warehouse_id,
    w.name as active_warehouse_name,
    up.browser_notifications_enabled,
    up.low_stock_alerts_enabled,
    up.order_updates_enabled,
    -- Statistics
    (SELECT COUNT(*) FROM notifications n 
     WHERE (n.user_id = u.id OR n.user_id IS NULL) AND n.read = FALSE) as unread_notifications_count,
    (SELECT COUNT(*) FROM notifications n 
     WHERE n.user_id = u.id OR n.user_id IS NULL) as total_notifications_count
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
LEFT JOIN user_preferences up ON u.id = up.user_id
LEFT JOIN warehouses w ON up.active_warehouse_id = w.id;

-- View: Warehouse usage statistics
CREATE OR REPLACE VIEW warehouse_usage_view AS
SELECT 
    w.id,
    w.name,
    w.city,
    w.address,
    w.phone,
    w.email,
    w.created_at,
    w.updated_at,
    -- Statistics
    (SELECT COUNT(*) FROM user_preferences up WHERE up.active_warehouse_id = w.id) as active_users_count,
    (SELECT COUNT(*) FROM stock_items si WHERE si.warehouse_id = w.id) as stock_items_count,
    (SELECT COALESCE(SUM(si.quantity), 0) FROM stock_items si WHERE si.warehouse_id = w.id) as total_stock_quantity
FROM warehouses w;

-- View: Notification summary by type
CREATE OR REPLACE VIEW notification_summary_view AS
SELECT 
    type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE read = FALSE) as unread_count,
    COUNT(*) FILTER (WHERE read = TRUE) as read_count,
    COUNT(*) FILTER (WHERE user_id IS NULL) as global_count,
    COUNT(*) FILTER (WHERE user_id IS NOT NULL) as user_specific_count,
    MAX(created_at) as latest_notification
FROM notifications
GROUP BY type;

-- View: Settings audit log (recent changes)
CREATE OR REPLACE VIEW settings_audit_view AS
SELECT 
    'company_settings' as table_name,
    id::TEXT as record_id,
    'Company Settings' as record_name,
    updated_at as changed_at,
    NULL::UUID as changed_by_user_id,
    NULL::TEXT as changed_by_user_name
FROM company_settings
WHERE updated_at > CURRENT_TIMESTAMP - INTERVAL '30 days'

UNION ALL

SELECT 
    'user_preferences' as table_name,
    up.id::TEXT as record_id,
    CONCAT('Preferences for ', u.name) as record_name,
    up.updated_at as changed_at,
    up.user_id as changed_by_user_id,
    u.name as changed_by_user_name
FROM user_preferences up
JOIN users u ON up.user_id = u.id
WHERE up.updated_at > CURRENT_TIMESTAMP - INTERVAL '30 days'

UNION ALL

SELECT 
    'warehouses' as table_name,
    w.id as record_id,
    w.name as record_name,
    w.updated_at as changed_at,
    NULL::UUID as changed_by_user_id,
    NULL::TEXT as changed_by_user_name
FROM warehouses w
WHERE w.updated_at > CURRENT_TIMESTAMP - INTERVAL '30 days'

ORDER BY changed_at DESC;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function: Get company settings (simplified)
CREATE OR REPLACE FUNCTION get_company_settings()
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    legal_form VARCHAR,
    email VARCHAR,
    phone VARCHAR,
    address TEXT,
    ice VARCHAR,
    if_number VARCHAR,
    rc VARCHAR,
    tp VARCHAR,
    cnss VARCHAR,
    logo TEXT,
    footer_text TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.id,
        cs.name,
        cs.legal_form,
        cs.email,
        cs.phone,
        cs.address,
        cs.ice,
        cs.if_number,
        cs.rc,
        cs.tp,
        cs.cnss,
        cs.logo,
        cs.footer_text,
        cs.created_at,
        cs.updated_at
    FROM company_settings cs
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get user with preferences (for dashboard/user info)
CREATE OR REPLACE FUNCTION get_user_with_preferences(p_user_id UUID)
RETURNS TABLE (
    user_id UUID,
    email VARCHAR,
    name VARCHAR,
    role_id VARCHAR,
    role_name VARCHAR,
    status VARCHAR,
    last_login TIMESTAMP,
    theme_color VARCHAR,
    active_warehouse_id VARCHAR,
    active_warehouse_name VARCHAR,
    unread_notifications_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.email,
        u.name,
        u.role_id,
        r.name as role_name,
        u.status,
        u.last_login,
        up.theme_color,
        up.active_warehouse_id,
        w.name as active_warehouse_name,
        (SELECT COUNT(*) FROM notifications n 
         WHERE (n.user_id = u.id OR n.user_id IS NULL) AND n.read = FALSE) as unread_notifications_count
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    LEFT JOIN user_preferences up ON u.id = up.user_id
    LEFT JOIN warehouses w ON up.active_warehouse_id = w.id
    WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get settings statistics (for admin dashboard)
CREATE OR REPLACE FUNCTION get_settings_statistics()
RETURNS TABLE (
    total_users BIGINT,
    active_users BIGINT,
    total_warehouses BIGINT,
    total_notifications BIGINT,
    unread_notifications BIGINT,
    users_with_preferences BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE status = 'active') as active_users,
        (SELECT COUNT(*) FROM warehouses) as total_warehouses,
        (SELECT COUNT(*) FROM notifications) as total_notifications,
        (SELECT COUNT(*) FROM notifications WHERE read = FALSE) as unread_notifications,
        (SELECT COUNT(*) FROM user_preferences) as users_with_preferences;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for company_settings (if not already exists)
DROP TRIGGER IF EXISTS update_company_settings_updated_at ON company_settings;
CREATE TRIGGER update_company_settings_updated_at
    BEFORE UPDATE ON company_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_preferences (if not already exists)
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for warehouses (if not already exists)
DROP TRIGGER IF EXISTS update_warehouses_updated_at ON warehouses;
CREATE TRIGGER update_warehouses_updated_at
    BEFORE UPDATE ON warehouses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DATA VALIDATION FUNCTIONS
-- ============================================

-- Function: Validate warehouse can be deleted
CREATE OR REPLACE FUNCTION can_delete_warehouse(p_warehouse_id VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_count INTEGER;
    v_stock_count INTEGER;
BEGIN
    -- Check if any users have this as active warehouse
    SELECT COUNT(*) INTO v_user_count
    FROM user_preferences
    WHERE active_warehouse_id = p_warehouse_id;
    
    -- Check if any stock items exist for this warehouse
    SELECT COUNT(*) INTO v_stock_count
    FROM stock_items
    WHERE warehouse_id = p_warehouse_id;
    
    -- Can delete if no users and no stock items
    RETURN (v_user_count = 0 AND v_stock_count = 0);
END;
$$ LANGUAGE plpgsql;

-- Function: Validate user can be deleted
CREATE OR REPLACE FUNCTION can_delete_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_total_users INTEGER;
BEGIN
    -- Check if user is admin
    SELECT role_id = 'admin' INTO v_is_admin
    FROM users
    WHERE id = p_user_id;
    
    -- Check total admin count
    SELECT COUNT(*) INTO v_total_users
    FROM users
    WHERE role_id = 'admin' AND status = 'active';
    
    -- Cannot delete if:
    -- 1. User is admin AND
    -- 2. There's only one active admin
    IF v_is_admin AND v_total_users <= 1 THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CLEANUP FUNCTIONS
-- ============================================

-- Function: Clean up old read notifications (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM notifications
    WHERE read = TRUE 
      AND read_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Query to verify all settings tables exist and have data
-- Run this to check if everything is set up correctly
/*
SELECT 
    'company_settings' as table_name,
    COUNT(*) as row_count,
    MAX(updated_at) as last_updated
FROM company_settings

UNION ALL

SELECT 
    'user_preferences' as table_name,
    COUNT(*) as row_count,
    MAX(updated_at) as last_updated
FROM user_preferences

UNION ALL

SELECT 
    'warehouses' as table_name,
    COUNT(*) as row_count,
    MAX(updated_at) as last_updated
FROM warehouses

UNION ALL

SELECT 
    'users' as table_name,
    COUNT(*) as row_count,
    MAX(updated_at) as last_updated
FROM users

UNION ALL

SELECT 
    'notifications' as table_name,
    COUNT(*) as row_count,
    MAX(created_at) as last_updated
FROM notifications

ORDER BY table_name;
*/
