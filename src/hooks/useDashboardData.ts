/**
 * Custom hook for fetching dashboard data
 * Uses React Query for caching and automatic refetching
 */

import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboard.service';

export const useDashboardData = () => {
  // Fetch KPIs
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: () => dashboardService.getKPIs(),
    staleTime: 60000, // 1 minute
  });

  // Fetch sales chart data
  const { data: salesChartData, isLoading: salesChartLoading } = useQuery({
    queryKey: ['dashboard', 'sales-chart'],
    queryFn: () => dashboardService.getSalesChartData(),
    staleTime: 300000, // 5 minutes
  });

  // Fetch revenue chart data
  const { data: revenueChartData, isLoading: revenueChartLoading } = useQuery({
    queryKey: ['dashboard', 'revenue-chart'],
    queryFn: () => dashboardService.getRevenueChartData(),
    staleTime: 300000, // 5 minutes
  });

  // Fetch comparisons
  const { data: salesComparison, isLoading: salesComparisonLoading } = useQuery({
    queryKey: ['dashboard', 'sales-comparison'],
    queryFn: () => dashboardService.getSalesComparison(),
    staleTime: 60000,
  });

  const { data: earningsComparison, isLoading: earningsComparisonLoading } = useQuery({
    queryKey: ['dashboard', 'earnings-comparison'],
    queryFn: () => dashboardService.getEarningsComparison(),
    staleTime: 60000,
  });

  const { data: ordersComparison, isLoading: ordersComparisonLoading } = useQuery({
    queryKey: ['dashboard', 'orders-comparison'],
    queryFn: () => dashboardService.getOrdersComparison(),
    staleTime: 60000,
  });

  const { data: stockValue, isLoading: stockValueLoading } = useQuery({
    queryKey: ['dashboard', 'stock-value'],
    queryFn: () => dashboardService.getStockValue(),
    staleTime: 300000,
  });

  return {
    kpis: kpis || {
      total_sales: '0',
      total_earnings: '0',
      total_orders: '0',
      total_stock_value: '0',
    },
    salesChartData: salesChartData || [],
    revenueChartData: revenueChartData || [],
    salesComparison: salesComparison || { current: 0, previous: 0 },
    earningsComparison: earningsComparison || { current: 0, previous: 0 },
    ordersComparison: ordersComparison || { current: 0, previous: 0 },
    stockValue: stockValue || 0,
    isLoading:
      kpisLoading ||
      salesChartLoading ||
      revenueChartLoading ||
      salesComparisonLoading ||
      earningsComparisonLoading ||
      ordersComparisonLoading ||
      stockValueLoading,
  };
};
