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

export const Dashboard = () => {
  const { t } = useTranslation();
  const { warehouseInfo, isAllWarehouses } = useWarehouse();

  // Optimized KPI calculations with useMemo
  const kpiData = useMemo(() => {
    // Mock data - in real app, this would come from API
    const totalSales = 7520000;
    const totalEarnings = 5240000; // Changed from negative to positive for better UX
    const totalOrders = 25;
    const totalStockValue = 115960000;
    const previousPeriodSales = 6600000;
    const previousPeriodEarnings = 4800000;
    const previousPeriodOrders = 17;

    const salesChange = ((totalSales - previousPeriodSales) / previousPeriodSales * 100).toFixed(1);
    const earningsChange = ((totalEarnings - previousPeriodEarnings) / previousPeriodEarnings * 100).toFixed(1);
    const ordersChange = ((totalOrders - previousPeriodOrders) / previousPeriodOrders * 100).toFixed(1);

    return {
      totalSales: {
        value: formatMAD(totalSales),
        numericValue: totalSales,
        change: parseFloat(salesChange),
        label: t('dashboard.vsLastMonth')
      },
      totalEarnings: {
        value: formatMAD(totalEarnings),
        numericValue: totalEarnings,
        change: parseFloat(earningsChange),
        label: t('dashboard.vsLastMonth')
      },
      totalOrders: {
        value: totalOrders.toString(),
        change: parseFloat(ordersChange),
        label: t('dashboard.newOrdersThisMonth')
      },
      totalStockValue: {
        value: formatMAD(totalStockValue),
        numericValue: totalStockValue,
        change: 0,
        label: t('dashboard.totalInventoryValue')
      }
    };
  }, []);

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
        <SalesChart />
        <RevenueChart />
      </div>

      {/* Charts Row - Secondary Analytics - 2 columns per row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StockByCategoryChart />
        <TopProductsChart />
        <StockAlertCard />
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
