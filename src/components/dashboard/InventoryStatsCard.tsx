import { Package, TrendingUp, AlertTriangle, Box } from 'lucide-react';
import { formatMAD } from '@/lib/moroccan-utils';

// Mock inventory data - in real app, this would come from API
const mockInventoryStats = {
  totalProducts: 11,
  totalCategories: 6,
  totalStockValue: 115960000,
  inStock: 7,
  lowStock: 2,
  outOfStock: 2,
  totalUnits: 7412,
};

export const InventoryStatsCard = () => {
  const stockStatusCount = mockInventoryStats.inStock + mockInventoryStats.lowStock + mockInventoryStats.outOfStock;
  const inStockPercentage = ((mockInventoryStats.inStock / stockStatusCount) * 100).toFixed(0);

  return (
    <div className="card-elevated p-6 animate-slide-up">
      <div className="mb-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-heading font-semibold text-foreground mb-1">Inventory Overview</h3>
            <p className="text-sm text-muted-foreground">Product and stock statistics</p>
          </div>
          <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0 ml-4">
            <Box className="w-5 h-5 text-primary" />
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-section rounded-lg border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-primary" />
            <p className="text-xs font-medium text-muted-foreground">Total Products</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{mockInventoryStats.totalProducts}</p>
        </div>
        <div className="p-4 bg-section rounded-lg border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-success" />
            <p className="text-xs font-medium text-muted-foreground">In Stock</p>
          </div>
          <p className="text-2xl font-bold text-success">{mockInventoryStats.inStock}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{inStockPercentage}% Available</p>
        </div>
      </div>

      {/* Stock Status Breakdown */}
      <div className="space-y-3 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success"></div>
            <span className="text-sm text-foreground">In Stock</span>
          </div>
          <span className="text-sm font-semibold text-foreground">{mockInventoryStats.inStock}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-warning"></div>
            <span className="text-sm text-foreground">Low Stock</span>
          </div>
          <span className="text-sm font-semibold text-warning">{mockInventoryStats.lowStock}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-destructive"></div>
            <span className="text-sm text-foreground">Out of Stock</span>
          </div>
          <span className="text-sm font-semibold text-destructive">{mockInventoryStats.outOfStock}</span>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Total Stock Value</span>
          <span className="text-lg font-bold text-foreground">{formatMAD(mockInventoryStats.totalStockValue)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Units</span>
          <span className="text-sm font-semibold text-foreground">{mockInventoryStats.totalUnits.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
