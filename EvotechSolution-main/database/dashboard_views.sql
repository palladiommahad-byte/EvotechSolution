-- Dashboard Views
-- These views aggregate data for the dashboard to avoid complex client-side calculations

-- 1. Dashboard KPIs View
CREATE OR REPLACE VIEW dashboard_kpis AS
WITH 
  -- Calculate Total Sales (Paid Invoices)
  sales_stats AS (
    SELECT 
      COALESCE(SUM(total), 0) as total_sales,
      COUNT(*) as total_orders
    FROM invoices 
    WHERE status = 'paid'
  ),
  -- Calculate Total Earnings (This might need adjustment based on business logic, currently same as sales)
  earnings_stats AS (
    SELECT 
      COALESCE(SUM(total), 0) as total_earnings
    FROM invoices 
    WHERE status = 'paid'
  ),
  -- Calculate Total Stock Value
  stock_stats AS (
    SELECT 
      COALESCE(SUM(price * stock), 0) as total_stock_value
    FROM products
  )
SELECT 
  s.total_sales,
  e.total_earnings,
  s.total_orders,
  st.total_stock_value
FROM sales_stats s
CROSS JOIN earnings_stats e
CROSS JOIN stock_stats st;

-- 2. Sales Chart Data View (Last 12 Months)
CREATE OR REPLACE VIEW sales_chart_data AS
WITH RECURSIVE months AS (
  SELECT DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months') as month
  UNION ALL
  SELECT DATE_TRUNC('month', month + INTERVAL '1 month')
  FROM months
  WHERE month < DATE_TRUNC('month', CURRENT_DATE)
)
SELECT 
  TO_CHAR(m.month, 'Mon') as month,
  COALESCE(COUNT(i.id), 0) as order_count,
  COALESCE(SUM(i.total), 0) as revenue
FROM months m
LEFT JOIN invoices i ON DATE_TRUNC('month', i.date) = m.month AND i.status = 'paid'
GROUP BY m.month
ORDER BY m.month;

-- Note: Revenue chart data is handled via dynamic queries in the service for now due to complexity
