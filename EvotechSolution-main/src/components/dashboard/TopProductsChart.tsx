import { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { ToggleButtonGroup } from '@/components/ui/ToggleButtonGroup';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const productData = [
  { name: 'Phone Charger', quantity: 245, revenue: 122500, color: 'hsl(var(--primary))' },
  { name: 'USB Flash Drive', quantity: 189, revenue: 94500, color: 'hsl(199, 89%, 48%)' },
  { name: 'Notebook Set', quantity: 156, revenue: 78000, color: 'hsl(142, 76%, 36%)' },
  { name: 'Desk Organizer', quantity: 134, revenue: 67000, color: 'hsl(262, 83%, 58%)' },
  { name: 'Earphones', quantity: 121, revenue: 60500, color: 'hsl(346, 77%, 50%)' },
  { name: 'Backpack', quantity: 98, revenue: 49000, color: 'hsl(38, 92%, 50%)' },
  { name: 'LED Desk Lamp', quantity: 87, revenue: 43500, color: 'hsl(187, 85%, 43%)' },
  { name: 'Pen Drive', quantity: 76, revenue: 38000, color: 'hsl(160, 84%, 39%)' },
];

type ViewMode = 'quantity' | 'revenue';

export const TopProductsChart = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('quantity');

  const dataKey = viewMode === 'quantity' ? 'quantity' : 'revenue';
  const total = productData.reduce((sum, item) => sum + item[dataKey], 0);

  return (
    <div className="card-elevated p-6 animate-slide-up flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
        <div className="min-w-0 overflow-visible">
          <h3 className="text-lg font-heading font-semibold text-foreground">Top Sold Products</h3>
          <p className="text-xl sm:text-2xl font-bold text-foreground mt-1 break-words overflow-visible whitespace-normal leading-tight">{productData.length} Products</p>
          <p className="text-sm text-muted-foreground">By Sales Volume</p>
        </div>
        <ToggleButtonGroup
          options={[
            { value: 'quantity' as const, label: 'By Quantity' },
            { value: 'revenue' as const, label: 'By Revenue' },
          ]}
          value={viewMode}
          onChange={(val) => setViewMode(val as ViewMode)}
          size="sm"
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>
        <span className="text-xs sm:text-sm text-muted-foreground font-medium text-center px-2">
          Top by {viewMode === 'quantity' ? 'Quantity' : 'Revenue'}: Current Month
        </span>
        <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 flex-1 min-h-0">
        <div className="h-[220px] xl:h-auto xl:min-h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={productData.slice(0, 5)}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey={dataKey}
              >
                {productData.slice(0, 5).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(0, 0%, 100%)',
                  border: '1px solid hsl(214, 32%, 91%)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07)',
                }}
                formatter={(value: number) => [
                  viewMode === 'revenue' ? `${(value / 1000).toFixed(1)}K MAD` : value,
                  viewMode === 'revenue' ? 'Revenue' : 'Quantity'
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2 overflow-y-auto max-h-[240px] xl:max-h-none xl:h-auto pr-1">
          {productData.map((product, index) => (
            <div key={index} className="flex items-center gap-3 py-1.5 px-1 rounded hover:bg-muted/50 transition-colors">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: product.color }}
              />
              <span className="text-sm text-foreground flex-1 truncate">{product.name}</span>
              <span className="text-sm font-medium text-foreground whitespace-nowrap">
                {viewMode === 'revenue' ? `${(product.revenue / 1000).toFixed(1)}K` : product.quantity}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
