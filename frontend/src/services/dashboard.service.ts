/**
 * Dashboard Service
 * Handles all API operations for dashboard statistics
 */

import { apiClient } from '@/lib/api-client';

export interface DashboardStats {
  revenue: { total: number; period: string };
  expenses: { total: number; period: string };
  profit: number;
  pendingInvoices: { count: number; total: number };
  overdueInvoices: { count: number; total: number };
  products: { total: number; lowStock: number; outOfStock: number };
  contacts: { clients: number; suppliers: number };
}

export interface RevenueChartData {
  period: string;
  revenue: number;
}

export interface TopProduct {
  id: string;
  name: string;
  sku: string;
  quantity_sold: number;
  revenue: number;
}

export interface RecentActivity {
  type: 'invoice' | 'purchase';
  reference: string;
  amount: number;
  date: string;
  status: string;
  created_at: string;
}

export interface StockAlert {
  id: string;
  name: string;
  sku: string;
  stock: number;
  min_stock: number;
  minStock?: number;
  status: string;
}

export const dashboardService = {
  /**
   * Get dashboard statistics
   */
  async getStats(): Promise<DashboardStats | null> {
    try {
      return await apiClient.get<DashboardStats>('/dashboard/stats');
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return null;
    }
  },

  /**
   * Get revenue chart data
   */
  async getRevenueChart(period: 'month' | 'year' = 'month'): Promise<RevenueChartData[]> {
    try {
      return await apiClient.get<RevenueChartData[]>(`/dashboard/revenue-chart?period=${period}`);
    } catch (error) {
      console.error('Error fetching revenue chart:', error);
      return [];
    }
  },

  /**
   * Get top selling products
   */
  async getTopProducts(limit = 10): Promise<TopProduct[]> {
    try {
      return await apiClient.get<TopProduct[]>(`/dashboard/top-products?limit=${limit}`);
    } catch (error) {
      console.error('Error fetching top products:', error);
      return [];
    }
  },

  /**
   * Get recent activity
   */
  async getRecentActivity(limit = 20): Promise<RecentActivity[]> {
    try {
      return await apiClient.get<RecentActivity[]>(`/dashboard/recent-activity?limit=${limit}`);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  },

  /**
   * Get stock alerts
   */
  async getStockAlerts(): Promise<StockAlert[]> {
    try {
      return await apiClient.get<StockAlert[]>('/dashboard/stock-alerts');
    } catch (error) {
      console.error('Error fetching stock alerts:', error);
      return [];
    }
  },
};
