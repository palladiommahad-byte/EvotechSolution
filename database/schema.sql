-- EVOTECH SOLUTIONS - PostgreSQL Schema for Moroccan Inventory Hub
-- This schema supports Moroccan business requirements (ICE, IF, RC, 20% VAT)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- WAREHOUSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS warehouses (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default warehouses
INSERT INTO warehouses (id, name, city) VALUES
    ('marrakech', 'Marrakech Warehouse', 'Marrakech'),
    ('agadir', 'Agadir Warehouse', 'Agadir'),
    ('ouarzazate', 'Ouarzazate Warehouse', 'Ouarzazate')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- COMPANY SETTINGS TABLE (CompanyContext)
-- ============================================
CREATE TABLE IF NOT EXISTS company_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    legal_form VARCHAR(50),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    -- Moroccan business identifiers
    ice VARCHAR(50), -- Identifiant Commun de l'Entreprise
    if_number VARCHAR(50), -- Identifiant Fiscal
    rc VARCHAR(50), -- Registre de Commerce
    tp VARCHAR(50), -- Taxe Professionnelle
    cnss VARCHAR(50), -- CNSS number
    logo TEXT, -- Base64 encoded logo or URL - displayed on login page (left panel, mobile header, login form card)
    footer_text TEXT, -- Footer text for documents
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_company_settings_ice ON company_settings(ice);

-- Ensure only one company_settings row exists using a unique constraint on a constant
-- This is a PostgreSQL trick to enforce single-row constraint
CREATE UNIQUE INDEX IF NOT EXISTS company_settings_single_row ON company_settings ((1));

-- Insert default company settings
INSERT INTO company_settings (
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
    footer_text
) VALUES (
    uuid_generate_v4(),
    'EVOTECH Solutions SARL',
    'SARL',
    'contact@evotech.ma',
    '+212 5 24 45 67 89',
    'Zone Industrielle, Lot 123, Marrakech 40000, Morocco',
    '001234567890123',
    '12345678',
    '123456 - Marrakech',
    '12345678',
    '1234567',
    'Merci pour votre confiance. Paiement à 30 jours. TVA 20%.'
) ON CONFLICT DO NOTHING;

-- ============================================
-- ROLES TABLE (MUST BE BEFORE USERS)
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default roles
INSERT INTO roles (id, name, description) VALUES
    ('admin', 'Administrator', 'Full system access with all permissions'),
    ('manager', 'Manager', 'Access to all operational features except user management'),
    ('accountant', 'Accountant', 'Access to Dashboard and Reports only'),
    ('staff', 'Staff', 'Access to Dashboard, Inventory, and Stock Tracking')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ROUTES TABLE (Application Routes/Pages)
-- ============================================
CREATE TABLE IF NOT EXISTS routes (
    id VARCHAR(100) PRIMARY KEY,
    path VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert application routes
INSERT INTO routes (id, path, name, description, icon) VALUES
    ('dashboard', '/', 'Dashboard', 'Main dashboard with KPIs and charts', 'LayoutDashboard'),
    ('inventory', '/inventory', 'All Items', 'Product inventory management', 'Package'),
    ('crm', '/crm', 'CRM', 'Customer and supplier relationship management', 'Users'),
    ('invoicing', '/invoicing', 'Invoicing', 'Invoice and document management', 'FileText'),
    ('purchases', '/purchases', 'Purchases', 'Purchase order management', 'ShoppingCart'),
    ('sales', '/sales', 'Sales', 'Sales order and invoice management', 'TrendingUp'),
    ('stock-tracking', '/stock-tracking', 'Stock Tracking', 'Track stock movements', 'BarChart3'),
    ('tax-reports', '/tax-reports', 'Tax Reports', 'Tax reporting and compliance', 'FileSpreadsheet'),
    ('treasury', '/treasury', 'Treasury', 'Financial management and cash flow', 'Wallet'),
    ('settings', '/settings', 'Settings', 'Application settings and configuration', 'Settings')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ROLE_ROUTES TABLE (Role-Based Access Control)
-- ============================================
CREATE TABLE IF NOT EXISTS role_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id VARCHAR(50) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    route_id VARCHAR(100) NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    can_access BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, route_id)
);

-- Insert default role-route mappings
INSERT INTO role_routes (role_id, route_id, can_access) VALUES
    -- Admin: All routes
    ('admin', 'dashboard', TRUE),
    ('admin', 'inventory', TRUE),
    ('admin', 'crm', TRUE),
    ('admin', 'invoicing', TRUE),
    ('admin', 'purchases', TRUE),
    ('admin', 'sales', TRUE),
    ('admin', 'stock-tracking', TRUE),
    ('admin', 'tax-reports', TRUE),
    ('admin', 'treasury', TRUE),
    ('admin', 'settings', TRUE),
    -- Manager: All except settings (or limited settings)
    ('manager', 'dashboard', TRUE),
    ('manager', 'inventory', TRUE),
    ('manager', 'crm', TRUE),
    ('manager', 'invoicing', TRUE),
    ('manager', 'purchases', TRUE),
    ('manager', 'sales', TRUE),
    ('manager', 'stock-tracking', TRUE),
    ('manager', 'tax-reports', TRUE),
    ('manager', 'treasury', TRUE),
    ('manager', 'settings', TRUE),
    -- Accountant: Dashboard, Reports, Treasury
    ('accountant', 'dashboard', TRUE),
    ('accountant', 'tax-reports', TRUE),
    ('accountant', 'treasury', TRUE),
    -- Staff: Dashboard, Inventory, Stock Tracking
    ('staff', 'dashboard', TRUE),
    ('staff', 'inventory', TRUE),
    ('staff', 'stock-tracking', TRUE)
ON CONFLICT (role_id, route_id) DO NOTHING;

-- Create indexes for role_routes
CREATE INDEX IF NOT EXISTS idx_role_routes_role ON role_routes(role_id);
CREATE INDEX IF NOT EXISTS idx_role_routes_route ON role_routes(route_id);
CREATE INDEX IF NOT EXISTS idx_role_routes_access ON role_routes(can_access);

-- ============================================
-- USERS TABLE (MUST BE BEFORE user_preferences)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id VARCHAR(50) NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ============================================
-- USER PREFERENCES TABLE (ThemeContext & WarehouseContext)
-- ============================================
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Theme preferences
    theme_color VARCHAR(20) DEFAULT 'navy' CHECK (theme_color IN ('navy', 'indigo', 'blue', 'sky', 'teal', 'slate', 'rose', 'cyan', 'yellow')),
    -- Language preference
    language VARCHAR(10) DEFAULT 'en' CHECK (language IN ('en', 'fr')),
    -- Warehouse preferences
    active_warehouse_id VARCHAR(50) REFERENCES warehouses(id) ON DELETE SET NULL,
    -- Notification preferences
    browser_notifications_enabled BOOLEAN DEFAULT TRUE,
    low_stock_alerts_enabled BOOLEAN DEFAULT TRUE,
    order_updates_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_warehouse ON user_preferences(active_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_language ON user_preferences(language);

-- ============================================
-- NOTIFICATIONS TABLE (NotificationContext)
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL means notification for all users
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
    read BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(255), -- URL to navigate when clicking notification
    action_label VARCHAR(100), -- Label for action button
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ============================================
-- PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(50) DEFAULT 'Piece',
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    price DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock')),
    last_movement DATE DEFAULT CURRENT_DATE,
    image TEXT, -- Base64 encoded image or image URL
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- ============================================
-- STOCK ITEMS TABLE (Warehouse-specific stock)
-- ============================================
CREATE TABLE IF NOT EXISTS stock_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id VARCHAR(50) NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0,
    min_quantity INTEGER DEFAULT 0,
    movement VARCHAR(20) DEFAULT 'stable' CHECK (movement IN ('up', 'down', 'stable')),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, warehouse_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_items_product ON stock_items(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_warehouse ON stock_items(warehouse_id);

-- ============================================
-- CONTACTS TABLE (CRM - Clients & Suppliers)
-- ============================================
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    city VARCHAR(100),
    address TEXT,
    -- Moroccan business identifiers
    ice VARCHAR(50), -- Identifiant Commun de l'Entreprise
    if_number VARCHAR(50), -- Identifiant Fiscal
    rc VARCHAR(50), -- Registre de Commerce
    contact_type VARCHAR(20) NOT NULL CHECK (contact_type IN ('client', 'supplier')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    total_transactions INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_ice ON contacts(ice);

-- ============================================
-- INVOICES TABLE (Sales Invoices) - MUST BE BEFORE invoice_items
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id VARCHAR(100) UNIQUE NOT NULL, -- e.g., INV-2024-001
    client_id UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    due_date DATE,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    vat_rate DECIMAL(5, 2) DEFAULT 20.00, -- 20% VAT for Morocco
    vat_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'check', 'bank_transfer')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_document_id ON invoices(document_id);

-- Update comment for new document ID format
COMMENT ON COLUMN invoices.document_id IS 'Document number in format: INV-MM/YY/NNNN (e.g., INV-01/26/0001) where MM=month, YY=year, NNNN=serial number';

-- ============================================
-- INVOICE ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    total DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product ON invoice_items(product_id);

-- ============================================
-- ESTIMATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS estimates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id VARCHAR(100) UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    vat_rate DECIMAL(5, 2) DEFAULT 20.00,
    vat_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_estimates_client ON estimates(client_id);
CREATE INDEX IF NOT EXISTS idx_estimates_document_id ON estimates(document_id);

COMMENT ON COLUMN estimates.document_id IS 'Document number in format: EST-MM/YY/NNNN (e.g., EST-01/26/0001)';

-- ============================================
-- ESTIMATE ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS estimate_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    total DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_estimate_items_estimate ON estimate_items(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimate_items_product ON estimate_items(product_id);

-- ============================================
-- DELIVERY NOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS delivery_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id VARCHAR(100) UNIQUE NOT NULL,
    client_id UUID REFERENCES contacts(id) ON DELETE RESTRICT,
    supplier_id UUID REFERENCES contacts(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'delivered', 'cancelled')),
    document_type VARCHAR(20) DEFAULT 'delivery_note' CHECK (document_type IN ('delivery_note', 'divers')),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_delivery_notes_client ON delivery_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_supplier ON delivery_notes(supplier_id);

COMMENT ON COLUMN delivery_notes.document_id IS 'Document number in format: DN-MM/YY/NNNN (e.g., DN-01/26/0001)';

-- ============================================
-- DELIVERY NOTE ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS delivery_note_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_note_id UUID NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    total DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_delivery_note_items_delivery_note ON delivery_note_items(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_delivery_note_items_product ON delivery_note_items(product_id);

-- ============================================
-- PURCHASE ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id VARCHAR(100) UNIQUE NOT NULL,
    supplier_id UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed', 'received', 'cancelled')),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);

COMMENT ON COLUMN purchase_orders.document_id IS 'Document number in format: PO-MM/YY/NNNN (e.g., PO-01/26/0001)';

-- ============================================
-- PURCHASE ORDER ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    total DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_purchase_order ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product ON purchase_order_items(product_id);

-- ============================================
-- PURCHASE INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id VARCHAR(100) UNIQUE NOT NULL,
    supplier_id UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    due_date DATE,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    vat_rate DECIMAL(5, 2) DEFAULT 20.00,
    vat_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'check', 'bank_transfer')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'received', 'paid', 'overdue', 'cancelled')),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchase_invoices_supplier ON purchase_invoices(supplier_id);

COMMENT ON COLUMN purchase_invoices.document_id IS 'Document number in format: PI-MM/YY/NNNN (e.g., PI-01/26/0001)';

-- ============================================
-- PURCHASE INVOICE ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_invoice_id UUID NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    total DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchase_invoice_items_purchase_invoice ON purchase_invoice_items(purchase_invoice_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_items_product ON purchase_invoice_items(product_id);

-- ============================================
-- CREDIT NOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS credit_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id VARCHAR(100) UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
    invoice_id UUID REFERENCES invoices(id),
    date DATE NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    vat_rate DECIMAL(5, 2) DEFAULT 20.00,
    vat_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'applied', 'cancelled')),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_credit_notes_client ON credit_notes(client_id);

COMMENT ON COLUMN credit_notes.document_id IS 'Document number in format: CN-MM/YY/NNNN (e.g., CN-01/26/0001)';

-- ============================================
-- CREDIT NOTE ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS credit_note_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    credit_note_id UUID NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    total DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_credit_note_items_credit_note ON credit_note_items(credit_note_id);
CREATE INDEX IF NOT EXISTS idx_credit_note_items_product ON credit_note_items(product_id);

-- ============================================
-- STATEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS statements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id VARCHAR(100) UNIQUE NOT NULL,
    client_id UUID REFERENCES contacts(id) ON DELETE RESTRICT,
    supplier_id UUID REFERENCES contacts(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'current' CHECK (status IN ('current', 'overdue', 'paid')),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN statements.document_id IS 'Document number in format: ST-MM/YY/NNNN (e.g., ST-01/26/0001)';

-- ============================================
-- ROLES, ROUTES, ROLE_ROUTES, AND USERS TABLES
-- ============================================
-- NOTE: These tables have been moved earlier in the schema (around lines 86-201)
-- to fix dependency issues. They are defined before user_preferences.
-- This comment serves as a reference point. The duplicate definitions below have been removed.

-- ============================================
-- USER_PERMISSIONS TABLE (Additional Granular Permissions)
-- ============================================
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(100) NOT NULL,
    can_perform BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, permission)
);

-- Common permissions that can be assigned
-- Examples: 'manage_users', 'manage_settings', 'delete_records', 'edit_invoices', etc.

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission ON user_permissions(permission);

-- ============================================
-- USER_SESSIONS TABLE (Active User Sessions)
-- ============================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    invalidated_at TIMESTAMP,
    invalidation_reason VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity);

-- ============================================
-- USER_CREDENTIAL_CHANGES TABLE (Audit Log for Credential Updates)
-- ============================================
CREATE TABLE IF NOT EXISTS user_credential_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('email', 'password', 'status', 'role')),
    old_value VARCHAR(255),
    new_value VARCHAR(255),
    reason TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_credential_changes_user ON user_credential_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_credential_changes_changed_by ON user_credential_changes(changed_by);
CREATE INDEX IF NOT EXISTS idx_credential_changes_type ON user_credential_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_credential_changes_created ON user_credential_changes(created_at);

-- ============================================
-- USER_STATUS_CHANGES TABLE (Track Status Changes)
-- ============================================
CREATE TABLE IF NOT EXISTS user_status_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL CHECK (new_status IN ('active', 'inactive')),
    reason TEXT,
    sessions_invalidated INTEGER DEFAULT 0,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_status_changes_user ON user_status_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_status_changes_changed_by ON user_status_changes(changed_by);
CREATE INDEX IF NOT EXISTS idx_status_changes_created ON user_status_changes(created_at);

-- ============================================
-- USER_ACTIVITY_LOG TABLE (Audit Trail)
-- ============================================
CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_activity_user ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created ON user_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_action ON user_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_user_activity_entity ON user_activity_log(entity_type, entity_id);

-- ============================================
-- VIEW: User Routes Access
-- ============================================
CREATE OR REPLACE VIEW user_routes_access AS
SELECT 
    u.id as user_id,
    u.email,
    u.name as user_name,
    u.role_id,
    r.name as role_name,
    rt.id as route_id,
    rt.path,
    rt.name as route_name,
    rr.can_access
FROM users u
JOIN roles r ON u.role_id = r.id
JOIN role_routes rr ON r.id = rr.role_id AND rr.can_access = TRUE
JOIN routes rt ON rr.route_id = rt.id
WHERE u.status = 'active';

-- ============================================
-- FUNCTION: Check if user can access route
-- ============================================
CREATE OR REPLACE FUNCTION can_user_access_route(
    p_user_id UUID,
    p_route_path VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    v_can_access BOOLEAN;
BEGIN
    SELECT COALESCE(rr.can_access, FALSE) INTO v_can_access
    FROM users u
    JOIN role_routes rr ON u.role_id = rr.role_id
    JOIN routes r ON rr.route_id = r.id
    WHERE u.id = p_user_id
      AND u.status = 'active'
      AND r.path = p_route_path
      AND rr.can_access = TRUE
    LIMIT 1;
    
    RETURN COALESCE(v_can_access, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Get user accessible routes
-- ============================================
CREATE OR REPLACE FUNCTION get_user_routes(p_user_id UUID)
RETURNS TABLE (
    route_id VARCHAR,
    path VARCHAR,
    name VARCHAR,
    icon VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        rt.id,
        rt.path,
        rt.name,
        rt.icon
    FROM users u
    JOIN role_routes rr ON u.role_id = rr.role_id
    JOIN routes rt ON rr.route_id = rt.id
    WHERE u.id = p_user_id
      AND u.status = 'active'
      AND rr.can_access = TRUE
    ORDER BY rt.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Ensure at least one admin exists
-- ============================================
CREATE OR REPLACE FUNCTION ensure_admin_exists()
RETURNS TRIGGER AS $$
DECLARE
    admin_count INTEGER;
BEGIN
    -- If trying to delete or update admin role, check admin count
    IF OLD.role_id = 'admin' AND (NEW.role_id != 'admin' OR TG_OP = 'DELETE') THEN
        SELECT COUNT(*) INTO admin_count
        FROM users
        WHERE role_id = 'admin' AND status = 'active' AND id != OLD.id;
        
        IF admin_count = 0 THEN
            RAISE EXCEPTION 'Cannot remove the last active admin user. At least one admin must exist.';
        END IF;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent deleting the last admin
CREATE TRIGGER prevent_remove_last_admin
    BEFORE UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION ensure_admin_exists();

-- ============================================
-- FUNCTION: Prevent changing admin role
-- ============================================
CREATE OR REPLACE FUNCTION prevent_admin_role_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent changing admin role to another role
    IF OLD.role_id = 'admin' AND NEW.role_id != 'admin' THEN
        -- Check if this is the last admin
        IF (SELECT COUNT(*) FROM users WHERE role_id = 'admin' AND status = 'active' AND id != NEW.id) = 0 THEN
            RAISE EXCEPTION 'Cannot change role of the last admin user.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_admin_role_change_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION prevent_admin_role_change();

-- ============================================
-- FUNCTION: Log credential changes
-- ============================================
CREATE OR REPLACE FUNCTION log_credential_change()
RETURNS TRIGGER AS $$
DECLARE
    v_change_type VARCHAR(50);
    v_old_value VARCHAR(255);
    v_new_value VARCHAR(255);
    v_changed_by UUID;
BEGIN
    -- Get the user who made the change (from current_setting if available)
    v_changed_by := current_setting('app.current_user_id', TRUE)::UUID;
    
    -- Check what changed
    IF OLD.email IS DISTINCT FROM NEW.email THEN
        v_change_type := 'email';
        v_old_value := OLD.email;
        v_new_value := NEW.email;
        
        INSERT INTO user_credential_changes (user_id, changed_by, change_type, old_value, new_value)
        VALUES (NEW.id, v_changed_by, v_change_type, v_old_value, v_new_value);
    END IF;
    
    IF OLD.password_hash IS DISTINCT FROM NEW.password_hash THEN
        v_change_type := 'password';
        v_old_value := '***'; -- Never log actual password
        v_new_value := '***';
        
        INSERT INTO user_credential_changes (user_id, changed_by, change_type, old_value, new_value)
        VALUES (NEW.id, v_changed_by, v_change_type, v_old_value, v_new_value);
    END IF;
    
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        v_change_type := 'status';
        v_old_value := OLD.status;
        v_new_value := NEW.status;
        
        -- Log status change
        INSERT INTO user_status_changes (user_id, changed_by, old_status, new_status)
        VALUES (NEW.id, v_changed_by, OLD.status, NEW.status);
        
        -- Log in credential changes as well
        INSERT INTO user_credential_changes (user_id, changed_by, change_type, old_value, new_value)
        VALUES (NEW.id, v_changed_by, v_change_type, v_old_value, v_new_value);
        
        -- If status changed to inactive, invalidate all active sessions
        IF NEW.status = 'inactive' THEN
            UPDATE user_sessions
            SET 
                is_active = FALSE,
                invalidated_at = CURRENT_TIMESTAMP,
                invalidation_reason = 'User status changed to inactive'
            WHERE user_id = NEW.id 
              AND is_active = TRUE;
              
            -- Update status change record with sessions invalidated count
            UPDATE user_status_changes
            SET sessions_invalidated = (
                SELECT COUNT(*) 
                FROM user_sessions 
                WHERE user_id = NEW.id 
                  AND invalidated_at >= CURRENT_TIMESTAMP - INTERVAL '1 second'
            )
            WHERE id = (
                SELECT id 
                FROM user_status_changes 
                WHERE user_id = NEW.id 
                  AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 second'
                ORDER BY created_at DESC
                LIMIT 1
            );
        END IF;
    END IF;
    
    IF OLD.role_id IS DISTINCT FROM NEW.role_id THEN
        v_change_type := 'role';
        v_old_value := OLD.role_id;
        v_new_value := NEW.role_id;
        
        INSERT INTO user_credential_changes (user_id, changed_by, change_type, old_value, new_value)
        VALUES (NEW.id, v_changed_by, v_change_type, v_old_value, v_new_value);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to log credential changes
CREATE TRIGGER log_user_credential_changes
    AFTER UPDATE ON users
    FOR EACH ROW
    WHEN (
        OLD.email IS DISTINCT FROM NEW.email OR
        OLD.password_hash IS DISTINCT FROM NEW.password_hash OR
        OLD.status IS DISTINCT FROM NEW.status OR
        OLD.role_id IS DISTINCT FROM NEW.role_id
    )
    EXECUTE FUNCTION log_credential_change();

-- ============================================
-- FUNCTION: Invalidate user sessions on credential change
-- ============================================
CREATE OR REPLACE FUNCTION invalidate_sessions_on_credential_change()
RETURNS TRIGGER AS $$
BEGIN
    -- If email or password changed, invalidate all sessions except current one
    -- This forces user to re-login with new credentials
    IF (OLD.email IS DISTINCT FROM NEW.email OR OLD.password_hash IS DISTINCT FROM NEW.password_hash) THEN
        UPDATE user_sessions
        SET 
            is_active = FALSE,
            invalidated_at = CURRENT_TIMESTAMP,
            invalidation_reason = CASE 
                WHEN OLD.email IS DISTINCT FROM NEW.email THEN 'User email changed'
                WHEN OLD.password_hash IS DISTINCT FROM NEW.password_hash THEN 'User password changed'
            END
        WHERE user_id = NEW.id 
          AND is_active = TRUE;
          -- Note: In a real app, you might want to preserve the current session
          -- by excluding the current session token
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to invalidate sessions on credential changes
CREATE TRIGGER invalidate_sessions_on_credential_update
    AFTER UPDATE ON users
    FOR EACH ROW
    WHEN (
        OLD.email IS DISTINCT FROM NEW.email OR
        OLD.password_hash IS DISTINCT FROM NEW.password_hash
    )
    EXECUTE FUNCTION invalidate_sessions_on_credential_change();

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_estimates_updated_at BEFORE UPDATE ON estimates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_notes_updated_at BEFORE UPDATE ON delivery_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_invoices_updated_at BEFORE UPDATE ON purchase_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_notes_updated_at BEFORE UPDATE ON credit_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON company_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS FOR ANALYTICS
-- ============================================

-- Dashboard KPIs View
CREATE OR REPLACE VIEW dashboard_kpis AS
SELECT 
    (SELECT COALESCE(SUM(total), 0) FROM invoices WHERE status != 'cancelled') as total_sales,
    (SELECT COALESCE(SUM(total - vat_amount), 0) FROM invoices WHERE status != 'cancelled') as total_earnings,
    (SELECT COUNT(*) FROM invoices WHERE status != 'cancelled' AND date >= DATE_TRUNC('month', CURRENT_DATE)) as total_orders,
    (SELECT COALESCE(SUM(p.stock * p.price), 0) FROM products p) as total_stock_value;

-- Sales Chart Data View
CREATE OR REPLACE VIEW sales_chart_data AS
SELECT 
    DATE_TRUNC('month', date) as month,
    COUNT(*) as order_count,
    SUM(total) as revenue
FROM invoices
WHERE status != 'cancelled'
GROUP BY DATE_TRUNC('month', date)
ORDER BY month DESC
LIMIT 12;

-- ============================================
-- INITIAL DATA: Create Default Admin User
-- ============================================
-- Note: Password should be hashed using bcrypt in application
-- Default password: 'admin123' (must be changed on first login)
-- Hash: $2b$10$example_hash_here (replace with actual bcrypt hash)

-- Example insert (uncomment and update password hash):
-- INSERT INTO users (email, name, password_hash, role_id, status) VALUES
--     ('admin@company.ma', 'Admin User', '$2b$10$YOUR_BCRYPT_HASH_HERE', 'admin', 'active')
-- ON CONFLICT (email) DO NOTHING;

-- ============================================
-- FUNCTION: Create user session
-- ============================================
CREATE OR REPLACE FUNCTION create_user_session(
    p_user_id UUID,
    p_session_token VARCHAR,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_duration_hours INTEGER DEFAULT 24
)
RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
BEGIN
    -- Check if user is active
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND status = 'active') THEN
        RAISE EXCEPTION 'Cannot create session for inactive user';
    END IF;
    
    INSERT INTO user_sessions (
        user_id,
        session_token,
        ip_address,
        user_agent,
        expires_at
    )
    VALUES (
        p_user_id,
        p_session_token,
        p_ip_address,
        p_user_agent,
        CURRENT_TIMESTAMP + (p_duration_hours || ' hours')::INTERVAL
    )
    RETURNING id INTO v_session_id;
    
    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Invalidate user session
-- ============================================
CREATE OR REPLACE FUNCTION invalidate_user_session(
    p_session_token VARCHAR,
    p_reason VARCHAR DEFAULT 'Manual logout'
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE user_sessions
    SET 
        is_active = FALSE,
        invalidated_at = CURRENT_TIMESTAMP,
        invalidation_reason = p_reason
    WHERE session_token = p_session_token
      AND is_active = TRUE;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Invalidate all user sessions
-- ============================================
CREATE OR REPLACE FUNCTION invalidate_all_user_sessions(
    p_user_id UUID,
    p_reason VARCHAR DEFAULT 'All sessions invalidated'
)
RETURNS INTEGER AS $$
DECLARE
    v_invalidated_count INTEGER;
BEGIN
    UPDATE user_sessions
    SET 
        is_active = FALSE,
        invalidated_at = CURRENT_TIMESTAMP,
        invalidation_reason = p_reason
    WHERE user_id = p_user_id
      AND is_active = TRUE;
    
    GET DIAGNOSTICS v_invalidated_count = ROW_COUNT;
    
    RETURN v_invalidated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Check and clean expired sessions
-- ============================================
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    v_cleaned_count INTEGER;
BEGIN
    UPDATE user_sessions
    SET 
        is_active = FALSE,
        invalidated_at = CURRENT_TIMESTAMP,
        invalidation_reason = 'Session expired'
    WHERE expires_at < CURRENT_TIMESTAMP
      AND is_active = TRUE;
    
    GET DIAGNOSTICS v_cleaned_count = ROW_COUNT;
    
    RETURN v_cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Get active sessions for user
-- ============================================
CREATE OR REPLACE FUNCTION get_user_active_sessions(p_user_id UUID)
RETURNS TABLE (
    session_id UUID,
    session_token VARCHAR,
    ip_address INET,
    user_agent TEXT,
    last_activity TIMESTAMP,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.id,
        us.session_token,
        us.ip_address,
        us.user_agent,
        us.last_activity,
        us.created_at
    FROM user_sessions us
    WHERE us.user_id = p_user_id
      AND us.is_active = TRUE
      AND us.expires_at > CURRENT_TIMESTAMP
    ORDER BY us.last_activity DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VIEW: Active Sessions Summary
-- ============================================
CREATE OR REPLACE VIEW active_sessions_summary AS
SELECT 
    u.id as user_id,
    u.email,
    u.name,
    u.status,
    COUNT(us.id) as active_sessions_count,
    MAX(us.last_activity) as last_session_activity
FROM users u
LEFT JOIN user_sessions us ON u.id = us.user_id 
    AND us.is_active = TRUE 
    AND us.expires_at > CURRENT_TIMESTAMP
GROUP BY u.id, u.email, u.name, u.status;

-- ============================================
-- VIEW: Recent Credential Changes
-- ============================================
CREATE OR REPLACE VIEW recent_credential_changes AS
SELECT 
    ucc.id,
    ucc.user_id,
    u.email as user_email,
    u.name as user_name,
    ucc.changed_by,
    changer.email as changed_by_email,
    changer.name as changed_by_name,
    ucc.change_type,
    ucc.old_value,
    ucc.new_value,
    ucc.created_at,
    ucc.ip_address
FROM user_credential_changes ucc
JOIN users u ON ucc.user_id = u.id
LEFT JOIN users changer ON ucc.changed_by = changer.id
ORDER BY ucc.created_at DESC;

-- ============================================
-- HELPER QUERIES
-- ============================================

-- Query to get all users with their roles and accessible routes:
-- SELECT 
--     u.id,
--     u.email,
--     u.name,
--     r.name as role_name,
--     u.status,
--     u.last_login,
--     (SELECT COUNT(*) FROM user_routes_access WHERE user_id = u.id) as accessible_routes_count
-- FROM users u
-- JOIN roles r ON u.role_id = r.id
-- ORDER BY u.created_at DESC;

-- Query to check user route access:
-- SELECT can_user_access_route('user-uuid-here', '/inventory');

-- Query to get user's accessible routes:
-- SELECT * FROM get_user_routes('user-uuid-here');

-- Query to see role permissions:
-- SELECT 
--     r.name as role_name,
--     rt.name as route_name,
--     rt.path,
--     rr.can_access
-- FROM roles r
-- JOIN role_routes rr ON r.id = rr.role_id
-- JOIN routes rt ON rr.route_id = rt.id
-- ORDER BY r.name, rt.name;

-- ============================================
-- AUTHENTICATION POLICY
-- ============================================
-- IMPORTANT: Password Reset Policy
-- - Users CANNOT reset their own passwords
-- - Only administrators can create, update, or reset user passwords
-- - Users must contact their administrator for password changes
-- - All password changes are logged in user_credential_changes table
-- - When password is changed, all active sessions are invalidated
-- - Users must re-login with new credentials after password change

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE roles IS 'System roles with different permission levels';
COMMENT ON TABLE routes IS 'Application routes/pages that can be accessed';
COMMENT ON TABLE role_routes IS 'Mapping of which routes each role can access';
COMMENT ON TABLE users IS 'System users with authentication and role assignment. Passwords are managed exclusively by administrators.';
COMMENT ON TABLE user_permissions IS 'Granular permissions for individual users (optional)';
COMMENT ON TABLE user_activity_log IS 'Audit trail for user actions';

COMMENT ON TABLE user_sessions IS 'Active user sessions for authentication and session management';
COMMENT ON TABLE user_credential_changes IS 'Audit log for all user credential changes (email, password, status, role)';
COMMENT ON TABLE user_status_changes IS 'Track user status changes and session invalidations';

COMMENT ON TABLE warehouses IS 'Warehouse locations managed in WarehouseContext';
COMMENT ON TABLE company_settings IS 'Company information and branding settings (CompanyContext). Used for login page branding - logo and company name displayed dynamically. Logo supports base64 data URLs or image URLs.';
COMMENT ON TABLE user_preferences IS 'User-specific preferences including theme color, active warehouse, and notification settings';
COMMENT ON TABLE notifications IS 'In-app notifications for users (NotificationContext)';
COMMENT ON TABLE products IS 'Product catalog with inventory tracking (ProductsContext)';
COMMENT ON TABLE stock_items IS 'Warehouse-specific stock levels for products';
COMMENT ON TABLE contacts IS 'Clients and suppliers for CRM management (ContactsContext)';

COMMENT ON FUNCTION can_user_access_route IS 'Check if a specific user can access a specific route';
COMMENT ON FUNCTION get_user_routes IS 'Get all accessible routes for a specific user';
COMMENT ON FUNCTION ensure_admin_exists IS 'Ensure at least one admin user always exists';
COMMENT ON FUNCTION prevent_admin_role_change IS 'Prevent changing the role of admin users';
COMMENT ON FUNCTION log_credential_change IS 'Automatically log all credential changes to user_credential_changes table';
COMMENT ON FUNCTION invalidate_sessions_on_credential_change IS 'Invalidate user sessions when credentials are updated';
COMMENT ON FUNCTION create_user_session IS 'Create a new user session';
COMMENT ON FUNCTION invalidate_user_session IS 'Invalidate a specific session by token';
COMMENT ON FUNCTION invalidate_all_user_sessions IS 'Invalidate all active sessions for a user';
COMMENT ON FUNCTION clean_expired_sessions IS 'Mark expired sessions as inactive';
COMMENT ON FUNCTION get_user_active_sessions IS 'Get all active sessions for a user';

-- ============================================
-- ADDITIONAL HELPER QUERIES
-- ============================================

-- Query to see all credential changes for a user:
-- SELECT * FROM recent_credential_changes WHERE user_id = 'user-uuid-here';

-- Query to see all status changes:
-- SELECT * FROM user_status_changes ORDER BY created_at DESC;

-- Query to see active sessions:
-- SELECT * FROM active_sessions_summary WHERE active_sessions_count > 0;

-- Query to invalidate all sessions for a user:
-- SELECT invalidate_all_user_sessions('user-uuid-here', 'Admin revoked access');

-- Query to clean expired sessions (run periodically):
-- SELECT clean_expired_sessions();

-- ============================================
-- DOCUMENT NUMBER GENERATION FUNCTIONS
-- ============================================
-- 
-- Document Number Format: PREFIX-MM/YY/NNNN
-- Example: INV-01/26/0001
-- Where:
--   PREFIX: Document type (INV, EST, PO, DN, CN, ST, PI)
--   MM: Month (01-12)
--   YY: Year (2 digits, e.g., 26 for 2026)
--   NNNN: Serial number (0001-9999)

-- Function: Get next serial number for a document type, month, and year
CREATE OR REPLACE FUNCTION get_next_document_serial(
    p_prefix VARCHAR(10),
    p_month INTEGER,
    p_year INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    v_next_serial INTEGER := 1;
    v_month_str VARCHAR(2);
    v_year_str VARCHAR(2);
    v_pattern VARCHAR(50);
BEGIN
    -- Format month and year as 2-digit strings
    v_month_str := LPAD(p_month::TEXT, 2, '0');
    v_year_str := LPAD((p_year % 100)::TEXT, 2, '0');
    
    -- Build pattern: PREFIX-MM/YY/####
    v_pattern := p_prefix || '-' || v_month_str || '/' || v_year_str || '/%';
    
    -- Check all document tables for matching document_ids
    SELECT COALESCE(MAX(CAST(SUBSTRING(document_id FROM '([0-9]{4})$') AS INTEGER)), 0) + 1
    INTO v_next_serial
    FROM (
        SELECT document_id FROM invoices
        UNION ALL
        SELECT document_id FROM estimates
        UNION ALL
        SELECT document_id FROM delivery_notes
        UNION ALL
        SELECT document_id FROM purchase_orders
        UNION ALL
        SELECT document_id FROM purchase_invoices
        UNION ALL
        SELECT document_id FROM credit_notes
        UNION ALL
        SELECT document_id FROM statements
    ) all_documents
    WHERE document_id LIKE v_pattern;
    
    RETURN v_next_serial;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Generate unique document number
CREATE OR REPLACE FUNCTION generate_document_number(
    p_document_type VARCHAR(20), -- 'invoice', 'estimate', 'purchase_order', 'delivery_note', 'credit_note', 'statement', 'purchase_invoice'
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS VARCHAR(100) AS $$
DECLARE
    v_prefix VARCHAR(10);
    v_month INTEGER;
    v_year INTEGER;
    v_serial INTEGER;
    v_document_number VARCHAR(100);
BEGIN
    -- Map document type to prefix
    v_prefix := CASE p_document_type
        WHEN 'invoice' THEN 'INV'
        WHEN 'estimate' THEN 'EST'
        WHEN 'purchase_order' THEN 'PO'
        WHEN 'delivery_note' THEN 'DN'
        WHEN 'divers' THEN 'DIV'
        WHEN 'credit_note' THEN 'CN'
        WHEN 'statement' THEN 'ST'
        WHEN 'purchase_invoice' THEN 'PI'
        ELSE 'DOC'
    END;
    
    -- Extract month and year from date
    v_month := EXTRACT(MONTH FROM p_date);
    v_year := EXTRACT(YEAR FROM p_date);
    
    -- Get next serial number
    v_serial := get_next_document_serial(v_prefix, v_month, v_year);
    
    -- Generate document number in format: PREFIX-MM/YY/NNNN
    v_document_number := v_prefix || '-' || 
                        LPAD(v_month::TEXT, 2, '0') || '/' || 
                        LPAD((v_year % 100)::TEXT, 2, '0') || '/' || 
                        LPAD(v_serial::TEXT, 4, '0');
    
    RETURN v_document_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Validate document number format
CREATE OR REPLACE FUNCTION is_valid_document_number(p_document_id VARCHAR(100))
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if format matches: PREFIX-MM/YY/NNNN
    RETURN p_document_id ~ '^[A-Z]+-[0-9]{2}/[0-9]{2}/[0-9]{4}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Extract document components from document number
CREATE OR REPLACE FUNCTION parse_document_number(p_document_id VARCHAR(100))
RETURNS TABLE (
    prefix VARCHAR(10),
    month INTEGER,
    year INTEGER,
    serial INTEGER
) AS $$
DECLARE
    v_pattern TEXT := '^([A-Z]+)-([0-9]{2})/([0-9]{2})/([0-9]{4})$';
    v_prefix VARCHAR(10);
    v_month_str VARCHAR(2);
    v_year_str VARCHAR(2);
    v_serial_str VARCHAR(4);
BEGIN
    -- Extract components using regex
    SELECT 
        SUBSTRING(p_document_id FROM v_pattern FOR 1),
        SUBSTRING(p_document_id FROM v_pattern FOR 2),
        SUBSTRING(p_document_id FROM v_pattern FOR 3),
        SUBSTRING(p_document_id FROM v_pattern FOR 4)
    INTO v_prefix, v_month_str, v_year_str, v_serial_str;
    
    IF v_prefix IS NULL THEN
        RAISE EXCEPTION 'Invalid document number format: %', p_document_id;
    END IF;
    
    -- Convert year from 2-digit to 4-digit (assumes 2000-2099)
    RETURN QUERY SELECT 
        v_prefix,
        CAST(v_month_str AS INTEGER),
        CAST('20' || v_year_str AS INTEGER),
        CAST(v_serial_str AS INTEGER);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_next_document_serial IS 'Gets the next serial number for a document type, month, and year. Checks all document tables for uniqueness.';
COMMENT ON FUNCTION generate_document_number IS 'Generates a unique document number in format PREFIX-MM/YY/NNNN (e.g., INV-01/26/0001)';
COMMENT ON FUNCTION is_valid_document_number IS 'Validates if a document number matches the required format';
COMMENT ON FUNCTION parse_document_number IS 'Extracts prefix, month, year, and serial number from a document number';

-- ============================================
-- FUNCTIONS FOR CONTEXT OPERATIONS
-- ============================================

-- Function: Get or create user preferences
CREATE OR REPLACE FUNCTION get_or_create_user_preferences(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    theme_color VARCHAR,
    active_warehouse_id VARCHAR,
    browser_notifications_enabled BOOLEAN,
    low_stock_alerts_enabled BOOLEAN,
    order_updates_enabled BOOLEAN
) AS $$
BEGIN
    -- Insert default preferences if they don't exist
    INSERT INTO user_preferences (user_id, theme_color, active_warehouse_id)
    SELECT p_user_id, 'navy', w.id
    FROM warehouses w
    ORDER BY w.id
    LIMIT 1
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Return preferences
    RETURN QUERY
    SELECT 
        up.id,
        up.user_id,
        up.theme_color,
        up.active_warehouse_id,
        up.browser_notifications_enabled,
        up.low_stock_alerts_enabled,
        up.order_updates_enabled
    FROM user_preferences up
    WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update user preferences
CREATE OR REPLACE FUNCTION update_user_preferences(
    p_user_id UUID,
    p_theme_color VARCHAR DEFAULT NULL,
    p_active_warehouse_id VARCHAR DEFAULT NULL,
    p_browser_notifications_enabled BOOLEAN DEFAULT NULL,
    p_low_stock_alerts_enabled BOOLEAN DEFAULT NULL,
    p_order_updates_enabled BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Ensure preferences exist
    PERFORM get_or_create_user_preferences(p_user_id);
    
    -- Update preferences
    UPDATE user_preferences
    SET
        theme_color = COALESCE(p_theme_color, theme_color),
        active_warehouse_id = COALESCE(p_active_warehouse_id, active_warehouse_id),
        browser_notifications_enabled = COALESCE(p_browser_notifications_enabled, browser_notifications_enabled),
        low_stock_alerts_enabled = COALESCE(p_low_stock_alerts_enabled, low_stock_alerts_enabled),
        order_updates_enabled = COALESCE(p_order_updates_enabled, order_updates_enabled),
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_title VARCHAR,
    p_message TEXT,
    p_type VARCHAR,
    p_action_url VARCHAR DEFAULT NULL,
    p_action_label VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        action_url,
        action_label
    ) VALUES (
        p_user_id,
        p_title,
        p_message,
        p_type,
        p_action_url,
        p_action_label
    )
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notifications
    SET 
        read = TRUE,
        read_at = CURRENT_TIMESTAMP
    WHERE id = p_notification_id
      AND (p_user_id IS NULL OR user_id = p_user_id);
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Mark all notifications as read for user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    UPDATE notifications
    SET 
        read = TRUE,
        read_at = CURRENT_TIMESTAMP
    WHERE (user_id = p_user_id OR user_id IS NULL)
      AND read = FALSE;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get unread notification count for user
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM notifications
    WHERE (user_id = p_user_id OR user_id IS NULL)
      AND read = FALSE;
    
    RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update company settings
CREATE OR REPLACE FUNCTION update_company_settings(
    p_name VARCHAR DEFAULT NULL,
    p_legal_form VARCHAR DEFAULT NULL,
    p_email VARCHAR DEFAULT NULL,
    p_phone VARCHAR DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_ice VARCHAR DEFAULT NULL,
    p_if_number VARCHAR DEFAULT NULL,
    p_rc VARCHAR DEFAULT NULL,
    p_tp VARCHAR DEFAULT NULL,
    p_cnss VARCHAR DEFAULT NULL,
    p_logo TEXT DEFAULT NULL,
    p_footer_text TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Ensure company settings exist
    IF NOT EXISTS (SELECT 1 FROM company_settings) THEN
        INSERT INTO company_settings (
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
            footer_text
        ) VALUES (
            COALESCE(p_name, 'EVOTECH Solutions SARL'),
            COALESCE(p_legal_form, 'SARL'),
            p_email,
            p_phone,
            p_address,
            p_ice,
            p_if_number,
            p_rc,
            p_tp,
            p_cnss,
            p_logo,
            p_footer_text
        );
    ELSE
        UPDATE company_settings
        SET
            name = COALESCE(p_name, name),
            legal_form = COALESCE(p_legal_form, legal_form),
            email = COALESCE(p_email, email),
            phone = COALESCE(p_phone, phone),
            address = COALESCE(p_address, address),
            ice = COALESCE(p_ice, ice),
            if_number = COALESCE(p_if_number, if_number),
            rc = COALESCE(p_rc, rc),
            tp = COALESCE(p_tp, tp),
            cnss = COALESCE(p_cnss, cnss),
            logo = COALESCE(p_logo, logo),
            footer_text = COALESCE(p_footer_text, footer_text),
            updated_at = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VIEWS FOR CONTEXT DATA
-- ============================================

-- View: User preferences with warehouse info
CREATE OR REPLACE VIEW user_preferences_view AS
SELECT 
    up.id,
    up.user_id,
    u.email,
    u.name as user_name,
    up.theme_color,
    up.active_warehouse_id,
    w.name as active_warehouse_name,
    w.city as active_warehouse_city,
    up.browser_notifications_enabled,
    up.low_stock_alerts_enabled,
    up.order_updates_enabled,
    up.created_at,
    up.updated_at
FROM user_preferences up
JOIN users u ON up.user_id = u.id
LEFT JOIN warehouses w ON up.active_warehouse_id = w.id;

-- View: User notifications with unread count
CREATE OR REPLACE VIEW user_notifications_view AS
SELECT 
    n.id,
    n.user_id,
    n.title,
    n.message,
    n.type,
    n.read,
    n.action_url,
    n.action_label,
    n.created_at,
    n.read_at,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - n.created_at)) as seconds_ago
FROM notifications n
WHERE n.user_id IS NULL OR n.user_id = current_setting('app.current_user_id', TRUE)::UUID
ORDER BY n.created_at DESC;

-- ============================================
-- AUTHENTICATION WORKFLOW DOCUMENTATION
-- ============================================
-- 
-- USER CREATION & PASSWORD MANAGEMENT:
-- 1. Only administrators can create new users
-- 2. Admin sets email and password during user creation
-- 3. Users receive credentials from admin (email + password)
-- 4. Users login using admin-provided credentials
-- 5. Users CANNOT reset their own passwords
-- 6. Users must contact admin for password changes
-- 
-- PASSWORD CHANGE PROCESS:
-- 1. User requests password change from admin
-- 2. Admin updates password in Users & Roles section
-- 3. Password change is logged in user_credential_changes
-- 4. All active sessions for that user are invalidated
-- 5. User must login again with new password
-- 
-- STATUS CHANGE PROCESS:
-- 1. Admin changes user status (active <-> inactive)
-- 2. Status change is logged in user_status_changes
-- 3. If status changed to inactive:
--    - All active sessions are immediately invalidated
--    - User is logged out from all devices
--    - User cannot login until status is changed back to active
-- 4. If status changed to active:
--    - User can login again with existing credentials
-- 
-- SESSION MANAGEMENT:
-- - Sessions are created on successful login
-- - Sessions expire after configured duration (default: 24 hours)
-- - Sessions are invalidated when:
--   * User password is changed
--   * User email is changed
--   * User status is changed to inactive
--   * Admin manually invalidates sessions
--   * Session expires
-- 
-- SECURITY NOTES:
-- - Passwords are hashed before storage (never stored in plain text)
-- - Password changes are logged but actual passwords are masked (***)
-- - All credential changes are audited with who/when/what
-- - Session tokens should be cryptographically secure
-- - Regular cleanup of expired sessions recommended

-- ============================================
-- CONTEXT INTEGRATION DOCUMENTATION
-- ============================================
-- 
-- This schema integrates all React Context logic from the application:
-- 
-- 1. WAREHOUSE CONTEXT (WarehouseContext.tsx):
--    - Tables: warehouses, user_preferences.active_warehouse_id
--    - Functions: update_user_preferences() for active warehouse selection
--    - Logic: Users can select active warehouse, which persists in user_preferences
--    - CRUD: Full warehouse management (create, read, update, delete)
--    - Constraints: Cannot delete the last warehouse
-- 
-- 2. COMPANY CONTEXT (CompanyContext.tsx):
--    - Table: company_settings
--    - Functions: update_company_settings()
--    - Logic: Single company settings record (name, logo, Moroccan business identifiers)
--    - Features: Company branding, legal information, footer text
--    - Constraints: Only one company settings record allowed
--    
--    BRANDING INTEGRATION (Login Page):
--    - Login page displays company logo and name dynamically from company_settings
--    - Logo displayed in three locations:
--      * Left branding panel (desktop view) - 64x64px rounded container
--      * Mobile header - 56x56px rounded container
--      * Login form card - 80x80px rounded container above "Welcome Back"
--    - Company name displayed in:
--      * Left branding panel header (desktop) - large bold text
--      * Mobile header - responsive text sizing
--      * Footer copyright - "© {year} {company_name}. All rights reserved."
--    - Fallback behavior:
--      * If logo is NULL or empty, displays Building2 icon as placeholder
--      * Company name always displayed (required field, cannot be NULL)
--    - Logo storage:
--      * Stored as TEXT field (supports base64 data URLs or image URLs)
--      * Format: "data:image/png;base64,..." or "https://example.com/logo.png"
--      * Recommended: Base64 encoded PNG/JPG for self-contained storage
--    - Dynamic updates:
--      * Changes to company_settings.name or company_settings.logo
--      * Immediately reflected on login page without application restart
--      * Uses React Context (CompanyContext) for real-time updates
-- 
-- 3. CONTACTS CONTEXT (ContactsContext.tsx):
--    - Table: contacts
--    - Logic: Clients and suppliers stored in same table with contact_type
--    - Fields: name, company, email, phone, city, address, ICE, IF, RC, status
--    - Features: total_transactions tracking, active/inactive status
--    - Indexes: Optimized for type, status, and ICE lookups
-- 
-- 4. PRODUCTS CONTEXT (ProductsContext.tsx):
--    - Tables: products, stock_items
--    - Logic: Products with warehouse-specific stock levels
--    - Features: SKU, category, pricing, stock status (in_stock/low_stock/out_of_stock)
--    - Stock tracking: Per-warehouse quantities, minimum stock levels, movement trends
--    - Images: Base64 encoded images or URLs stored in products.image
-- 
-- 5. THEME CONTEXT (ThemeContext.tsx):
--    - Table: user_preferences.theme_color
--    - Functions: get_or_create_user_preferences(), update_user_preferences()
--    - Themes: navy, indigo, blue, sky, teal, slate, rose, cyan, yellow
--    - Logic: User-specific theme preference persisted per user
-- 
-- 6. NOTIFICATION CONTEXT (NotificationContext.tsx):
--    - Table: notifications
--    - Functions: 
--      * create_notification() - Create new notification
--      * mark_notification_read() - Mark single notification as read
--      * mark_all_notifications_read() - Mark all user notifications as read
--      * get_unread_notification_count() - Get unread count for user
--    - Types: info, success, warning, error
--    - Features: Action URLs, timestamps, read status tracking
--    - Views: user_notifications_view for easy querying
-- 
-- 7. AUTH CONTEXT (AuthContext.tsx):
--    - Tables: users, roles, role_routes, user_sessions, user_credential_changes
--    - Functions: Authentication, authorization, session management
--    - Logic: Role-based access control, password hashing, session invalidation
--    - Security: Admin protections, credential change tracking
-- 
-- CONTEXT DATA FLOW:
-- - React Contexts manage client-side state and localStorage as fallback
-- - Database serves as persistent storage for production environments
-- - Context functions can be called from API endpoints to sync with database
-- - Real-time updates can be achieved through database triggers or webhooks
-- 
-- MIGRATION FROM LOCALSTORAGE:
-- When migrating from localStorage to database:
-- 1. Export localStorage data for each context
-- 2. Use INSERT statements or migration scripts to populate database
-- 3. Update React Contexts to fetch from API instead of localStorage
-- 4. Implement API endpoints that use the functions defined in this schema
-- 
-- EXAMPLE QUERIES:
-- 
-- Get user preferences with warehouse:
-- SELECT * FROM user_preferences_view WHERE user_id = 'user-uuid';
-- 
-- Get unread notifications for user:
-- SELECT get_unread_notification_count('user-uuid');
-- 
-- Update user theme:
-- SELECT update_user_preferences('user-uuid', p_theme_color := 'blue');
-- 
-- Create notification:
-- SELECT create_notification('user-uuid', 'Low Stock Alert', 'Product XYZ is low on stock', 'warning');
-- 
-- Get company settings:
-- SELECT * FROM company_settings;
-- 
-- Update company logo:
-- SELECT update_company_settings(p_logo := 'data:image/png;base64,...');

-- Update company name:
-- SELECT update_company_settings(p_name := 'Your Company Name SARL');

-- Get company branding info for login page:
-- SELECT name, logo FROM company_settings;

-- ============================================
-- DOCUMENT NUMBER GENERATION DOCUMENTATION
-- ============================================
-- 
-- DOCUMENT NUMBER FORMAT: PREFIX-MM/YY/NNNN
-- 
-- All documents in the system use a standardized numbering format:
--   Format: PREFIX-MM/YY/NNNN
--   Example: INV-01/26/0001
-- 
-- Components:
--   - PREFIX: Document type identifier (2-3 letters)
--     * INV = Sales Invoice
--     * EST = Estimate/Quote
--     * PO  = Purchase Order
--     * DN  = Delivery Note
--     * CN  = Credit Note
--     * ST  = Statement
--     * PI  = Purchase Invoice
-- 
--   - MM: Month (2 digits, 01-12)
--     * Based on document creation date
--     * Example: 01 for January, 12 for December
-- 
--   - YY: Year (2 digits, last 2 digits of year)
--     * Based on document creation date
--     * Example: 26 for 2026, 24 for 2024
-- 
--   - NNNN: Serial number (4 digits, 0001-9999)
--     * Sequential number unique per document type, month, and year
--     * Resets to 0001 each month
--     * Automatically incremented to ensure uniqueness
-- 
-- UNIQUENESS GUARANTEE:
--   - Document numbers are UNIQUE across ALL document types
--   - The generate_document_number() function checks all document tables:
--     * invoices
--     * estimates
--     * delivery_notes
--     * purchase_orders
--     * purchase_invoices
--     * credit_notes
--     * statements
--   - No duplicate document numbers can be generated
--   - Each document type has its own prefix, so INV-01/26/0001 and EST-01/26/0001
--     can coexist (different prefixes)
--   - Serial numbers reset each month (e.g., INV-01/26/0001, INV-02/26/0001)
-- 
-- USAGE EXAMPLES:
-- 
-- Generate a new invoice number for current date:
--   SELECT generate_document_number('invoice');
--   Result: INV-01/26/0001 (if it's January 2026 and first invoice of the month)
-- 
-- Generate a new purchase order number for a specific date:
--   SELECT generate_document_number('purchase_order', '2026-03-15');
--   Result: PO-03/26/0001 (if first PO in March 2026)
-- 
-- Get next serial number manually:
--   SELECT get_next_document_serial('INV', 1, 2026);
--   Result: 2 (if INV-01/26/0001 already exists)
-- 
-- Validate a document number:
--   SELECT is_valid_document_number('INV-01/26/0001');
--   Result: true
-- 
-- Parse document number components:
--   SELECT * FROM parse_document_number('INV-01/26/0001');
--   Result: prefix='INV', month=1, year=2026, serial=1
-- 
-- INTEGRATION:
--   - Frontend: Uses generateDocumentNumber() from document-number-generator.ts
--   - Backend: Uses generate_document_number() PostgreSQL function
--   - Both ensure uniqueness by checking all existing documents
--   - Format is consistent across all document types
-- 
-- MIGRATION NOTES:
--   - Existing documents with old format (e.g., INV-2024-001) should be migrated
--   - Use parse_document_number() to extract components from old format
--   - Regenerate using new format if needed
--   - Ensure uniqueness during migration

-- ============================================
-- BRANDING & UI INTEGRATION DOCUMENTATION
-- ============================================
-- 
-- LOGIN PAGE BRANDING:
-- The login page dynamically displays company branding from company_settings table:
-- 
-- 1. LOGO DISPLAY:
--    - Location 1: Left Branding Panel (Desktop only)
--      * Size: 64x64px (w-16 h-16)
--      * Style: Rounded-xl, white/transparent background, border
--      * Position: Top-left of left panel with company name beside it
--    
--    - Location 2: Mobile Header (Mobile/Tablet view)
--      * Size: 56x56px (w-14 h-14)
--      * Style: Rounded-lg, responsive sizing
--      * Position: Centered above login form on mobile devices
--    
--    - Location 3: Login Form Card
--      * Size: 80x80px (w-20 h-20)
--      * Style: Rounded-xl, subtle background, border
--      * Position: Centered above "Welcome Back" heading
--      * Visibility: Only shown if logo exists (conditional rendering)
-- 
-- 2. COMPANY NAME DISPLAY:
--    - Location 1: Left Branding Panel Header
--      * Style: text-2xl, font-bold, primary-foreground color
--      * Position: Next to logo, large prominent display
--    
--    - Location 2: Mobile Header
--      * Style: text-xl, font-bold, responsive sizing
--      * Position: Next to mobile logo
--    
--    - Location 3: Footer Copyright
--      * Format: "© {current_year} {company_settings.name}. All rights reserved."
--      * Style: Small text, subtle color
--      * Position: Bottom of left branding panel
--      * Year: Dynamically generated using JavaScript Date.getFullYear()
-- 
-- 3. FALLBACK BEHAVIOR:
--    - Logo: If company_settings.logo IS NULL or empty string:
--      * Displays Building2 icon (lucide-react)
--      * Same positioning and container styling
--      * Maintains visual consistency
--    
--    - Company Name: Always displayed (NOT NULL constraint)
--      * If default company settings, shows "EVOTECH Solutions SARL"
--      * Cannot be empty or NULL
-- 
-- 4. IMPLEMENTATION DETAILS:
--    - React Component: src/pages/Login.tsx
--    - Context: CompanyContext (src/contexts/CompanyContext.tsx)
--    - Data Source: localStorage (client-side) or company_settings table (API)
--    - Update Method: Settings page → Branding & Logo tab
--    - Storage: 
--      * Client-side: localStorage key 'companyInfo'
--      * Database: company_settings table (single row)
-- 
-- 5. LOGO FORMATS SUPPORTED:
--    - Base64 Data URL: "data:image/png;base64,iVBORw0KGgo..."
--    - Base64 JPG: "data:image/jpeg;base64,/9j/4AAQ..."
--    - Image URL: "https://example.com/logo.png"
--    - SVG: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0..."
--    - Recommended: PNG or JPG as base64 for offline support
-- 
-- 6. RESPONSIVE BEHAVIOR:
--    - Desktop (lg breakpoint and above):
--      * Shows full left branding panel with logo and name
--      * Login form on right side
--    - Mobile/Tablet (below lg breakpoint):
--      * Hides left panel
--      * Shows mobile header with logo and name above form
--      * Logo in login card hidden on mobile (space optimization)
-- 
-- 7. PERFORMANCE CONSIDERATIONS:
--    - Logo images should be optimized (< 500KB recommended)
--    - Base64 encoding increases size by ~33%
--    - Consider compression before storing in database
--    - Use CDN URLs for large logos instead of base64
-- 
-- EXAMPLE: Update branding for login page
-- UPDATE company_settings 
-- SET 
--     name = 'My Company SARL',
--     logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
--     updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- TREASURY TABLES (TreasuryContext)
-- ============================================

-- Bank Accounts Table
CREATE TABLE IF NOT EXISTS treasury_bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    bank VARCHAR(255) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bank, account_number)
);

-- Index for bank accounts
CREATE INDEX IF NOT EXISTS idx_treasury_bank_accounts_bank ON treasury_bank_accounts(bank);

-- Warehouse Cash Table
CREATE TABLE IF NOT EXISTS treasury_warehouse_cash (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id VARCHAR(50) NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) DEFAULT 0 NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(warehouse_id)
);

-- Index for warehouse cash
CREATE INDEX IF NOT EXISTS idx_treasury_warehouse_cash_warehouse ON treasury_warehouse_cash(warehouse_id);

-- Treasury Payments Table (Sales and Purchase Payments)
CREATE TABLE IF NOT EXISTS treasury_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id VARCHAR(100) NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    entity VARCHAR(255) NOT NULL, -- Client for sales, Supplier for purchases
    amount DECIMAL(15, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'check', 'bank_transfer')),
    bank VARCHAR(255),
    check_number VARCHAR(100),
    maturity_date DATE, -- For checks/LCN
    status VARCHAR(20) NOT NULL CHECK (status IN ('in-hand', 'pending_bank', 'cleared')),
    payment_date DATE NOT NULL,
    warehouse_id VARCHAR(50) REFERENCES warehouses(id) ON DELETE SET NULL, -- For cash payments
    notes TEXT,
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('sales', 'purchase')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for treasury payments
CREATE INDEX IF NOT EXISTS idx_treasury_payments_invoice_number ON treasury_payments(invoice_number);
CREATE INDEX IF NOT EXISTS idx_treasury_payments_entity ON treasury_payments(entity);
CREATE INDEX IF NOT EXISTS idx_treasury_payments_status ON treasury_payments(status);
CREATE INDEX IF NOT EXISTS idx_treasury_payments_type ON treasury_payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_treasury_payments_date ON treasury_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_treasury_payments_bank ON treasury_payments(bank);

-- ============================================
-- TREASURY FUNCTIONS
-- ============================================

-- Function to add a bank account
CREATE OR REPLACE FUNCTION add_treasury_bank_account(
    p_name VARCHAR(255),
    p_bank VARCHAR(255),
    p_account_number VARCHAR(100),
    p_balance DECIMAL(15, 2) DEFAULT 0
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO treasury_bank_accounts (name, bank, account_number, balance)
    VALUES (p_name, p_bank, p_account_number, p_balance)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update bank account balance
CREATE OR REPLACE FUNCTION update_treasury_bank_account_balance(
    p_id UUID,
    p_balance DECIMAL(15, 2)
) RETURNS VOID AS $$
BEGIN
    UPDATE treasury_bank_accounts
    SET balance = p_balance, updated_at = CURRENT_TIMESTAMP
    WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- Function to add a treasury payment
CREATE OR REPLACE FUNCTION add_treasury_payment(
    p_invoice_id VARCHAR(100),
    p_invoice_number VARCHAR(100),
    p_entity VARCHAR(255),
    p_amount DECIMAL(15, 2),
    p_payment_method VARCHAR(20),
    p_bank VARCHAR(255),
    p_check_number VARCHAR(100),
    p_maturity_date DATE,
    p_status VARCHAR(20),
    p_payment_date DATE,
    p_warehouse_id VARCHAR(50),
    p_notes TEXT,
    p_payment_type VARCHAR(20)
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO treasury_payments (
        invoice_id, invoice_number, entity, amount, payment_method,
        bank, check_number, maturity_date, status, payment_date,
        warehouse_id, notes, payment_type
    )
    VALUES (
        p_invoice_id, p_invoice_number, p_entity, p_amount, p_payment_method,
        p_bank, p_check_number, p_maturity_date, p_status, p_payment_date,
        p_warehouse_id, p_notes, p_payment_type
    )
    RETURNING id INTO v_id;
    
    -- Update warehouse cash if cash payment
    IF p_payment_method = 'cash' AND p_warehouse_id IS NOT NULL THEN
        INSERT INTO treasury_warehouse_cash (warehouse_id, amount)
        VALUES (p_warehouse_id, p_amount)
        ON CONFLICT (warehouse_id) DO UPDATE
        SET amount = treasury_warehouse_cash.amount + p_amount,
            updated_at = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update treasury payment status
CREATE OR REPLACE FUNCTION update_treasury_payment_status(
    p_id UUID,
    p_status VARCHAR(20)
) RETURNS VOID AS $$
DECLARE
    v_payment RECORD;
    v_bank_account_id UUID;
    v_amount_change DECIMAL(15, 2);
BEGIN
    -- Get payment details
    SELECT * INTO v_payment FROM treasury_payments WHERE id = p_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;
    
    -- Update payment status
    UPDATE treasury_payments
    SET status = p_status, updated_at = CURRENT_TIMESTAMP
    WHERE id = p_id;
    
    -- If cleared, update bank balance (add for sales, subtract for purchases)
    IF p_status = 'cleared' AND v_payment.payment_method = 'check' AND v_payment.bank IS NOT NULL THEN
        -- Find bank account
        SELECT id INTO v_bank_account_id
        FROM treasury_bank_accounts
        WHERE bank = v_payment.bank
        LIMIT 1;
        
        IF v_bank_account_id IS NOT NULL THEN
            -- Calculate amount change (positive for sales, negative for purchases)
            v_amount_change := CASE 
                WHEN v_payment.payment_type = 'sales' THEN v_payment.amount
                ELSE -v_payment.amount
            END;
            
            -- Update bank balance
            UPDATE treasury_bank_accounts
            SET balance = balance + v_amount_change,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = v_bank_account_id;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get treasury statistics
CREATE OR REPLACE FUNCTION get_treasury_statistics()
RETURNS TABLE (
    total_bank DECIMAL(15, 2),
    total_warehouse_cash DECIMAL(15, 2),
    real_time_balance DECIMAL(15, 2),
    net_liquidity DECIMAL(15, 2),
    total_cashed_sales DECIMAL(15, 2),
    total_supplier_bills_paid DECIMAL(15, 2),
    tva_reserve DECIMAL(15, 2),
    collected_tva DECIMAL(15, 2),
    recoverable_tva DECIMAL(15, 2),
    net_tva_due DECIMAL(15, 2),
    total_expected_inflow DECIMAL(15, 2),
    total_upcoming_payments DECIMAL(15, 2)
) AS $$
DECLARE
    v_total_bank DECIMAL(15, 2);
    v_total_warehouse_cash DECIMAL(15, 2);
    v_total_cashed_sales DECIMAL(15, 2);
    v_total_supplier_bills_paid DECIMAL(15, 2);
    v_total_expected_inflow DECIMAL(15, 2);
    v_total_upcoming_payments DECIMAL(15, 2);
    v_vat_rate DECIMAL(5, 2) := 0.20;
BEGIN
    -- Calculate total bank
    SELECT COALESCE(SUM(balance), 0) INTO v_total_bank
    FROM treasury_bank_accounts;
    
    -- Calculate total warehouse cash
    SELECT COALESCE(SUM(amount), 0) INTO v_total_warehouse_cash
    FROM treasury_warehouse_cash;
    
    -- Calculate total cashed sales
    SELECT COALESCE(SUM(amount), 0) INTO v_total_cashed_sales
    FROM treasury_payments
    WHERE payment_type = 'sales' AND status = 'cleared';
    
    -- Calculate total supplier bills paid
    SELECT COALESCE(SUM(amount), 0) INTO v_total_supplier_bills_paid
    FROM treasury_payments
    WHERE payment_type = 'purchase' AND status = 'cleared';
    
    -- Calculate expected inflow (pending sales payments)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_expected_inflow
    FROM treasury_payments
    WHERE payment_type = 'sales' AND status IN ('in-hand', 'pending_bank');
    
    -- Calculate upcoming payments (pending purchase payments)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_upcoming_payments
    FROM treasury_payments
    WHERE payment_type = 'purchase' AND status IN ('in-hand', 'pending_bank');
    
    RETURN QUERY SELECT
        v_total_bank,
        v_total_warehouse_cash,
        (v_total_bank + v_total_cashed_sales) - v_total_supplier_bills_paid AS real_time_balance,
        v_total_bank + v_total_warehouse_cash AS net_liquidity,
        v_total_cashed_sales,
        v_total_supplier_bills_paid,
        v_total_cashed_sales * v_vat_rate AS tva_reserve,
        v_total_cashed_sales * v_vat_rate AS collected_tva,
        v_total_supplier_bills_paid * v_vat_rate AS recoverable_tva,
        (v_total_cashed_sales * v_vat_rate) - (v_total_supplier_bills_paid * v_vat_rate) AS net_tva_due,
        v_total_expected_inflow,
        v_total_upcoming_payments;
END;
$$ LANGUAGE plpgsql;

-- Function to get bank statement
CREATE OR REPLACE FUNCTION get_bank_statement(
    p_bank VARCHAR(255) DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    payment_date DATE,
    description TEXT,
    transaction_type VARCHAR(10),
    amount DECIMAL(15, 2),
    running_balance DECIMAL(15, 2)
) AS $$
DECLARE
    v_starting_balance DECIMAL(15, 2);
    v_total_bank DECIMAL(15, 2);
    v_total_credits DECIMAL(15, 2);
    v_total_debits DECIMAL(15, 2);
    v_payment RECORD;
    v_running_balance DECIMAL(15, 2);
BEGIN
    -- Get total bank balance
    SELECT COALESCE(SUM(balance), 0) INTO v_total_bank
    FROM treasury_bank_accounts
    WHERE (p_bank IS NULL OR bank = p_bank);
    
    -- Get total credits (cleared sales payments)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_credits
    FROM treasury_payments
    WHERE payment_type = 'sales'
        AND status = 'cleared'
        AND (p_bank IS NULL OR bank = p_bank)
        AND (payment_method = 'bank_transfer' OR (payment_method = 'check' AND bank IS NOT NULL))
        AND (p_start_date IS NULL OR payment_date >= p_start_date)
        AND (p_end_date IS NULL OR payment_date <= p_end_date);
    
    -- Get total debits (cleared purchase payments)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_debits
    FROM treasury_payments
    WHERE payment_type = 'purchase'
        AND status = 'cleared'
        AND (p_bank IS NULL OR bank = p_bank)
        AND (payment_method = 'bank_transfer' OR (payment_method = 'check' AND bank IS NOT NULL))
        AND (p_start_date IS NULL OR payment_date >= p_start_date)
        AND (p_end_date IS NULL OR payment_date <= p_end_date);
    
    -- Calculate starting balance
    v_starting_balance := v_total_bank - (v_total_credits - v_total_debits);
    v_running_balance := v_starting_balance;
    
    -- Return statement entries
    FOR v_payment IN
        SELECT 
            tp.id,
            tp.payment_date,
            tp.invoice_number || ' - ' || tp.entity AS description,
            CASE WHEN tp.payment_type = 'sales' THEN 'credit' ELSE 'debit' END AS transaction_type,
            tp.amount
        FROM treasury_payments tp
        WHERE tp.status = 'cleared'
            AND (p_bank IS NULL OR tp.bank = p_bank)
            AND (tp.payment_method = 'bank_transfer' OR (tp.payment_method = 'check' AND tp.bank IS NOT NULL))
            AND (p_start_date IS NULL OR tp.payment_date >= p_start_date)
            AND (p_end_date IS NULL OR tp.payment_date <= p_end_date)
        ORDER BY tp.payment_date ASC, tp.created_at ASC
    LOOP
        -- Update running balance
        IF v_payment.transaction_type = 'credit' THEN
            v_running_balance := v_running_balance + v_payment.amount;
        ELSE
            v_running_balance := v_running_balance - v_payment.amount;
        END IF;
        
        RETURN QUERY SELECT
            v_payment.id,
            v_payment.payment_date,
            v_payment.description,
            v_payment.transaction_type::VARCHAR(10),
            v_payment.amount,
            v_running_balance;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TREASURY TRIGGERS
-- ============================================

-- Trigger to update updated_at for bank accounts
CREATE TRIGGER update_treasury_bank_accounts_updated_at
    BEFORE UPDATE ON treasury_bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at for warehouse cash
CREATE TRIGGER update_treasury_warehouse_cash_updated_at
    BEFORE UPDATE ON treasury_warehouse_cash
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at for treasury payments
CREATE TRIGGER update_treasury_payments_updated_at
    BEFORE UPDATE ON treasury_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TREASURY VIEWS
-- ============================================

-- View for treasury summary
CREATE OR REPLACE VIEW treasury_summary_view AS
SELECT
    (SELECT COALESCE(SUM(balance), 0) FROM treasury_bank_accounts) AS total_bank,
    (SELECT COALESCE(SUM(amount), 0) FROM treasury_warehouse_cash) AS total_warehouse_cash,
    (SELECT COALESCE(SUM(amount), 0) FROM treasury_payments WHERE payment_type = 'sales' AND status = 'cleared') AS total_cashed_sales,
    (SELECT COALESCE(SUM(amount), 0) FROM treasury_payments WHERE payment_type = 'purchase' AND status = 'cleared') AS total_supplier_bills_paid,
    (SELECT COALESCE(SUM(amount), 0) FROM treasury_payments WHERE payment_type = 'sales' AND status IN ('in-hand', 'pending_bank')) AS total_expected_inflow,
    (SELECT COALESCE(SUM(amount), 0) FROM treasury_payments WHERE payment_type = 'purchase' AND status IN ('in-hand', 'pending_bank')) AS total_upcoming_payments;

-- View for pending payments
CREATE OR REPLACE VIEW treasury_pending_payments_view AS
SELECT
    id,
    invoice_number,
    entity,
    amount,
    payment_method,
    bank,
    payment_date,
    status,
    payment_type,
    CASE 
        WHEN payment_type = 'sales' THEN 'Expected Inflow'
        ELSE 'Upcoming Payment'
    END AS category
FROM treasury_payments
WHERE status IN ('in-hand', 'pending_bank')
ORDER BY payment_date DESC;