/**
 * Dashboard Service
 * Handles all database operations for dashboard analytics using Supabase
 */

import { getSupabaseClient } from '@/lib/supabase';

export interface DashboardKPIs {
  total_sales: string;
  total_earnings: string;
  total_orders: string;
  total_stock_value: string;
}

export interface SalesChartData {
  month: string;
  order_count: string;
  revenue: string;
}

export interface RevenueChartData {
  month: string;
  revenue: string;
  expenses: string;
}

export const dashboardService = {
  /**
   * Get dashboard KPIs
   * Uses the dashboard_kpis view
   */
  async getKPIs(): Promise<DashboardKPIs> {
    try {
      const supabase = getSupabaseClient();
      
      // Try to get from view (if it exists)
      const { data, error } = await supabase
        .from('dashboard_kpis')
        .select('*')
        .limit(1)
        .single();
      
      if (error) {
        // View might not exist, return defaults
        console.warn('Dashboard KPIs view not found, returning defaults:', error.message);
        return {
          total_sales: '0',
          total_earnings: '0',
          total_orders: '0',
          total_stock_value: '0',
        };
      }
      
      return data as DashboardKPIs;
    } catch (error) {
      console.error('Error fetching dashboard KPIs:', error);
      return {
        total_sales: '0',
        total_earnings: '0',
        total_orders: '0',
        total_stock_value: '0',
      };
    }
  },

  /**
   * Get sales chart data (last 12 months)
   * Uses the sales_chart_data view
   */
  async getSalesChartData(): Promise<SalesChartData[]> {
    try {
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('sales_chart_data')
        .select('*')
        .order('month', { ascending: true });
      
      if (error) {
        console.warn('Sales chart data view not found:', error.message);
        return [];
      }
      
      return (data || []) as SalesChartData[];
    } catch (error) {
      console.error('Error fetching sales chart data:', error);
      return [];
    }
  },

  /**
   * Get revenue chart data (revenue vs expenses)
   * This requires a custom query - consider creating an RPC function
   */
  async getRevenueChartData(): Promise<RevenueChartData[]> {
    try {
      const supabase = getSupabaseClient();
      
      // For complex queries like this, you should create an RPC function in Supabase
      // For now, we'll use a simplified approach with separate queries
      
      // Get invoices (revenue)
      const { data: invoices } = await supabase
        .from('invoices')
        .select('date, total, status');
      
      // Get purchase invoices (expenses)
      const { data: purchases } = await supabase
        .from('purchase_invoices')
        .select('date, total, status');
      
      // Group by month (simplified - in production, use RPC function for proper aggregation)
      const monthlyData: Record<string, { revenue: number; expenses: number }> = {};
      
      invoices?.forEach((inv) => {
        if (inv.status === 'paid' && inv.date) {
          const month = new Date(inv.date).toISOString().slice(0, 7);
          monthlyData[month] = monthlyData[month] || { revenue: 0, expenses: 0 };
          monthlyData[month].revenue += parseFloat(inv.total?.toString() || '0');
        }
      });
      
      purchases?.forEach((purchase) => {
        if (purchase.status === 'paid' && purchase.date) {
          const month = new Date(purchase.date).toISOString().slice(0, 7);
          monthlyData[month] = monthlyData[month] || { revenue: 0, expenses: 0 };
          monthlyData[month].expenses += parseFloat(purchase.total?.toString() || '0');
        }
      });
      
      // Convert to array format
      return Object.entries(monthlyData)
        .map(([month, values]) => ({
          month,
          revenue: values.revenue.toString(),
          expenses: values.expenses.toString(),
        }))
        .sort((a, b) => a.month.localeCompare(b.month)) as RevenueChartData[];
    } catch (error) {
      console.error('Error fetching revenue chart data:', error);
      return [];
    }
  },

  /**
   * Get sales comparison (current month vs last month)
   */
  async getSalesComparison(): Promise<{ current: string; previous: string; change: number }> {
    try {
      const supabase = getSupabaseClient();
      
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      
      // Current month sales
      const { data: currentSales } = await supabase
        .from('invoices')
        .select('total')
        .eq('status', 'paid')
        .gte('date', currentMonth.toISOString().split('T')[0])
        .lt('date', new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0]);
      
      // Previous month sales
      const { data: previousSales } = await supabase
        .from('invoices')
        .select('total')
        .eq('status', 'paid')
        .gte('date', previousMonth.toISOString().split('T')[0])
        .lt('date', previousMonthEnd.toISOString().split('T')[0]);
      
      const currentTotal = currentSales?.reduce((sum, inv) => sum + parseFloat(inv.total?.toString() || '0'), 0) || 0;
      const previousTotal = previousSales?.reduce((sum, inv) => sum + parseFloat(inv.total?.toString() || '0'), 0) || 0;
      
      const change = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;
      
      return {
        current: currentTotal,
        previous: previousTotal,
        change: Math.round(change),
      };
    } catch (error) {
      console.error('Error fetching sales comparison:', error);
      return { current: '0', previous: '0', change: 0 };
    }
  },

  /**
   * Get earnings comparison
   */
  async getEarningsComparison(): Promise<{ current: number; previous: number; change: number }> {
    // Similar to sales comparison
    return this.getSalesComparison();
  },

  /**
   * Get orders comparison
   */
  async getOrdersComparison(): Promise<{ current: number; previous: number; change: number }> {
    try {
      const supabase = getSupabaseClient();
      
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      
      // Current month orders
      const { data: currentOrders } = await supabase
        .from('invoices')
        .select('id', { count: 'exact' })
        .gte('date', currentMonth.toISOString().split('T')[0])
        .lt('date', new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0]);
      
      // Previous month orders
      const { data: previousOrders } = await supabase
        .from('invoices')
        .select('id', { count: 'exact' })
        .gte('date', previousMonth.toISOString().split('T')[0])
        .lt('date', previousMonthEnd.toISOString().split('T')[0]);
      
      const current = currentOrders?.length || 0;
      const previous = previousOrders?.length || 0;
      const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
      
      return {
        current,
        previous,
        change: Math.round(change),
      };
    } catch (error) {
      console.error('Error fetching orders comparison:', error);
      return { current: '0', previous: '0', change: 0 };
    }
  },

  /**
   * Get total stock value
   */
  async getStockValue(): Promise<string> {
    try {
      const supabase = getSupabaseClient();
      
      const { data: products } = await supabase
        .from('products')
        .select('price, stock');
      
      const totalValue = products?.reduce(
        (sum, product) => sum + (parseFloat(product.price?.toString() || '0') * (product.stock || 0)),
        0
      ) || 0;
      
      return totalValue.toFixed(2);
    } catch (error) {
      console.error('Error fetching stock value:', error);
      return '0';
    }
  },
};
