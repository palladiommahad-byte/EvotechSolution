import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const data = [
  { category: 'Electronics', stock: 1240, color: 'hsl(222, 47%, 17%)' },
  { category: 'Machinery', stock: 856, color: 'hsl(222, 47%, 30%)' },
  { category: 'Raw Materials', stock: 2340, color: 'hsl(222, 47%, 40%)' },
  { category: 'Components', stock: 1890, color: 'hsl(222, 47%, 50%)' },
  { category: 'Tools', stock: 654, color: 'hsl(222, 47%, 60%)' },
  { category: 'Safety', stock: 432, color: 'hsl(222, 47%, 70%)' },
];

export const StockByCategoryChart = () => {
  return (
    <div className="card-elevated p-6 animate-slide-up">
      <div className="mb-6">
        <h3 className="text-lg font-heading font-semibold text-foreground">Stock by Category</h3>
        <p className="text-sm text-muted-foreground mt-1">Current inventory distribution</p>
      </div>
      <div className="h-[280px] min-h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" horizontal={false} />
            <XAxis
              type="number"
              stroke="hsl(215, 16%, 47%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="category"
              stroke="hsl(215, 16%, 47%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={90}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(0, 0%, 100%)',
                border: '1px solid hsl(214, 32%, 91%)',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07)',
              }}
              formatter={(value: number) => [value.toLocaleString(), 'Units']}
            />
            <Bar dataKey="stock" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
