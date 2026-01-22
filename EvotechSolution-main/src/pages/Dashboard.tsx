import { useMemo } from 'react';
import { Package, TrendingUp, DollarSign, ShoppingCart, AlertCircle, FileText } from 'lucide-react';
import { KPICard } from '@/components/dashboard/KPICard';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { StockByCategoryChart } from '@/components/dashboard/StockByCategoryChart';
import { TopProductsChart } from '@/components/dashboard/TopProductsChart';
import { StockAlertCard } from '@/components/dashboard/StockAlertCard';
import { InventoryStatsCard } from '@/components/dashboard/InventoryStatsCard';
import { useWarehouse } from '@/contexts/WarehouseContext';
import { formatMAD } from '@/lib/moroccan-utils';
import { useTranslation } from 'react-i18next';
import { useDashboardData } from '@/hooks/useDashboardData';

export const Dashboard = () => {
  const { t } = useTranslation();
  const { warehouseInfo, isAllWarehouses } = useWarehouse();

  // Fetch real data from database
  const {
    kpis,
    salesComparison,
    earningsComparison,
    ordersComparison,
    stockValue,
    salesChartData,
    revenueChartData,
    stockByCategory,
    topProducts,
    stockAlerts,
    isLoading,
  } = useDashboardData();

  // Calculate KPI data with real database values
  const kpiData = useMemo(() => {
    if (isLoading) {
      // Return loading state with zeros
      return {
        totalSales: {
          value: formatMAD(0),
          numericValue: 0,
          change: 0,
          label: t('dashboard.vsLastMonth')
        },
        totalEarnings: {
          value: formatMAD(0),
          numericValue: 0,
          change: 0,
          label: t('dashboard.vsLastMonth')
        },
        totalOrders: {
          value: '0',
          change: 0,
          label: t('dashboard.newOrdersThisMonth')
        },
        totalStockValue: {
          value: formatMAD(0),
          numericValue: 0,
          change: 0,
          label: t('dashboard.totalInventoryValue')
        }
      };
    }

    const totalSales = parseFloat(kpis.total_sales || '0');
    const totalEarnings = parseFloat(kpis.total_earnings || '0');
    const totalOrders = parseInt(kpis.total_orders || '0');
    const totalStockValueNum = typeof stockValue === 'number' ? stockValue : parseFloat(String(stockValue || '0'));

    // Calculate percentage changes with type safety and missing data handling
    const parseNumber = (val: any) => {
      if (typeof val === "number") return val;
      if (typeof val === "string") {
        const n = parseFloat(val);
        return isNaN(n) ? 0 : n;
      }
      return 0;
    };

    const salesPrev = parseNumber(salesComparison?.previous);
    const salesCurr = parseNumber(salesComparison?.current);
    const salesChange = salesPrev > 0
      ? ((salesCurr - salesPrev) / salesPrev * 100)
      : 0;

    const earningsPrev = parseNumber(earningsComparison?.previous);
    const earningsCurr = parseNumber(earningsComparison?.current);
    const earningsChange = earningsPrev > 0
      ? ((earningsCurr - earningsPrev) / earningsPrev * 100)
      : 0;

    const ordersPrev = parseNumber(ordersComparison?.previous);
    const ordersCurr = parseNumber(ordersComparison?.current);
    const ordersChange = ordersPrev > 0
      ? ((ordersCurr - ordersPrev) / ordersPrev * 100)
      : 0;

    return {
      totalSales: {
        value: formatMAD(totalSales),
        numericValue: totalSales,
        change: parseFloat(salesChange.toFixed(1)),
        label: t('dashboard.vsLastMonth')
      },
      totalEarnings: {
        value: formatMAD(totalEarnings),
        numericValue: totalEarnings,
        change: parseFloat(earningsChange.toFixed(1)),
        label: t('dashboard.vsLastMonth')
      },
      totalOrders: {
        value: totalOrders.toString(),
        change: parseFloat(ordersChange.toFixed(1)),
        label: t('dashboard.newOrdersThisMonth')
      },
      totalStockValue: {
        value: formatMAD(totalStockValueNum),
        numericValue: totalStockValueNum,
        change: 0,
        label: t('dashboard.totalInventoryValue')
      }
    };
  }, [kpis, salesComparison, earningsComparison, ordersComparison, stockValue, isLoading, t]);

  // Format chart data
  const formattedSalesData = useMemo(() => {
    if (!salesChartData || salesChartData.length === 0) return undefined;

    return salesChartData.map(item => ({
      label: item.month, // Assumes item.month is like "Jan", "Feb" etc. from view
      value: parseFloat(item.revenue),
      originalDate: item.month
    }));
  }, [salesChartData]);

  const formattedRevenueData = useMemo(() => {
    if (!revenueChartData || revenueChartData.length === 0) return undefined;

    return revenueChartData.map(item => ({
      month: item.month,
      revenue: parseFloat(item.revenue),
      expenses: parseFloat(item.expenses)
    }));
  }, [revenueChartData]);

  return (
    <div className="space-y-6 pb-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-foreground">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('dashboard.welcomeBack')} {isAllWarehouses ? t('dashboard.acrossAllWarehouses') : `${t('dashboard.atWarehouse')} ${warehouseInfo?.name}`}
        </p>
      </div>

      {/* KPI Cards - Optimized grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title={t('dashboard.totalSales')}
          value={kpiData.totalSales.value}
          valueAsNumber={kpiData.totalSales.numericValue}
          change={kpiData.totalSales.change}
          changeLabel={kpiData.totalSales.label}
          icon={<TrendingUp className="w-5 h-5 text-primary" />}
          iconBg="bg-primary/10"
        />
        <KPICard
          title={t('dashboard.totalEarnings')}
          value={kpiData.totalEarnings.value}
          valueAsNumber={kpiData.totalEarnings.numericValue}
          change={kpiData.totalEarnings.change}
          changeLabel={kpiData.totalEarnings.label}
          icon={<DollarSign className="w-5 h-5 text-success" />}
          iconBg="bg-success/10"
        />
        <KPICard
          title={t('dashboard.totalOrders')}
          value={kpiData.totalOrders.value}
          change={kpiData.totalOrders.change}
          changeLabel={kpiData.totalOrders.label}
          icon={<ShoppingCart className="w-5 h-5 text-info" />}
          iconBg="bg-info/10"
        />
        <KPICard
          title={t('dashboard.stockValue')}
          value={kpiData.totalStockValue.value}
          valueAsNumber={kpiData.totalStockValue.numericValue}
          change={kpiData.totalStockValue.change}
          changeLabel={kpiData.totalStockValue.label}
          icon={<Package className="w-5 h-5 text-warning" />}
          iconBg="bg-warning/10"
        />
      </div>

      {/* Charts Row - Main Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart data={formattedSalesData} />
        <RevenueChart data={formattedRevenueData} />
      </div>

      {/* Charts Row - Secondary Analytics - 2 columns per row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StockByCategoryChart data={stockByCategory} />
        <TopProductsChart data={topProducts} />
        <StockAlertCard data={stockAlerts} />
        <InventoryStatsCard />
      </div>

      {/* Quick Actions - Optional enhancement */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-elevated p-4 hover:shadow-md transition-shadow cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Create Sale</p>
              <p className="text-xs text-muted-foreground">New order</p>
            </div>
          </div>
        </div>
        <div className="card-elevated p-4 hover:shadow-md transition-shadow cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10 group-hover:bg-success/20 transition-colors">
              <Package className="w-5 h-5 text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Add Product</p>
              <p className="text-xs text-muted-foreground">Inventory</p>
            </div>
          </div>
        </div>
        <div className="card-elevated p-4 hover:shadow-md transition-shadow cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info/10 group-hover:bg-info/20 transition-colors">
              <FileText className="w-5 h-5 text-info" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">New Invoice</p>
              <p className="text-xs text-muted-foreground">Billing</p>
            </div>
          </div>
        </div>
        <div className="card-elevated p-4 hover:shadow-md transition-shadow cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10 group-hover:bg-warning/20 transition-colors">
              <AlertCircle className="w-5 h-5 text-warning" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Low Stock</p>
              <p className="text-xs text-muted-foreground">4 items</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
