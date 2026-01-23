const express = require('express');
const { query } = require('../config/database');
const { verifyToken } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

const router = express.Router();

router.use(verifyToken);

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics
 */
router.get('/stats', asyncHandler(async (req, res) => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    // Total revenue (paid invoices this month)
    const revenueResult = await query(
        `SELECT COALESCE(SUM(total), 0) as total FROM invoices 
     WHERE status = 'paid' AND date >= $1 AND date <= $2`,
        [startOfMonth, endOfMonth]
    );

    // Total expenses (paid purchase invoices this month)
    const expensesResult = await query(
        `SELECT COALESCE(SUM(total), 0) as total FROM purchase_invoices 
     WHERE status = 'paid' AND date >= $1 AND date <= $2`,
        [startOfMonth, endOfMonth]
    );

    // Pending invoices
    const pendingInvoicesResult = await query(
        `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM invoices 
     WHERE status IN ('draft', 'sent')`
    );

    // Overdue invoices
    const overdueInvoicesResult = await query(
        `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM invoices 
     WHERE status = 'overdue' OR (status = 'sent' AND due_date < CURRENT_DATE)`
    );

    // Product counts
    const productStatsResult = await query(
        `SELECT 
       COUNT(*) FILTER (WHERE is_deleted = false) as total,
       COUNT(*) FILTER (WHERE status = 'low_stock' AND is_deleted = false) as low_stock,
       COUNT(*) FILTER (WHERE status = 'out_of_stock' AND is_deleted = false) as out_of_stock
     FROM products`
    );

    // Contact counts
    const contactStatsResult = await query(
        `SELECT 
       COUNT(*) FILTER (WHERE contact_type = 'client') as clients,
       COUNT(*) FILTER (WHERE contact_type = 'supplier') as suppliers
     FROM contacts WHERE status = 'active'`
    );

    res.json({
        revenue: {
            total: parseFloat(revenueResult.rows[0].total),
            period: 'month',
        },
        expenses: {
            total: parseFloat(expensesResult.rows[0].total),
            period: 'month',
        },
        profit: parseFloat(revenueResult.rows[0].total) - parseFloat(expensesResult.rows[0].total),
        pendingInvoices: {
            count: parseInt(pendingInvoicesResult.rows[0].count),
            total: parseFloat(pendingInvoicesResult.rows[0].total),
        },
        overdueInvoices: {
            count: parseInt(overdueInvoicesResult.rows[0].count),
            total: parseFloat(overdueInvoicesResult.rows[0].total),
        },
        products: {
            total: parseInt(productStatsResult.rows[0].total),
            lowStock: parseInt(productStatsResult.rows[0].low_stock),
            outOfStock: parseInt(productStatsResult.rows[0].out_of_stock),
        },
        contacts: {
            clients: parseInt(contactStatsResult.rows[0].clients),
            suppliers: parseInt(contactStatsResult.rows[0].suppliers),
        },
    });
}));

/**
 * GET /api/dashboard/revenue-chart
 * Get revenue data for chart
 */
router.get('/revenue-chart', asyncHandler(async (req, res) => {
    const { period = 'month' } = req.query;

    let sql;
    if (period === 'year') {
        sql = `
      SELECT DATE_TRUNC('month', date) as period, 
             COALESCE(SUM(total), 0) as revenue
      FROM invoices 
      WHERE status = 'paid' AND date >= DATE_TRUNC('year', CURRENT_DATE)
      GROUP BY DATE_TRUNC('month', date)
      ORDER BY period
    `;
    } else {
        sql = `
      SELECT date as period, COALESCE(SUM(total), 0) as revenue
      FROM invoices 
      WHERE status = 'paid' AND date >= DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY date
      ORDER BY date
    `;
    }

    const result = await query(sql);
    res.json(result.rows);
}));

/**
 * GET /api/dashboard/top-products
 * Get top selling products
 */
router.get('/top-products', asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;

    const result = await query(
        `SELECT p.id, p.name, p.sku, SUM(ii.quantity) as quantity_sold, SUM(ii.total) as revenue
     FROM invoice_items ii
     JOIN products p ON ii.product_id = p.id
     JOIN invoices i ON ii.invoice_id = i.id
     WHERE i.status = 'paid' AND i.date >= DATE_TRUNC('month', CURRENT_DATE)
     GROUP BY p.id, p.name, p.sku
     ORDER BY quantity_sold DESC
     LIMIT $1`,
        [parseInt(limit)]
    );

    res.json(result.rows);
}));

/**
 * GET /api/dashboard/recent-activity
 * Get recent activity
 */
router.get('/recent-activity', asyncHandler(async (req, res) => {
    const { limit = 20 } = req.query;

    const invoices = await query(
        `SELECT 'invoice' as type, document_id as reference, total as amount, date, status, created_at
     FROM invoices ORDER BY created_at DESC LIMIT $1`,
        [parseInt(limit)]
    );

    const purchases = await query(
        `SELECT 'purchase' as type, document_id as reference, total as amount, date, status, created_at
     FROM purchase_invoices ORDER BY created_at DESC LIMIT $1`,
        [parseInt(limit)]
    );

    const activity = [...invoices.rows, ...purchases.rows]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, parseInt(limit));

    res.json(activity);
}));

/**
 * GET /api/dashboard/stock-alerts
 * Get stock alerts
 */
router.get('/stock-alerts', asyncHandler(async (req, res) => {
    const result = await query(
        `SELECT id, name, sku, stock, min_stock, status
     FROM products
     WHERE is_deleted = false AND (status = 'low_stock' OR status = 'out_of_stock')
     ORDER BY stock ASC
     LIMIT 20`
    );

    res.json(result.rows.map(p => ({
        ...p,
        minStock: p.min_stock,
    })));
}));

module.exports = router;
