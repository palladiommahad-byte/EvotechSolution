import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatMAD } from '@/lib/moroccan-utils';
import { ToggleButtonGroup } from '@/components/ui/ToggleButtonGroup';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const weeklyData = [
  { label: 'Mon', value: 42000 },
  { label: 'Tue', value: 38000 },
  { label: 'Wed', value: 56000 },
  { label: 'Thu', value: 47000 },
  { label: 'Fri', value: 63000 },
  { label: 'Sat', value: 31000 },
  { label: 'Sun', value: 25000 },
];

const monthlyData = [
  { label: 'Jan', value: 245000 },
  { label: 'Feb', value: 312000 },
  { label: 'Mar', value: 287000 },
  { label: 'Apr', value: 356000 },
  { label: 'May', value: 423000 },
  { label: 'Jun', value: 398000 },
  { label: 'Jul', value: 445000 },
  { label: 'Aug', value: 412000 },
  { label: 'Sep', value: 478000 },
  { label: 'Oct', value: 523000 },
  { label: 'Nov', value: 567000 },
  { label: 'Dec', value: 612000 },
];

const yearlyData = [
  { label: '2020', value: 2800000 },
  { label: '2021', value: 3200000 },
  { label: '2022', value: 3900000 },
  { label: '2023', value: 4500000 },
  { label: '2024', value: 4856000 },
];

type Period = 'weekly' | 'monthly' | 'yearly';

export const SalesChart = () => {
  const [period, setPeriod] = useState<Period>('monthly');

  const data = period === 'weekly' ? weeklyData : period === 'monthly' ? monthlyData : yearlyData;
  const totalValue = data.reduce((sum, item) => sum + item.value, 0);
  const avgValue = totalValue / data.length;
  const changePercent = ((data[data.length - 1].value - data[0].value) / data[0].value * 100).toFixed(1);

  return (
    <div className="card-elevated p-6 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="min-w-0 flex-1 overflow-visible">
          <h3 className="text-lg font-heading font-semibold text-foreground">Total Sales</h3>
          <p className="text-xl sm:text-2xl font-bold text-foreground mt-1 break-words overflow-visible whitespace-normal leading-tight">{formatMAD(totalValue)}</p>
          <p className={`text-sm ${Number(changePercent) >= 0 ? 'text-success' : 'text-destructive'}`}>
            {Number(changePercent) >= 0 ? '+' : ''}{changePercent}% this period
          </p>
        </div>
        <div className="flex-shrink-0">
        <ToggleButtonGroup
          options={[
            { value: 'weekly' as const, label: 'Weekly' },
            { value: 'monthly' as const, label: 'Monthly' },
            { value: 'yearly' as const, label: 'Yearly' },
          ]}
          value={period}
          onChange={(val) => setPeriod(val as Period)}
          size="sm"
        />
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 gap-2">
        <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
          <ChevronLeft className="w-4 h-4 flex-shrink-0" />
          <span className="hidden sm:inline">Previous</span>
        </button>
        <span className="text-xs sm:text-sm text-muted-foreground font-medium text-center px-2 flex-1">
          {period === 'weekly' ? 'Current Week' : period === 'monthly' ? 'Year 2024' : 'All Time'}
        </span>
        <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
        </button>
      </div>

      <div className="h-[250px] min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="hsl(215, 16%, 47%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(215, 16%, 47%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(0, 0%, 100%)',
                border: '1px solid hsl(214, 32%, 91%)',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07)',
              }}
              formatter={(value: number) => [formatMAD(value), 'Sales']}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#salesGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
