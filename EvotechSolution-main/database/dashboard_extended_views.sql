-- Dashboard Extended Views
-- These views provide more granular analytics for the dashboard

-- 1. Stock by Category View
CREATE OR REPLACE VIEW dashboard_stock_by_category AS
SELECT 
  COALESCE(category, 'Uncategorized') as category,
  SUM(stock) as stock,
  CASE 
    WHEN category = 'Electronics' THEN 'hsl(222, 47%, 17%)'
    WHEN category = 'Machinery' THEN 'hsl(222, 47%, 30%)'
    WHEN category = 'Raw Materials' THEN 'hsl(222, 47%, 40%)'
    WHEN category = 'Components' THEN 'hsl(222, 47%, 50%)'
    WHEN category = 'Tools' THEN 'hsl(222, 47%, 60%)'
    WHEN category = 'Safety' THEN 'hsl(222, 47%, 70%)'
    ELSE 'hsl(222, 47%, 80%)'
  END as color
FROM products
GROUP BY category
ORDER BY stock DESC;

-- 2. Top Sold Products View (Current Month)
CREATE OR REPLACE VIEW dashboard_top_products AS
SELECT 
  p.name,
  SUM(ii.quantity) as quantity,
  SUM(ii.total) as revenue,
  CASE 
    WHEN p.category = 'Electronics' THEN 'hsl(var(--primary))'
    WHEN p.category = 'Machinery' THEN 'hsl(199, 89%, 48%)'
    WHEN p.category = 'Raw Materials' THEN 'hsl(142, 76%, 36%)'
    WHEN p.category = 'Components' THEN 'hsl(262, 83%, 58%)'
    WHEN p.category = 'Tools' THEN 'hsl(346, 77%, 50%)'
    WHEN p.category = 'Safety' THEN 'hsl(187, 85%, 43%)'
    ELSE 'hsl(160, 84%, 39%)'
  END as color
FROM invoice_items ii
JOIN invoices i ON ii.invoice_id = i.id
JOIN products p ON ii.product_id = p.id
WHERE i.status = 'paid'
  AND i.date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY p.id, p.name, p.category
ORDER BY quantity DESC
LIMIT 10;

-- 3. Stock Alerts View
CREATE OR REPLACE VIEW dashboard_stock_alerts AS
SELECT 
  name,
  sku,
  stock,
  min_stock as threshold
FROM products
WHERE stock <= min_stock
ORDER BY (stock / NULLIF(min_stock, 0)) ASC
LIMIT 10;
